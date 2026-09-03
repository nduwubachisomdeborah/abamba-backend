import mongoose from "mongoose";
import Order from "../models/order.model.js";
import OrderHolder from "../models/orderHolder.model.js";
import Payment from "../models/payment.model.js";
import Product from "../models/product.model.js";
import Cart from "../models/cart.model.js";
import paystackService from "./payments/paystack.service.js";
import funzService from "./payments/funz.service.js";
import { AppError } from "../middlewares/error.js";
import User from "../models/user.model.js";
import notificationService from "./notification.service.js";
import LogisticsCompany from "../models/logisticsCompany.model.js";
import emailService from "./email.service.js";
import PlatformSettings from "../models/platformSettings.model.js";

class PaymentService {
    /**
     * Remove any previous pending order attempts for this user.
     * Deletes:
     *  - OrderHolders with status 'pending'
     *  - Child Orders with status 'pending'
     *  - Payment documents with status 'pending'
     */
    async cleanupPendingForUser(userId) {
        const holders = await OrderHolder.find({
            user: userId,
            status: "pending",
        });
        if (!holders.length) return;

        const holderIds = holders.map((h) => h._id);
        const orderIds = holders.flatMap((h) => h.orders || []);
        const paymentIds = holders.map((h) => h.payment).filter((pid) => !!pid);

        // Delete only pending orders to be safe
        if (orderIds.length) {
            await Order.deleteMany({
                _id: { $in: orderIds },
                status: "pending",
            });
        }

        // Delete only pending payments
        if (paymentIds.length) {
            await Payment.deleteMany({
                _id: { $in: paymentIds },
                status: "pending",
            });
        }

        // Finally delete the holders themselves (still pending)
        await OrderHolder.deleteMany({
            _id: { $in: holderIds },
            status: "pending",
        });
    }

    async createHolderFromCart(userId, orderData) {
        const {
            shippingAddress,
            paymentMethod,
            provider = "paystack",
            notes,
            callbackUrl,
        } = orderData;

        const user = await User.findById(userId);
        if (!user) throw new AppError("User not found", 404);

        // Clean up any previous pending attempts before creating a new one
        await this.cleanupPendingForUser(userId);

        let finalShippingAddress;
        let addressId;

        if (
            shippingAddress &&
            mongoose.Types.ObjectId.isValid(shippingAddress)
        ) {
            const savedAddress = user.addresses.id(shippingAddress);

            if (!savedAddress) throw new AppError("Address not found", 404);

            finalShippingAddress = {
                fullName: savedAddress.fullName,
                addressLine1: savedAddress.addressLine1,
                addressLine2: savedAddress.addressLine2,
                city: savedAddress.city,
                state: savedAddress.state,
                zipCode: savedAddress.zipCode,
                country: savedAddress.country,
                phoneNumber: savedAddress.phoneNumber,
                coordinates: [
                    savedAddress.coordinates.longitude,
                    savedAddress.coordinates.latitude,
                ],
            };
            addressId = shippingAddress;
        } else if (!shippingAddress) {
            const defaultAddress = user.addresses.find((a) => a.isDefault);
            if (!defaultAddress) {
                throw new AppError(
                    "No shipping address provided and no default address found",
                    400,
                );
            }
            finalShippingAddress = {
                fullName: defaultAddress.fullName,
                addressLine1: defaultAddress.addressLine1,
                addressLine2: defaultAddress.addressLine2,
                city: defaultAddress.city,
                state: defaultAddress.state,
                zipCode: defaultAddress.zipCode,
                country: defaultAddress.country,
                phoneNumber: defaultAddress.phoneNumber,
                coordinates: defaultAddress.coordinates,
            };
            addressId = defaultAddress._id;
        }

        // Load cart
        const cart = await Cart.findOne({ user: userId });

        if (!cart || cart.items.length === 0) {
            throw new AppError("Cart is empty", 400);
        }

        // Fetch platform settings for global bonus promotions
        const platformSettings = await PlatformSettings.getInstance();
        const isBonusActive = Boolean(platformSettings?.isBonusEventActive);

        // Build order items with validation against products/variants
        const enrichedItems = await Promise.all(
            cart.items.map(async (citem) => {
                const product = await Product.findById(citem.product);
                if (!product || product.deleted) {
                    throw new AppError(
                        `Product is no longer available: ${product.name}`,
                        400,
                    );
                }
                let variant = null;
                let regularPrice = product.basePrice;
                let promoPrice = product.promoPrice;
                let itemBonusPrice = product.bonusPrice;
                let shippingCost = citem.shipping?.amount || 0;
                let sku = product.sku;
                let imageUrl = product.images?.[0]?.url || null;
                let variantAttributes = {};

                if (citem.variant) {
                    variant = product.variants.id(citem.variant);
                    if (!variant)
                        throw new AppError(
                            `Product variant is no longer available: ${product.name}`,
                            400,
                        );
                    if (variant.quantity < citem.quantity) {
                        throw new AppError(
                            `Only ${variant.quantity} units of ${product.name} variant available`,
                            400,
                        );
                    }
                    regularPrice = variant.price;
                    promoPrice = variant.promoPrice;
                    itemBonusPrice =
                        variant.bonusPrice !== undefined &&
                        variant.bonusPrice !== null
                            ? variant.bonusPrice
                            : product.bonusPrice;
                    sku = variant.sku;
                    if (variant.images && variant.images.length > 0)
                        imageUrl = variant.images[0].url;
                    if (variant.attributes) {
                        variantAttributes =
                            variant.attributes instanceof Map
                                ? Object.fromEntries(variant.attributes)
                                : variant.attributes;
                    }
                } else {
                    if (product.quantity < citem.quantity) {
                        throw new AppError(
                            `Only ${product.quantity} units of ${product.name} available`,
                            400,
                        );
                    }
                }

                // Server-side price calculation with priority: Bonus Price > Promo Price > Regular Price
                let price = regularPrice;
                if (
                    isBonusActive &&
                    itemBonusPrice !== undefined &&
                    itemBonusPrice !== null &&
                    itemBonusPrice > 0 &&
                    itemBonusPrice < regularPrice
                ) {
                    price = itemBonusPrice;
                } else if (
                    product.onSale &&
                    product.promoActive &&
                    promoPrice &&
                    promoPrice > 0 &&
                    promoPrice < regularPrice
                ) {
                    price = promoPrice;
                }

                return {
                    seller: product.user?.toString(),
                    product: citem.product,
                    variant: citem.variant,
                    name: product.name,
                    sku,
                    price,
                    quantity: citem.quantity,
                    variantAttributes,
                    imageUrl,
                    shippingCost,
                };
            }),
        );

        // Group by seller to create per-seller orders
        const groups = new Map();
        for (const it of enrichedItems) {
            const key = it.seller || "unknown";
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(it);
        }

        // Compute holder totals
        const holderSubtotal = enrichedItems.reduce(
            (t, it) => t + it.price * it.quantity,
            0,
        );

        const shippingCost = enrichedItems.reduce(
            (t, it) => t + it.shippingCost,
            0,
        );
        const holderTotal = holderSubtotal + shippingCost;

        // Check for assigned logistics company
        let assignedCompany = null;
        const requestedCarrier =
            orderData.carrierId ||
            orderData.carrier ||
            orderData.logisticsCompanyId ||
            orderData.companyId ||
            orderData.logisticsCompany;

        if (requestedCarrier) {
            if (mongoose.Types.ObjectId.isValid(requestedCarrier)) {
                assignedCompany = await LogisticsCompany.findById(requestedCarrier);
            }
            if (!assignedCompany && typeof requestedCarrier === "string") {
                assignedCompany = await LogisticsCompany.findOne({
                    $or: [
                        { code: requestedCarrier.toLowerCase() },
                        { name: new RegExp(requestedCarrier, "i") },
                    ],
                });
            }
        }
        if (!assignedCompany && finalShippingAddress?.state) {
            const state = finalShippingAddress.state
                .toLowerCase()
                .includes("abia")
                ? "Abia"
                : "Imo";
            assignedCompany = await LogisticsCompany.findOne({
                state,
                active: true,
            });
        }

        // Create orders first
        const platformFeePercentage =
            parseFloat(process.env.PLATFORM_FEE_PERCENTAGE) || 0.5;
        const savedOrders = [];
        for (const [sellerId, items] of groups.entries()) {
            const subtotal = items.reduce(
                (t, it) => t + it.price * it.quantity,
                0,
            );
            // allocate costs proportionally
            const share = holderSubtotal > 0 ? subtotal / holderSubtotal : 0;
            const orderShipping = Number((shippingCost * share).toFixed(2));
            // Calculate platform fee from seller order subtotal
            const platformFee = Number(
                (subtotal * (platformFeePercentage / 100)).toFixed(2),
            );
            const total = subtotal + orderShipping + platformFee;

            const order = new Order({
                user: userId,
                seller: sellerId,
                items: items.map(({ seller, ...rest }) => rest),
                shippingAddress: finalShippingAddress,
                addressId: addressId || null,
                logisticsDispatch: assignedCompany
                    ? {
                          company: assignedCompany._id,
                          companyName: assignedCompany.name,
                          companyEmail: assignedCompany.email,
                          deliveryFee:
                              orderShipping ||
                              assignedCompany.defaultBasePrice ||
                              3000,
                          status: "notified",
                      }
                    : undefined,
                payment: {
                    method: paymentMethod,
                    amount: total,
                    status: "pending",
                    details: {},
                },
                subtotal,
                shippingCost: orderShipping,
                platformFee,
                total,
                notes,
                status: "pending",
            });
            const saved = await order.save();
            savedOrders.push(saved);
        }

        // Create holder and payment
        const holder = new OrderHolder({
            user: userId,
            orders: savedOrders.map((o) => o._id),
            payment: null,
            addressId: addressId || null,
            shippingAddress: finalShippingAddress,
            method: paymentMethod,
            provider,
            subtotal: holderSubtotal,
            shippingCost,
            total: holderTotal,
            notes,
            status: "pending",
        });
        const savedHolder = await holder.save();

        // Attach holder id to orders
        await Order.updateMany(
            { _id: { $in: savedOrders.map((o) => o._id) } },
            { $set: { orderHolder: savedHolder._id } },
        );

        // Create Payment document
        const payment = await Payment.create({
            provider,
            method: paymentMethod,
            amount: holderTotal,
            status: "pending",
            currency: process.env.CURRENCY || "NGN",
            customerEmail: user.email,
            metadata: {
                orderHolderId: savedHolder._id.toString(),
                userId: userId.toString(),
            },
        });

        savedHolder.payment = payment._id;
        await savedHolder.save();

        // Initialize provider transaction
        let init = null;
        if (provider === "paystack") {
            const newAmount = paystackService.addFee(holderTotal);
            const reference = paystackService.getReference();
            payment.reference = reference;
            await payment.save();
            init = await paystackService.initializeTransaction({
                email: user.email,
                amount: newAmount.customerPays,
                reference,
                callback_url: callbackUrl || undefined,
                metadata: {
                    orderHolderId: savedHolder._id.toString(),
                    paymentId: payment._id.toString(),
                },
            });
        } else if (provider === "funz") {
            const reference = funzService.getReference();
            payment.reference = reference;
            await payment.save();
            const funzResult = await funzService.initializeTransaction({
                email: user.email,
                amount: holderTotal,
                reference,
                customerName: user.firstName
                    ? `${user.firstName} ${user.lastName || ""}`.trim()
                    : user.name || user.email,
                phoneNumber: user.phoneNumber || user.phone || 0,
                description: `Order #${savedHolder.orderId || savedHolder._id}`,
                callbackUrl: callbackUrl || undefined,
                metadata: [savedHolder._id.toString(), payment._id.toString()],
            });
            init = {
                status: "success",
                message: funzResult.message || "Authorization URL created",
                data: {
                    authorization_url: funzResult.payment_url,
                    access_code: null,
                    reference,
                },
            };
        }

        // Do not clear cart or update inventory yet – wait for payment confirmation
        return {
            orderHolder: savedHolder,
            orders: savedOrders,
            payment,
            providerInit: init,
        };
    }

    async verifyAndFinalizeByReference(reference) {
        const payment = await Payment.findOne({ reference });
        if (!payment) throw new AppError("Payment not found", 404);

        // Verify via the correct provider
        let verifiedData;
        if (payment.provider === "funz") {
            const result = await funzService.verifyTransaction(reference);
            const txn = result?.data;
            if (!txn || txn.status.toLowerCase() !== "completed") {
                throw new AppError("Payment verification failed", 400);
            }
            verifiedData = txn;
        } else {
            // Default: paystack
            const verification =
                await paystackService.verifyTransaction(reference);
            const data = verification?.data;
            if (!data || data.status !== "success") {
                throw new AppError("Payment verification failed", 400);
            }
            verifiedData = data;
        }

        // Idempotency guard: Paystack webhooks can be delivered more than once.
        // If we've already completed this payment, avoid re-crediting seller wallets.
        if (payment.status === "completed") {
            const holder = await OrderHolder.findOne({ payment: payment._id });
            if (!holder) throw new AppError("Order holder not found", 404);
            const orders = await Order.find({ _id: { $in: holder.orders } });
            return { payment, orderHolder: holder, orders };
        }

        payment.status = "completed";
        payment.transactionId =
            verifiedData?.id?.toString?.() ||
            verifiedData?.reference ||
            reference;
        payment.details = verifiedData;
        await payment.save();

        const holder = await OrderHolder.findOne({ payment: payment._id });
        if (!holder) throw new AppError("Order holder not found", 404);

        holder.status = "paid";
        await holder.save();

        // Update all child orders to processing and set payment status
        const orders = await Order.find({ _id: { $in: holder.orders } });
        for (const order of orders) {
            order.status =
                order.status === "pending" ? "processing" : order.status;
            order.payment.status = "completed";
            await order.save();
        }

        // Trigger logistics dispatch notifications and update company monthly ledger
        for (const order of orders) {
            try {
                let company = null;
                if (order.logisticsDispatch?.company) {
                    company = await LogisticsCompany.findById(
                        order.logisticsDispatch.company
                    );
                } else if (order.shippingAddress?.state) {
                    const state = order.shippingAddress.state
                        .toLowerCase()
                        .includes("abia")
                        ? "Abia"
                        : "Imo";
                    company = await LogisticsCompany.findOne({
                        state,
                        active: true,
                    });
                }

                if (company) {
                    const fee = Number(
                        order.logisticsDispatch?.deliveryFee ||
                            order.shippingCost ||
                            company.defaultBasePrice ||
                            3000
                    );

                    // Update company ledger
                    await LogisticsCompany.findByIdAndUpdate(company._id, {
                        $inc: {
                            completedDeliveries: 1,
                            totalEarned: fee,
                            pendingPayout: fee,
                        },
                    });

                    // Send dispatch email to company
                    await emailService.sendLogisticsDispatchEmail(order, company);

                    // Update order logisticsDispatch timestamp
                    order.logisticsDispatch = {
                        company: company._id,
                        companyName: company.name,
                        companyEmail: company.email,
                        deliveryFee: fee,
                        notifiedAt: new Date(),
                        status: "notified",
                    };
                    await order.save();
                }
            } catch (dispatchErr) {
                console.error(
                    "Error processing logistics dispatch on order payment:",
                    dispatchErr
                );
            }
        }

        // Credit seller wallets (subtotal only) and notify them
        for (const order of orders) {
            const sellerId = order.seller;
            const creditAmount = Number(order.subtotal || 0);
            if (!sellerId || creditAmount <= 0) continue;

            await User.findByIdAndUpdate(sellerId, {
                $inc: { "wallet.pendingBalance": creditAmount },
            });

            console.log({ order });

            await notificationService.send(
                sellerId,
                "Order payment received",
                `Your wallet has been credited with **₦${creditAmount}** (Pending) for order **#${
                    order.orderId || order._id
                }**. Funds will be available for withdrawal after delivery.`,
            );
        }

        // Update inventory after successful payment
        await Promise.all(
            orders.map(async (order) => {
                await Promise.all(
                    order.items.map(async (item) => {
                        const product = await Product.findById(item.product);
                        if (!product) return;
                        if (item.variant) {
                            const variant = product.variants.id(item.variant);
                            if (variant) {
                                variant.quantity -= item.quantity;
                                if (variant.quantity <= 0)
                                    variant.inStock = false;
                            }
                        } else {
                            product.quantity -= item.quantity;
                        }
                        await product.save({ validateBeforeSave: false });
                    }),
                );
            }),
        );

        // Clear cart
        await Cart.findOneAndUpdate(
            { user: holder.user },
            {
                $set: {
                    items: [],
                    totalItems: 0,
                    totalPrice: 0,
                    lastUpdated: Date.now(),
                },
            },
        );

        // Notify customer of successful payment
        await notificationService.send(
            holder.user,
            "Payment successful!",
            `Your payment of **₦${payment.amount.toLocaleString()}** was successful. Your order is now being processed.`,
        );

        return { payment, orderHolder: holder, orders };
    }

    async getPaymentStatus(reference) {
        const payment = await Payment.findOne({ reference });
        if (!payment) throw new AppError("Payment not found", 404);

        const orderHolder = await OrderHolder.findOne({
            payment: payment._id,
        });

        return {
            order: orderHolder,
            payment,
        };
    }

    getPaymentProviders() {
        return [
            {
                id: "paystack",
                name: "Paystack",
                image: "https://cdn.brandfetch.io/idM5mrwtDs/theme/dark/symbol.svg",
                isDefault: true,
                disabled: false,
            },
            {
                id: "funz",
                name: "Funz Gateway",
                image: "https://gateway-staging.funzweb.com/images/logo-light.svg",
                isDefault: false,
                disabled: false,
            },
        ];
    }
}

export default new PaymentService();
