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

        let normalizedMethod = (paymentMethod || orderData.method || "credit_card")
            .toLowerCase()
            .trim();
        if (normalizedMethod === "card" || normalizedMethod === "paystack") {
            normalizedMethod = "credit_card";
        }
        if (
            ![
                "credit_card",
                "bank_transfer",
                "cash_on_delivery",
                "other",
            ].includes(normalizedMethod)
        ) {
            normalizedMethod = "credit_card";
        }

        const user = await User.findById(userId);
        if (!user) throw new AppError("User not found", 404);

        // Clean up any previous pending attempts before creating a new one
        await this.cleanupPendingForUser(userId);

        let finalShippingAddress;
        let addressId;

        if (
            typeof shippingAddress === "object" &&
            shippingAddress !== null &&
            !mongoose.Types.ObjectId.isValid(shippingAddress)
        ) {
            finalShippingAddress = shippingAddress;
            addressId =
                shippingAddress._id ||
                shippingAddress.id ||
                orderData.addressId ||
                null;
        } else if (
            shippingAddress &&
            mongoose.Types.ObjectId.isValid(shippingAddress)
        ) {
            const savedAddress =
                user.addresses?.id?.(shippingAddress) ||
                user.addresses?.find(
                    (a) => a._id?.toString() === shippingAddress.toString(),
                ) ||
                user.addresses?.find((a) => a.isDefault) ||
                user.addresses?.[0];

            if (!savedAddress) {
                throw new AppError(
                    "Shipping address not found. Please add a shipping address.",
                    404,
                );
            }

            finalShippingAddress = {
                fullName: savedAddress.fullName || user.name || "Customer",
                addressLine1: savedAddress.addressLine1 || "Delivery Address",
                addressLine2: savedAddress.addressLine2 || "",
                city: savedAddress.city || "City",
                state: savedAddress.state || "State",
                zipCode: savedAddress.zipCode || "460281",
                country: savedAddress.country || "NG",
                phoneNumber: savedAddress.phoneNumber || user.phoneNumber || user.phone || "08000000000",
                coordinates: savedAddress.coordinates,
            };
            addressId = savedAddress._id || shippingAddress;
        } else if (
            orderData.addressId &&
            mongoose.Types.ObjectId.isValid(orderData.addressId)
        ) {
            const savedAddress =
                user.addresses?.id?.(orderData.addressId) ||
                user.addresses?.find(
                    (a) => a._id?.toString() === orderData.addressId.toString(),
                ) ||
                user.addresses?.find((a) => a.isDefault) ||
                user.addresses?.[0];

            if (!savedAddress) {
                throw new AppError(
                    "Shipping address not found. Please add a shipping address.",
                    404,
                );
            }

            finalShippingAddress = {
                fullName: savedAddress.fullName || user.name || "Customer",
                addressLine1: savedAddress.addressLine1 || "Delivery Address",
                addressLine2: savedAddress.addressLine2 || "",
                city: savedAddress.city || "City",
                state: savedAddress.state || "State",
                zipCode: savedAddress.zipCode || "460281",
                country: savedAddress.country || "NG",
                phoneNumber: savedAddress.phoneNumber || user.phoneNumber || user.phone || "08000000000",
                coordinates: savedAddress.coordinates,
            };
            addressId = savedAddress._id || orderData.addressId;
        } else {
            const defaultAddress =
                user.addresses?.find((a) => a.isDefault) || user.addresses?.[0];
            if (!defaultAddress) {
                throw new AppError(
                    "Shipping address is required to place an order.",
                    400,
                );
            }
            finalShippingAddress = {
                fullName: defaultAddress.fullName || user.name || "Customer",
                addressLine1: defaultAddress.addressLine1 || "Delivery Address",
                addressLine2: defaultAddress.addressLine2 || "",
                city: defaultAddress.city || "City",
                state: defaultAddress.state || "State",
                zipCode: defaultAddress.zipCode || "460281",
                country: defaultAddress.country || "NG",
                phoneNumber: defaultAddress.phoneNumber || user.phoneNumber || user.phone || "08000000000",
                coordinates: defaultAddress.coordinates,
            };
            addressId = defaultAddress._id;
        }

        // Load cart
        const cart = await Cart.findOne({ user: userId });

        if (!cart || !cart.items || cart.items.length === 0) {
            throw new AppError(
                "Cart is empty. Please add items to your cart before checking out.",
                400,
            );
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

        // Check destination route
        const destState = (finalShippingAddress?.state || "").toLowerCase().trim();
        const destCity = (finalShippingAddress?.city || "").toLowerCase().trim();
        const isAbiaRoute = destState.includes("abia") || destCity.includes("aba");

        // Check for assigned logistics company
        let assignedCompany = null;
        const requestedCarrier =
            orderData.courierId ||
            orderData.courierName ||
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
                        { code: requestedCarrier.toLowerCase().trim() },
                        { name: new RegExp(requestedCarrier.trim(), "i") },
                        { email: requestedCarrier.toLowerCase().trim() },
                    ],
                });
            }
        }

        // Route verification & auto-correction:
        if (isAbiaRoute) {
            // Abia route: courier must be PrinceswiftLogistics or OkSaturdaylogistics
            const isAbiaCourier =
                assignedCompany &&
                (assignedCompany.code === "princeswift" ||
                    assignedCompany.code === "oksaturday" ||
                    assignedCompany.name?.toLowerCase().includes("prince") ||
                    assignedCompany.name?.toLowerCase().includes("saturday"));

            if (!isAbiaCourier) {
                // If Imo courier was submitted, auto-correct to PrinceswiftLogistics
                assignedCompany = await LogisticsCompany.findOne({
                    $or: [
                        { code: "princeswift" },
                        { name: "PrinceswiftLogistics" },
                        { email: "chisomprince722@gmail.com" },
                    ],
                });
                if (!assignedCompany) {
                    assignedCompany = {
                        _id: new mongoose.Types.ObjectId(),
                        code: "princeswift",
                        name: "PrinceswiftLogistics",
                        email: "chisomprince722@gmail.com",
                        state: "Abia",
                        defaultBasePrice: 3000,
                    };
                }
            }
        } else {
            // Imo route: courier must be RichmondLogistics, Apexgologisticservices, or HensLogistics
            const isImoCourier =
                assignedCompany &&
                (assignedCompany.code === "richmond" ||
                    assignedCompany.code === "apex" ||
                    assignedCompany.code === "hens" ||
                    assignedCompany.name?.toLowerCase().includes("richmond") ||
                    assignedCompany.name?.toLowerCase().includes("apex") ||
                    assignedCompany.name?.toLowerCase().includes("hens"));

            if (!isImoCourier) {
                // If Abia courier was submitted, auto-correct to RichmondLogistics
                assignedCompany = await LogisticsCompany.findOne({
                    $or: [
                        { code: "richmond" },
                        { name: "RichmondLogistics" },
                        { email: "richmondoc2@gmail.com" },
                    ],
                });
                if (!assignedCompany) {
                    assignedCompany = {
                        _id: new mongoose.Types.ObjectId(),
                        code: "richmond",
                        name: "RichmondLogistics",
                        email: "richmondoc2@gmail.com",
                        state: "Imo",
                        defaultBasePrice: 3000,
                    };
                }
            }
        }

        const deliveryFee = Number(
            orderData.shippingFee ||
                orderData.shippingCost ||
                assignedCompany?.defaultBasePrice ||
                3000,
        );

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
            const orderShipping = Number((shippingCost * share).toFixed(2)) || deliveryFee;
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
                logistics: {
                    courierId: assignedCompany.code || assignedCompany._id?.toString() || "courier",
                    courierName: assignedCompany.name,
                    courierEmail: assignedCompany.email,
                    shippingFee: orderShipping || deliveryFee,
                },
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
                    method: normalizedMethod,
                    amount: total,
                    status: "pending",
                    details: {},
                },
                paymentStatus: "pending",
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
            method: normalizedMethod,
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
            method: normalizedMethod,
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
            const primaryId = (savedOrders[0]?._id || savedHolder._id).toString();
            const newAmount = paystackService.addFee(holderTotal);
            const reference = `ABM_${primaryId}_${Date.now()}`;
            payment.reference = reference;
            await payment.save();
            try {
                init = await paystackService.initializeTransaction({
                    email: user.email,
                    amount: newAmount.customerPays,
                    reference,
                    callback_url:
                        callbackUrl ||
                        `${process.env.FRONTEND_URL || "https://www.abamba.com.ng"}/cart/checkout?step=submitted`,
                    metadata: {
                        orderHolderId: savedHolder._id.toString(),
                        paymentId: payment._id.toString(),
                        orderId: primaryId,
                        userId: user._id.toString(),
                        custom_fields: [
                            {
                                display_name: "Order ID",
                                variable_name: "order_id",
                                value: primaryId,
                            },
                        ],
                    },
                });
            } catch (pErr) {
                const pMsg =
                    pErr?.response?.data?.message ||
                    pErr?.message ||
                    "Paystack initialization failed";
                console.error("[PaymentService] Paystack initialization error:", pMsg);
                throw new AppError(pMsg, 400);
            }
        } else if (provider === "funz") {
            const reference = funzService.getReference();
            payment.reference = reference;
            await payment.save();
            try {
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
            } catch (fErr) {
                const fMsg =
                    fErr?.response?.data?.message ||
                    fErr?.message ||
                    "Funz payment initialization failed";
                console.error("[PaymentService] Funz initialization error:", fMsg);
                throw new AppError(fMsg, 400);
            }
        }

        // Do not clear cart or update inventory yet – wait for payment confirmation
        const primaryOrder = savedOrders[0] || {};
        const authUrl = init?.data?.authorization_url || null;
        const accessCode = init?.data?.access_code || null;
        const paymentRef = payment.reference || init?.data?.reference || null;

        return {
            orderId: primaryOrder._id || savedHolder._id,
            totalAmount: holderTotal,
            total: holderTotal,
            authorization_url: authUrl,
            access_code: accessCode,
            reference: paymentRef,
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

        // Update all child orders to processing and set payment status to paid
        const orders = await Order.find({ _id: { $in: holder.orders } })
            .populate("seller", "name email business")
            .populate("user", "name email phoneNumber");

        for (const order of orders) {
            order.status =
                order.status === "pending" ? "processing" : order.status;
            order.payment.status = "completed";
            order.paymentStatus = "paid";
            await order.save();
        }

        // Trigger logistics dispatch notifications and update company monthly ledger
        for (const order of orders) {
            try {
                let company = null;
                if (order.logisticsDispatch?.company) {
                    company = await LogisticsCompany.findById(
                        order.logisticsDispatch.company,
                    );
                }
                if (!company && order.logistics?.courierEmail) {
                    company = await LogisticsCompany.findOne({
                        email: order.logistics.courierEmail,
                    });
                }
                if (!company && order.shippingAddress?.state) {
                    const destState = (order.shippingAddress.state || "").toLowerCase();
                    const destCity = (order.shippingAddress.city || "").toLowerCase();
                    const isAbia = destState.includes("abia") || destCity.includes("aba");
                    company = await LogisticsCompany.findOne({
                        state: isAbia ? "Abia" : "Imo",
                        active: true,
                    });
                }

                const courierEmail =
                    order.logistics?.courierEmail || company?.email;
                const courierName =
                    order.logistics?.courierName || company?.name || "Logistics Partner";
                const fee = Number(
                    order.logistics?.shippingFee ||
                        order.logisticsDispatch?.deliveryFee ||
                        order.shippingCost ||
                        company?.defaultBasePrice ||
                        3000,
                );

                if (company || courierEmail) {
                    // Update company ledger in DB if company record exists
                    if (company?._id) {
                        await LogisticsCompany.findByIdAndUpdate(company._id, {
                            $inc: {
                                completedDeliveries: 1,
                                totalEarned: fee,
                                pendingPayout: fee,
                            },
                        });
                    }

                    // Send dispatch notification email to the courier's official email
                    await emailService.sendLogisticsDispatchEmail(order, company || {
                        name: courierName,
                        email: courierEmail,
                        defaultBasePrice: fee,
                    });

                    // Update order logistics and logisticsDispatch timestamps
                    order.logisticsDispatch = {
                        company: company?._id || null,
                        companyName: courierName,
                        companyEmail: courierEmail,
                        deliveryFee: fee,
                        notifiedAt: new Date(),
                        status: "notified",
                    };
                    order.logistics = {
                        courierId: company?.code || company?._id?.toString() || order.logistics?.courierId || "courier",
                        courierName,
                        courierEmail,
                        shippingFee: fee,
                    };
                    await order.save();
                }
            } catch (dispatchErr) {
                console.error(
                    "Error processing logistics dispatch on order payment:",
                    dispatchErr,
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
