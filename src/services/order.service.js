import Order from "../models/order.model.js";
import User from "../models/user.model.js";
import Cart from "../models/cart.model.js";
import Product from "../models/product.model.js";
import { AppError } from "../middlewares/error.js";
import PaginationUtil from "../utils/pagination.util.js";
import mongoose from "mongoose";
import paymentService from "./payment.service.js";
import notificationService from "./notification.service.js";
import { releaseSellerFunds } from "./sellerFunds.service.js";

class OrderService {
    /**
     * Create a new order from cart
     * @param {string} userId - User ID
     * @param {Object} orderData - Order data including address info and payment
     * @returns {Promise<Object>} New order
     */
    async createOrder(userId, orderData) {
        // Delegate to PaymentService to create an OrderHolder with split orders
        const result = await paymentService.createHolderFromCart(
            userId,
            orderData
        );
        return result;
    }

    /**
     * Get a specific order by ID
     * @param {string} orderId - Order ID or sequential order number
     * @param {string} userId - User ID
     * @param {string} userRole - User role
     * @param {Object} [user] - User object
     * @returns {Promise<Object>} Order object
     */
    async getOrderById(orderId, userId, userRole, user = null) {
        let query;

        // Check if orderId is a number (sequential ID) or ObjectId
        if (!isNaN(orderId)) {
            query = { orderId: Number(orderId) };
        } else {
            if (!mongoose.Types.ObjectId.isValid(orderId)) {
                throw new AppError("Invalid order ID", 400);
            }
            query = { _id: orderId };
        }

        const order = await Order.findOne(query)
            .populate({
                path: "user",
                select: "name email phoneNumber addresses",
            })
            .populate({
                path: "seller",
                select: "name email business",
            })
            .populate({
                path: "shipment",
                select: "trackingNumber carrier status estimatedDeliveryDate trackingEvents",
            })
            .populate({
                path: "items.product",
                select: "name sku images basePrice category brand",
            });

        if (!order) {
            throw new AppError("Order not found", 404);
        }

        // Check authorization based on user role and roles array
        const isAdmin =
            userRole === "admin" ||
            user?.role === "admin" ||
            user?.roles?.includes("admin") ||
            user?.roles?.includes("superAdmin");
        const isSeller =
            userRole === "seller" ||
            user?.role === "seller" ||
            user?.roles?.includes("seller") ||
            Boolean(user?.business);

        let authorized = false;

        if (isAdmin) {
            authorized = true;
        } else {
            // If the user placed this order as a customer/buyer, they can view it
            const customerIdStr = (order.user?._id || order.user)?.toString();
            if (customerIdStr === userId.toString()) {
                authorized = true;
            } else if (isSeller) {
                // If the user is a seller and owns this order or its items, they can view it
                const sellerIdStr = (order.seller?._id || order.seller)?.toString();
                if (sellerIdStr && sellerIdStr === userId.toString()) {
                    authorized = true;
                } else {
                    const orderProductIds = order.items.map((item) =>
                        (item.product?._id || item.product).toString()
                    );

                    const sellerProducts = await mongoose.model("Product").find({
                        _id: { $in: orderProductIds },
                        user: userId,
                    });

                    if (sellerProducts.length > 0) {
                        authorized = true;
                    }
                }
            }
        }

        if (!authorized) {
            throw new AppError("Not authorized to view this order", 403);
        }

        const orderObj = order.toObject ? order.toObject() : { ...order };
        const sellerObj = orderObj.seller;
        const sellerId = (sellerObj?._id || sellerObj || "").toString();
        const sellerName =
            sellerObj?.business?.businessName ||
            sellerObj?.name ||
            "Verified Merchant";

        orderObj.seller = sellerId;
        orderObj.sellerId = sellerId;
        orderObj.sellerName = sellerName;
        orderObj.sellerDetails = typeof sellerObj === "object" ? sellerObj : { _id: sellerId, name: sellerName };
        orderObj.sellerInfo = orderObj.sellerDetails;

        return orderObj;
    }

    /**
     * Get all orders with pagination and filtering
     * @param {Object} query - Query parameters
     * @param {string} userId - User ID
     * @param {string} userRole - User role
     * @param {Object} [user] - User object
     * @returns {Promise<Object>} Orders and pagination data
     */
    async getOrders(query = {}, userId, userRole, user = null) {
        // Extract pagination parameters
        const { page, limit, skip } =
            PaginationUtil.getPaginationOptions(query);

        // Build filter based on user role
        const filter = { deleted: false };

        const isAdmin =
            userRole === "admin" ||
            user?.role === "admin" ||
            user?.roles?.includes("admin") ||
            user?.roles?.includes("superAdmin");
        const isSeller =
            userRole === "seller" ||
            user?.role === "seller" ||
            user?.roles?.includes("seller") ||
            Boolean(user?.business);

        const isBuyerScope =
            query.scope === "buyer" ||
            query.role === "buyer" ||
            query.as === "buyer" ||
            query.type === "buyer" ||
            query.buyerOnly === "true";

        if (isAdmin) {
            // Admins can see all orders
            if (query.userId) {
                filter.user = query.userId;
            }
            if (query.sellerId) {
                filter.seller = query.sellerId;
            }
        } else if (isSeller && !isBuyerScope) {
            // Find all products by this seller
            const sellerProducts = await mongoose
                .model("Product")
                .find({ user: userId }, { _id: 1 });
            const sellerProductIds = sellerProducts.map((product) =>
                product._id.toString()
            );

            filter.$or = [
                { seller: userId },
                ...(sellerProductIds.length > 0 ? [{ "items.product": { $in: sellerProductIds } }] : []),
            ];
        } else {
            // Regular users / buyers (or sellers viewing their own purchases)
            filter.user = userId;
        }

        // Add status filter if provided
        if (query.status) {
            filter.status = query.status;
        }

        // Add date range filter if provided
        if (query.startDate || query.endDate) {
            filter.createdAt = {};
            if (query.startDate) {
                filter.createdAt.$gte = new Date(query.startDate);
            }
            if (query.endDate) {
                filter.createdAt.$lte = new Date(query.endDate);
            }
        }

        // Add shipment filter if provided
        if (query.hasShipment === "true") {
            filter.shipment = { $ne: null };
        } else if (query.hasShipment === "false") {
            filter.shipment = null;
        }

        // Add search filter if provided
        if (query.search) {
            const searchTerm = query.search.trim();
            const searchRegex = new RegExp(searchTerm, "i");
            const searchOr = [
                { "items.name": searchRegex },
                { "shippingAddress.fullName": searchRegex },
                { "shippingAddress.phoneNumber": searchRegex },
                { "shippingAddress.city": searchRegex },
            ];

            const num = Number(searchTerm);
            if (!isNaN(num)) {
                searchOr.push({ orderId: num });
            }
            if (mongoose.Types.ObjectId.isValid(searchTerm)) {
                searchOr.push({ _id: new mongoose.Types.ObjectId(searchTerm) });
            }

            if (filter.$or) {
                const existingOr = filter.$or;
                delete filter.$or;
                filter.$and = [{ $or: existingOr }, { $or: searchOr }];
            } else if (filter.$and) {
                filter.$and.push({ $or: searchOr });
            } else {
                filter.$and = [{ $or: searchOr }];
            }
        }

        // Build sort object
        let sort = {};
        if (query.sort) {
            const sortFields = query.sort.split(",");
            sortFields.forEach((field) => {
                if (field.startsWith("-")) {
                    sort[field.substring(1)] = -1;
                } else {
                    sort[field] = 1;
                }
            });
        } else {
            // Default sort by createdAt in descending order
            sort = { createdAt: -1 };
        }

        // Count total matching documents
        const total = await Order.countDocuments(filter);

        // Get orders with pagination, filtering, and sorting
        const orders = await Order.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .populate({
                path: "user",
                select: "name email phoneNumber",
            })
            .populate({
                path: "seller",
                select: "name email business",
            })
            .populate({
                path: "shipment",
                select: "trackingNumber carrier status",
            })
            .populate({
                path: "items.product",
                select: "name sku images basePrice category brand",
            });

        // Process orders to ensure seller is string ID for frontend .slice() while preserving sellerDetails
        const processedOrders = orders.map((order) => {
            const orderObj = order.toObject ? order.toObject() : { ...order };
            const sellerObj = orderObj.seller;
            const sellerId = (sellerObj?._id || sellerObj || "").toString();
            const sellerName =
                sellerObj?.business?.businessName ||
                sellerObj?.name ||
                "Verified Merchant";

            orderObj.seller = sellerId;
            orderObj.sellerId = sellerId;
            orderObj.sellerName = sellerName;
            orderObj.sellerDetails = typeof sellerObj === "object" ? sellerObj : { _id: sellerId, name: sellerName };
            orderObj.sellerInfo = orderObj.sellerDetails;

            return orderObj;
        });

        // Generate pagination metadata
        const pagination = PaginationUtil.getPaginationData(total, page, limit);

        return { orders: processedOrders, pagination };
    }

    /**
     * Update order status
     * @param {string} orderId - Order ID
     * @param {string} status - New status
     * @param {string} userId - User ID making the request
     * @param {string} userRole - User role
     * @returns {Promise<Object>} Updated order
     */
    async updateOrderStatus(orderId, status, userId, userRole, user = null) {
        // getOrderById enforces authorization but returns a plain object (no .save()).
        // Re-load the real Mongoose document to perform the update.
        const orderView = await this.getOrderById(orderId, userId, userRole, user);
        const order = await Order.findById(orderView._id);
        if (!order) {
            throw new AppError("Order not found", 404);
        }

        const isAdmin =
            userRole === "admin" ||
            user?.role === "admin" ||
            user?.roles?.includes("admin") ||
            user?.roles?.includes("superAdmin");
        const isSeller =
            userRole === "seller" ||
            user?.role === "seller" ||
            user?.roles?.includes("seller") ||
            Boolean(user?.business);

        const sellerIdStr = (order.seller?._id || order.seller)?.toString();
        const isOrderSeller = isSeller && sellerIdStr === userId?.toString();

        // Allow admin or the order's seller to update order status
        if (!isAdmin && !isOrderSeller) {
            throw new AppError("Not authorized to update order status", 403);
        }

        // Validate status transition
        const validTransitions = {
            pending: ["paid", "processing", "cancelled", "abandoned"],
            abandoned: ["cancelled", "refunded", "paid", "processing"],
            processing: ["paid", "shipped", "delivered", "cancelled"],
            paid: ["processing", "shipped", "delivered", "cancelled"],
            shipped: ["delivered", "returned"],
            delivered: ["returned", "refunded"],
            cancelled: ["refunded"],
            refunded: [],
        };

        // Idempotent: repeated "delivered" requests (double-click / retry) are a safe no-op
        if (
            status === "delivered" &&
            (order.status === "delivered" ||
                order.fundsReleased ||
                order.sellerWalletStatus === "paid")
        ) {
            return order;
        }

        if (!validTransitions[order.status]?.includes(status)) {
            throw new AppError(
                `Cannot change order status from ${order.status} to ${status}`,
                400
            );
        }

        // Persist the status FIRST (atomic, guarded by the expected current status)
        // so a retry can never re-run the fund release for an already-delivered order.
        const previousStatus = order.status;
        const transitioned = await Order.findOneAndUpdate(
            { _id: order._id, status: previousStatus },
            { $set: { status } },
            { new: true },
        );
        if (!transitioned) {
            // Another request already changed this order; do not touch the wallet
            return await Order.findById(order._id);
        }
        order.status = status;

        // If order is delivered, release funds from pending to available seller wallet balance.
        // Atomic + idempotent: credits the seller at most once. Creates NO payout records.
        if (status === "delivered") {
            try {
                const release = await releaseSellerFunds(order._id);
                if (release.released) {
                    order.sellerWalletStatus = "paid";
                    order.fundsReleased = true;
                    await notificationService.send(
                        release.sellerId,
                        "Funds Released",
                        `Order #${release.orderRef} has been delivered. **₦${release.amount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}** is now available for withdrawal.`,
                    );
                }
            } catch (err) {
                // Roll back status so the admin can safely retry
                await Order.updateOne({ _id: order._id }, { $set: { status: previousStatus } });
                throw new AppError(
                    "Could not release seller funds. Order status was not changed; please retry.",
                    500,
                );
            }
        }

        // If order is cancelled, refunded or abandoned, handle payment status
        if (status === "cancelled" || status === "refunded" || status === "abandoned") {
            order.payment.status =
                status === "cancelled" ? "failed" : status === "abandoned" ? "abandoned" : "refunded";
            await Order.updateOne(
                { _id: order._id },
                { $set: { "payment.status": order.payment.status } },
            );
        }

        // Notify customer of order status change
        const statusMessages = {
            processing: "Your order is now being processed.",
            paid: "Your payment has been received and your order is confirmed.",
            shipped: "Your order has been shipped and is on its way!",
            delivered: `Your order #${order.orderId || order._id} has been delivered. Enjoy!`,
            cancelled: "Your order has been cancelled.",
            returned: "Your order return has been initiated.",
            refunded: "Your order has been refunded.",
        };
        const msg = statusMessages[status];
        if (msg) {
            await notificationService.send(
                order.user,
                `Order #${order.orderNumber || order.orderId || orderId} update`,
                msg
            );
        }

        return order;
    }

    /**
     * Update payment information for an order
     * @param {string} orderId - Order ID
     * @param {Object} paymentData - Payment data
     * @param {string} userId - User ID making the request
     * @param {string} userRole - User role
     * @returns {Promise<Object>} Updated order
     */
    async updatePayment(orderId, paymentData, userId, userRole) {
        const order = await this.getOrderById(orderId, userId, userRole);

        // Only admin can update payment
        if (userRole !== "admin") {
            throw new AppError(
                "Not authorized to update payment information",
                403
            );
        }

        // Update payment fields
        if (paymentData.status) {
            order.payment.status = paymentData.status;
        }

        if (paymentData.transactionId) {
            order.payment.transactionId = paymentData.transactionId;
        }

        if (paymentData.details) {
            order.payment.details = {
                ...order.payment.details,
                ...paymentData.details,
            };
        }

        // If payment is completed, update order status if still pending
        if (paymentData.status === "completed" && order.status === "pending") {
            order.status = "processing";
        }

        return await order.save();
    }

    /**
     * Delete an order (soft delete)
     * @param {string} orderId - Order ID
     * @param {string} userId - User ID making the request
     * @param {string} userRole - User role
     * @returns {Promise<Object>} Deleted order
     */
    async deleteOrder(orderId, userId, userRole) {
        const order = await this.getOrderById(orderId, userId, userRole);

        // Only admin can delete orders
        if (userRole !== "admin") {
            throw new AppError("Not authorized to delete orders", 403);
        }

        // Soft delete
        order.deleted = true;
        order.deletedAt = Date.now();

        return await order.save();
    }

    /**
     * Update inventory after order creation
     * @param {Object} order - Order object
     * @returns {Promise<void>}
     */
    async updateInventory(order) {
        await Promise.all(
            order.items.map(async (item) => {
                const product = await Product.findById(item.product);

                if (item.variant) {
                    // Update variant stock
                    const variant = product.variants.id(item.variant);
                    if (variant) {
                        variant.quantity -= item.quantity;
                        if (variant.quantity <= 0) {
                            variant.inStock = false;
                        }
                    }
                } else {
                    // Update product stock
                    product.stock -= item.quantity;
                }

                await product.save();
            })
        );
    }
}

export default new OrderService();
