import Order from "../models/order.model.js";
import User from "../models/user.model.js";
import Cart from "../models/cart.model.js";
import Product from "../models/product.model.js";
import { AppError } from "../middlewares/error.js";
import PaginationUtil from "../utils/pagination.util.js";
import mongoose from "mongoose";
import paymentService from "./payment.service.js";
import notificationService from "./notification.service.js";

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
     * @returns {Promise<Object>} Order object
     */
    async getOrderById(orderId, userId, userRole) {
        let order;

        // Check if orderId is a number (sequential ID) or ObjectId
        if (!isNaN(orderId)) {
            order = await Order.findOne({ orderId: Number(orderId) });
        } else {
            if (!mongoose.Types.ObjectId.isValid(orderId)) {
                throw new AppError("Invalid order ID", 400);
            }
            order = await Order.findById(orderId);
        }

        if (!order) {
            throw new AppError("Order not found", 404);
        }

        // Check authorization based on user role
        if (userRole === "admin") {
            // Admin can see any order
            return order;
        } else if (userRole === "seller") {
            // Sellers can see orders containing their products
            // Get the product IDs in this order
            const orderProductIds = order.items.map((item) =>
                item.product.toString()
            );

            // Check if any of the products in the order belong to this seller
            const sellerProducts = await mongoose.model("Product").find({
                _id: { $in: orderProductIds },
                user: userId,
            });

            if (sellerProducts.length === 0) {
                throw new AppError("Not authorized to view this order", 403);
            }
        } else if (order.user.toString() !== userId) {
            // Regular users can only see their own orders
            throw new AppError("Not authorized to view this order", 403);
        }

        return order;
    }

    /**
     * Get all orders with pagination and filtering
     * @param {Object} query - Query parameters
     * @param {string} userId - User ID
     * @param {string} userRole - User role
     * @returns {Promise<Object>} Orders and pagination data
     */
    async getOrders(query = {}, userId, userRole) {
        // Extract pagination parameters
        const { page, limit, skip } =
            PaginationUtil.getPaginationOptions(query);

        // Build filter based on user role
        const filter = { deleted: false };

        if (userRole === "admin") {
            // Admins can see all orders
            if (query.userId) {
                filter.user = query.userId;
            }
        } else if (userRole === "seller") {
            // Sellers can see orders containing their products
            // Find all products by this seller
            const sellerProducts = await mongoose
                .model("Product")
                .find({ user: userId }, { _id: 1 });
            const sellerProductIds = sellerProducts.map((product) =>
                product._id.toString()
            );

            if (sellerProductIds.length === 0) {
                // If seller has no products, return empty result
                return {
                    orders: [],
                    pagination: PaginationUtil.getPaginationData(
                        0,
                        page,
                        limit
                    ),
                };
            }

            // Find orders containing seller's products
            filter["items.product"] = { $in: sellerProductIds };
        } else {
            // Regular users can only see their own orders
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
                select: "name email",
            })
            .populate({
                path: "shipment",
                select: "trackingNumber carrier status",
            });

        // Generate pagination metadata
        const pagination = PaginationUtil.getPaginationData(total, page, limit);

        return { orders, pagination };
    }

    /**
     * Update order status
     * @param {string} orderId - Order ID
     * @param {string} status - New status
     * @param {string} userId - User ID making the request
     * @param {string} userRole - User role
     * @returns {Promise<Object>} Updated order
     */
    async updateOrderStatus(orderId, status, userId, userRole) {
        const order = await this.getOrderById(orderId, userId, userRole);

        // Only admin can update order status
        if (userRole !== "admin") {
            throw new AppError("Not authorized to update order status", 403);
        }

        // Validate status transition
        const validTransitions = {
            pending: ["paid", "processing", "cancelled"],
            processing: ["paid", "shipped", "delivered", "cancelled"],
            paid: ["processing", "shipped", "delivered", "cancelled"],
            shipped: ["delivered", "returned"],
            delivered: ["returned", "refunded"],
            cancelled: ["refunded"],
            refunded: [],
        };

        if (!validTransitions[order.status].includes(status)) {
            throw new AppError(
                `Cannot change order status from ${order.status} to ${status}`,
                400
            );
        }

        order.status = status;

        // If order is delivered, release funds from pending to available seller wallet balance
        if (status === "delivered" && order.sellerWalletStatus === "pending") {
            const creditAmount = Number(order.subtotal || 0);
            if (order.seller && creditAmount > 0) {
                await User.findByIdAndUpdate(order.seller, {
                    $inc: {
                        "wallet.balance": creditAmount,
                        "wallet.pendingBalance": -creditAmount,
                    },
                });
                order.sellerWalletStatus = "paid";
                await notificationService.send(
                    order.seller,
                    "Funds Released",
                    `Order #${order.orderId || order._id} has been delivered. **₦${creditAmount.toLocaleString()}** is now available for withdrawal.`,
                );
            }
        }

        // If order is cancelled or refunded, handle payment status
        if (status === "cancelled" || status === "refunded") {
            order.payment.status =
                status === "cancelled" ? "failed" : "refunded";
        }

        await order.save();

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
