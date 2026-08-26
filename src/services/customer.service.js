import { AppError } from "../middlewares/error.js";
import User from "../models/user.model.js";
import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import mongoose from "mongoose";

class CustomerService {
    /**
     * Get customers who have purchased from a specific seller
     * @param {string} sellerId - Seller ID
     * @param {Object} options - Query options (pagination, sorting, filtering)
     * @returns {Promise<Object>} - Customers with pagination data
     */
    getSellerCustomers = async (sellerId, options = {}) => {
        const page = parseInt(options.page) || 1;
        const limit = parseInt(options.limit) || 10;
        const skip = (page - 1) * limit;
        const search = options.search || "";
        const sortBy = options.sortBy || "lastPurchaseDate";
        const sortOrder = options.sortOrder === "asc" ? 1 : -1;

        // Find all orders belonging to this seller using Order.seller
        const orders = await Order.find({
            seller: sellerId,
            status: { $ne: "cancelled" },
        }).populate("user");

        // Extract unique customer IDs
        const customerIds = [
            ...new Set(
                orders
                    .map((order) => order.user?._id?.toString())
                    .filter((id) => id) // Filter out any null/undefined values
            ),
        ];

        // Build search query if needed
        let searchQuery = {};
        if (search) {
            searchQuery = {
                $or: [
                    { name: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                    { phoneNumber: { $regex: search, $options: "i" } },
                ],
            };
        }

        // Count total customers for pagination
        const totalCustomers = await User.countDocuments({
            _id: { $in: customerIds },
            role: "user",
            ...searchQuery,
        });

        // Get customers with pagination and search
        const customers = await User.find({
            _id: { $in: customerIds },
            role: "user",
            ...searchQuery,
        })
            .select(
                "name email phoneNumber profilePicture lastLoginAt createdAt"
            )
            .sort({ [sortBy]: sortOrder })
            .skip(skip)
            .limit(limit);

        // Enhance customer data with order statistics
        const enhancedCustomers = await Promise.all(
            customers.map(async (customer) => {
                const customerOrders = orders.filter(
                    (order) =>
                        order.user?._id.toString() === customer._id.toString()
                );

                // Calculate customer-specific metrics
                // Since Order.seller is tied to a single seller, sum all item totals in these orders
                const totalSpent = customerOrders.reduce((sum, order) => {
                    const orderTotal = order.items.reduce(
                        (acc, item) => acc + item.price * item.quantity,
                        0
                    );
                    return sum + orderTotal;
                }, 0);

                const orderDates = customerOrders.map(
                    (order) => order.createdAt
                );
                const lastPurchaseDate =
                    orderDates.length > 0
                        ? Math.max(...orderDates.map((date) => date.getTime()))
                        : null;

                // Total number of items purchased across these orders (sum of quantities)
                const itemsCount = customerOrders.reduce((sum, order) => {
                    const orderItemsCount = order.items.reduce(
                        (acc, item) => acc + (item.quantity || 0),
                        0
                    );
                    return sum + orderItemsCount;
                }, 0);

                return {
                    _id: customer._id,
                    name: customer.name,
                    email: customer.email,
                    phoneNumber: customer.phoneNumber,
                    profilePicture: customer.profilePicture,
                    registeredDate: customer.createdAt,
                    lastLoginAt: customer.lastLoginAt,
                    orderCount: customerOrders.length,
                    itemsCount,
                    totalSpent,
                    lastPurchaseDate: lastPurchaseDate
                        ? new Date(lastPurchaseDate)
                        : null,
                };
            })
        );

        return {
            customers: enhancedCustomers,
            pagination: {
                total: totalCustomers,
                totalPages: Math.ceil(totalCustomers / limit),
                currentPage: page,
                limit,
            },
        };
    };

    /**
     * Get a specific customer by ID (only if they've purchased from the seller)
     * @param {string} sellerId - Seller ID
     * @param {string} customerId - Customer ID
     * @returns {Promise<Object>} - Customer details with purchase history
     */
    getSellerCustomerById = async (sellerId, customerId) => {
        // Find all products by this seller
        const sellerProducts = await Product.find({ seller: sellerId }).select(
            "_id"
        );
        const productIds = sellerProducts.map((p) => p._id);

        if (productIds.length === 0) {
            throw new AppError("No products found for this seller", 404);
        }

        // Get the customer
        const customer = await User.findOne({
            _id: customerId,
            role: "user",
        }).select(
            "name email phoneNumber profilePicture dob addresses createdAt lastLoginAt"
        );

        if (!customer) {
            throw new AppError("Customer not found", 404);
        }

        // Find all orders by this customer containing seller's products
        const orders = await Order.find({
            user: customerId,
            "items.product": { $in: productIds },
            status: { $ne: "cancelled" },
        });

        // If there are no orders, this customer hasn't purchased from the seller
        if (orders.length === 0) {
            throw new AppError(
                "This customer hasn't purchased any of your products",
                404
            );
        }

        // Calculate customer-specific metrics
        const totalSpent = orders.reduce((sum, order) => {
            let orderTotal = 0;
            order.items.forEach((item) => {
                if (
                    productIds.some(
                        (id) => id.toString() === item.product.toString()
                    )
                ) {
                    orderTotal += item.price * item.quantity;
                }
            });
            return sum + orderTotal;
        }, 0);

        // Get order dates and last purchase date
        const orderDates = orders.map((order) => order.createdAt);
        const lastPurchaseDate =
            orderDates.length > 0
                ? new Date(
                      Math.max(...orderDates.map((date) => date.getTime()))
                  )
                : null;

        // Convert the customer to a plain object to add custom fields
        const customerData = customer.toObject();

        // Add purchase metrics
        return {
            ...customerData,
            orderCount: orders.length,
            totalSpent,
            lastPurchaseDate,
            firstPurchaseDate:
                orderDates.length > 0
                    ? new Date(
                          Math.min(...orderDates.map((date) => date.getTime()))
                      )
                    : null,
            // Only include default address for privacy
            address: customer.addresses?.find((addr) => addr.isDefault) || null,
            // Remove all addresses array for privacy
            addresses: undefined,
        };
    };

    /**
     * Get orders from a specific customer that contain the seller's products
     * @param {string} sellerId - Seller ID
     * @param {string} customerId - Customer ID
     * @param {Object} options - Query options (pagination, sorting, filtering)
     * @returns {Promise<Object>} - Orders with pagination data
     */
    getCustomerOrdersForSeller = async (sellerId, customerId, options = {}) => {
        const page = parseInt(options.page) || 1;
        const limit = parseInt(options.limit) || 10;
        const skip = (page - 1) * limit;
        const status = options.status || null;
        const sortBy = options.sortBy || "createdAt";
        const sortOrder = options.sortOrder === "asc" ? 1 : -1;

        // Ensure customer exists
        const customer = await User.findOne({ _id: customerId, role: "user" });
        if (!customer) {
            throw new AppError("Customer not found", 404);
        }

        // Build query
        const query = {
            user: customerId,
            seller: sellerId,
            deleted: false,
        };

        // Add status filter if provided
        if (status) {
            query.status = status;
        }

        // Get total count for pagination
        const totalOrders = await Order.countDocuments(query);

        // Get orders with pagination
        const orders = await Order.find(query)
            .sort({ [sortBy]: sortOrder })
            .skip(skip)
            .limit(limit)
            .populate("items.product", "name images user")
            .lean();

        // Calculate totals for each order (orders belong to a single seller)
        const processedOrders = orders.map((order) => {
            const sellerItems = order.items; // all items belong to this seller

            const sellerItemsTotal = sellerItems.reduce(
                (sum, item) => sum + item.price * item.quantity,
                0
            );

            const sellerShippingPortion = order.shippingCost || 0;

            return {
                _id: order._id,
                orderNumber: order.orderId,
                status: order.status,
                createdAt: order.createdAt,
                sellerItems,
                sellerItemsCount: sellerItems.length,
                sellerItemsTotal,
                sellerTotal: sellerItemsTotal + sellerShippingPortion,
                sellerShippingPortion:
                    Math.round(sellerShippingPortion * 100) / 100,
                customerName: order.shippingAddress?.fullName || customer.name,
                shippingAddress: order.shippingAddress,
                paymentMethod: order.payment?.method,
                // Include full order data, but don't duplicate items
                fullOrderTotal: order.total,
                fullOrderItemsCount: order.items.length,
                // Don't include items from other sellers (not applicable here)
                items: undefined,
            };
        });

        return {
            orders: processedOrders,
            pagination: {
                total: totalOrders,
                totalPages: Math.ceil(totalOrders / limit),
                currentPage: page,
                limit,
                hasNextPage: page < Math.ceil(totalOrders / limit),
                hasPrevPage: page > 1,
            },
        };
    };

    /**
     * Get customer metrics for a seller's dashboard
     * @param {string} sellerId - Seller ID
     * @returns {Promise<Object>} - Metrics about the seller's customers
     */
    getSellerCustomerMetrics = async (sellerId) => {
        // Find all products by this seller
        const sellerProducts = await Product.find({ seller: sellerId }).select(
            "_id"
        );
        const productIds = sellerProducts.map((p) => p._id);

        if (productIds.length === 0) {
            return {
                totalCustomers: 0,
                newCustomers: { today: 0, thisWeek: 0, thisMonth: 0 },
                returningRate: 0,
                averageOrderValue: 0,
            };
        }

        // Find all orders containing seller's products
        const orders = await Order.find({
            "items.product": { $in: productIds },
            status: { $ne: "cancelled" },
        }).populate("user", "name email");

        // Extract unique customer IDs
        const customerMap = {};

        orders.forEach((order) => {
            const customerId = order.user?._id?.toString();
            if (!customerId) return;

            if (!customerMap[customerId]) {
                customerMap[customerId] = {
                    orders: [],
                    totalSpent: 0,
                };
            }

            // Calculate customer spend on this seller's products
            let orderTotal = 0;
            order.items.forEach((item) => {
                if (
                    productIds.some(
                        (id) => id.toString() === item.product.toString()
                    )
                ) {
                    orderTotal += item.price * item.quantity;
                }
            });

            customerMap[customerId].orders.push({
                date: order.createdAt,
                total: orderTotal,
            });

            customerMap[customerId].totalSpent += orderTotal;
        });

        const customers = Object.values(customerMap);

        // Get dates for filtering
        const now = new Date();
        const today = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
        );
        const thisWeek = new Date(today);
        thisWeek.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1); // Start of month

        // Calculate metrics
        const totalCustomers = customers.length;

        // New customers based on their first order date
        const newCustomers = {
            today: 0,
            thisWeek: 0,
            thisMonth: 0,
        };

        // Calculate returning customer rate and average order value
        let multiOrderCustomers = 0;
        let totalOrderValue = 0;
        let totalOrders = 0;

        customers.forEach((customer) => {
            // Sort orders by date
            customer.orders.sort((a, b) => a.date - b.date);

            // Check if this is a new customer based on first order
            const firstOrderDate = customer.orders[0].date;

            if (firstOrderDate >= today) {
                newCustomers.today++;
                newCustomers.thisWeek++;
                newCustomers.thisMonth++;
            } else if (firstOrderDate >= thisWeek) {
                newCustomers.thisWeek++;
                newCustomers.thisMonth++;
            } else if (firstOrderDate >= thisMonth) {
                newCustomers.thisMonth++;
            }

            // Check if returning customer (more than one order)
            if (customer.orders.length > 1) {
                multiOrderCustomers++;
            }

            // Add to order totals
            totalOrders += customer.orders.length;
            totalOrderValue += customer.totalSpent;
        });

        // Calculate rates
        const returningRate =
            totalCustomers > 0
                ? (multiOrderCustomers / totalCustomers) * 100
                : 0;

        const averageOrderValue =
            totalOrders > 0 ? totalOrderValue / totalOrders : 0;

        return {
            totalCustomers,
            newCustomers,
            returningRate: Math.round(returningRate * 10) / 10, // Round to 1 decimal place
            averageOrderValue: Math.round(averageOrderValue * 100) / 100, // Round to 2 decimal places
        };
    };

    /**
     * Get recent customers who purchased from a seller
     * @param {string} sellerId - Seller ID
     * @param {number} limit - Number of customers to return
     * @returns {Promise<Array>} - List of recent customers
     */
    getRecentCustomersForSeller = async (sellerId, limit = 5) => {
        // Find all products by this seller
        const sellerProducts = await Product.find({ seller: sellerId }).select(
            "_id"
        );
        const productIds = sellerProducts.map((p) => p._id);

        if (productIds.length === 0) {
            return [];
        }

        // Find recent orders containing seller's products
        const recentOrders = await Order.find({
            "items.product": { $in: productIds },
            status: { $ne: "cancelled" },
        })
            .sort({ createdAt: -1 })
            .limit(50) // Get a larger batch to filter from
            .populate("user", "name email phoneNumber profilePicture")
            .lean();

        // Track seen customers to avoid duplicates
        const seenCustomers = new Set();
        const recentCustomers = [];

        for (const order of recentOrders) {
            if (!order.user?._id) continue;

            const customerId = order.user._id.toString();
            if (seenCustomers.has(customerId)) continue;

            seenCustomers.add(customerId);

            // Calculate order value for seller products only
            let orderTotal = 0;
            let sellerItemsCount = 0;

            order.items.forEach((item) => {
                if (
                    productIds.some(
                        (id) => id.toString() === item.product.toString()
                    )
                ) {
                    orderTotal += item.price * item.quantity;
                    sellerItemsCount++;
                }
            });

            recentCustomers.push({
                _id: order.user._id,
                name: order.user.name,
                email: order.user.email,
                phoneNumber: order.user.phoneNumber,
                profilePicture: order.user.profilePicture,
                lastOrder: {
                    id: order._id,
                    date: order.createdAt,
                    orderNumber: order.orderNumber,
                    total: orderTotal,
                    itemCount: sellerItemsCount,
                    status: order.status,
                },
            });

            if (recentCustomers.length >= limit) break;
        }

        return recentCustomers;
    };

    /**
     * Get top customers for a seller based on purchase amount
     * @param {string} sellerId - Seller ID
     * @param {number} limit - Number of top customers to return
     * @param {string} period - Time period (day, week, month, year, all)
     * @returns {Promise<Array>} - List of top customers
     */
    getTopCustomersForSeller = async (
        sellerId,
        limit = 5,
        period = "month"
    ) => {
        // Find all products by this seller
        const sellerProducts = await Product.find({ seller: sellerId }).select(
            "_id"
        );
        const productIds = sellerProducts.map((p) => p._id);

        if (productIds.length === 0) {
            return [];
        }

        // Define date ranges for filtering
        const now = new Date();
        let startDate;

        switch (period) {
            case "day":
                startDate = new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    now.getDate()
                );
                break;
            case "week":
                startDate = new Date(now);
                startDate.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
                break;
            case "month":
                startDate = new Date(now.getFullYear(), now.getMonth(), 1); // Start of month
                break;
            case "year":
                startDate = new Date(now.getFullYear(), 0, 1); // Start of year
                break;
            default: // 'all' or any invalid value
                startDate = new Date(0); // Beginning of time
        }

        // Find orders within the time period
        const query = {
            "items.product": { $in: productIds },
            status: { $ne: "cancelled" },
            createdAt: { $gte: startDate },
        };

        const orders = await Order.find(query)
            .populate("user", "name email phoneNumber profilePicture")
            .lean();

        // Aggregate customer spending
        const customerMap = {};

        orders.forEach((order) => {
            if (!order.user?._id) return;

            const customerId = order.user._id.toString();

            if (!customerMap[customerId]) {
                customerMap[customerId] = {
                    _id: order.user._id,
                    name: order.user.name,
                    email: order.user.email,
                    phoneNumber: order.user.phoneNumber,
                    profilePicture: order.user.profilePicture,
                    orderCount: 0,
                    totalSpent: 0,
                    averageOrderValue: 0,
                };
            }

            // Calculate order value for seller products only
            let orderTotal = 0;

            order.items.forEach((item) => {
                if (
                    productIds.some(
                        (id) => id.toString() === item.product.toString()
                    )
                ) {
                    orderTotal += item.price * item.quantity;
                }
            });

            customerMap[customerId].orderCount++;
            customerMap[customerId].totalSpent += orderTotal;
        });

        // Calculate average order value for each customer
        Object.values(customerMap).forEach((customer) => {
            customer.averageOrderValue =
                customer.orderCount > 0
                    ? customer.totalSpent / customer.orderCount
                    : 0;
        });

        // Sort by total spent and get top customers
        const topCustomers = Object.values(customerMap)
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, limit);

        return topCustomers;
    };
}

export default new CustomerService();
