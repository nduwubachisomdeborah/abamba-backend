import { AppError } from "../middlewares/error.js";
import User from "../models/user.model.js";
import Settings from "../models/settings.model.js";
import Product from "../models/product.model.js";
import Order from "../models/order.model.js";
import Cart from "../models/cart.model.js";
import Review from "../models/review.model.js";
import ProductViewed from "../models/productviewed.model.js";
import fileService from "./file.service.js";
import authService from "./auth.service.js";

class SellerService {
    static getSellers = async () => {
        return await User.find({
            role: "seller",
            deleted: false,
        });
    };

    static getSellerById = async (id) => {
        return await User.findById(id);
    };

    updateProfilePicture = async (userId, profilePicture) => {
        const seller = await User.findOne({
            _id: userId,
            role: "seller",
            deleted: false,
        }).select("name profilePicture");

        if (!seller) {
            throw new AppError("Seller not found", 404);
        }

        seller.profilePicture = profilePicture;
        await seller.save();

        return {
            id: seller._id,
            name: seller.name,
            profilePicture: seller.profilePicture,
        };
    };

    updateBank = async (userId, bankData, otpCode) => {
        const seller = await User.findOne({
            _id: userId,
            role: "seller",
            deleted: false,
        });

        if (!seller) {
            throw new AppError("Seller not found", 404);
        }

        // Verify OTP using the seller's email
        await authService.verifyOTP(seller.email, otpCode, "seller");

        seller.bank = {
            ...seller.bank,
            bankName: bankData.bankName,
            accountNumber: bankData.accountNumber,
            accountName: bankData.accountName,
            bankCode: bankData.bankCode,
            bvn: bankData.bvn,
        };

        await seller.save();

        return seller.bank;
    };

    updatePassword = async (userId, oldPassword, newPassword) => {
        const seller = await User.findOne({
            _id: userId,
            role: "seller",
            deleted: false,
        }).select("+password googleId");

        if (!seller) {
            throw new AppError("Seller not found", 404);
        }

        if (!seller.password) {
            throw new AppError(
                "This account was created with Google sign-in and does not have a password set. Please use the password reset flow to set one.",
                400,
            );
        }

        const isSamePassword = await seller.correctPassword(oldPassword);

        if (!isSamePassword) {
            throw new AppError("Old password is incorrect", 400);
        }

        if (oldPassword === newPassword) {
            throw new AppError(
                "New password must be different from the old password",
                400,
            );
        }

        seller.password = newPassword;
        await seller.save();

        return true;
    };

    updateNotificationSettings = async (userId, updates) => {
        const seller = await User.findOne({
            _id: userId,
            role: "seller",
            deleted: false,
        }).select("_id");

        if (!seller) {
            throw new AppError("Seller not found", 404);
        }

        const allowedFields = [
            "orderConfirmation",
            "orderStatusChange",
            "orderDelivered",
            "emailNotification",
        ];

        const updateFields = allowedFields.reduce((acc, field) => {
            if (updates[field] !== undefined) {
                acc[`notification.${field}`] = updates[field];
            }
            return acc;
        }, {});

        if (Object.keys(updateFields).length === 0) {
            throw new AppError(
                "No valid notification fields provided for update",
                400,
            );
        }

        const settings = await Settings.findOneAndUpdate(
            { user: userId },
            {
                $set: updateFields,
                $setOnInsert: { user: userId },
            },
            {
                new: true,
                upsert: true,
                setDefaultsOnInsert: true,
            },
        );

        return settings.notification;
    };

    getSellerStats = async (sellerId) => {
        const seller = await User.findById(sellerId).select(
            "name email business createdAt",
        );

        if (!seller) {
            throw new AppError("Seller not found", 404);
        }

        // Get seller's products (Product uses `user` as the seller reference)
        const sellerProducts = await Product.find({
            user: sellerId,
            deleted: false,
        }).select("_id");

        const productIds = sellerProducts.map((p) => p._id);

        // Define date ranges
        const now = new Date();
        const today = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
        );
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const thisWeekStart = new Date(today);
        thisWeekStart.setDate(today.getDate() - today.getDay());
        const lastWeekStart = new Date(thisWeekStart);
        lastWeekStart.setDate(thisWeekStart.getDate() - 7);
        const lastWeekEnd = new Date(thisWeekStart);

        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(
            now.getFullYear(),
            now.getMonth() - 1,
            1,
        );
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

        const fourMonthsAgo = new Date(
            now.getFullYear(),
            now.getMonth() - 4,
            1,
        );
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        const yearAgo = new Date(
            now.getFullYear() - 1,
            now.getMonth(),
            now.getDate(),
        );

        const last7Days = new Date(today);
        last7Days.setDate(today.getDate() - 7);

        // Helper function to calculate percentage change
        const calculatePercentageChange = (current, previous) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return Math.round(((current - previous) / previous) * 100);
        };

        // Helper function to get sales data for a period
        const getSalesForPeriod = async (startDate, endDate = now) => {
            const orders = await Order.find({
                seller: sellerId,
                status: { $ne: "cancelled" },
                createdAt: { $gte: startDate, $lt: endDate },
            });

            let sales = 0;
            let orderCount = orders.length;

            orders.forEach((order) => {
                order.items.forEach((item) => {
                    if (
                        productIds.some(
                            (id) => id.toString() === item.product.toString(),
                        )
                    ) {
                        sales += item.price * item.quantity;
                    }
                });
            });

            return { sales, orders: orderCount };
        };

        // Get period-based statistics
        const [
            todayStats,
            yesterdayStats,
            thisWeekStats,
            lastWeekStats,
            thisMonthStats,
            lastMonthStats,
            fourMonthsStats,
            sixMonthsStats,
            yearStats,
        ] = await Promise.all([
            getSalesForPeriod(today),
            getSalesForPeriod(yesterday, today),
            getSalesForPeriod(thisWeekStart),
            getSalesForPeriod(lastWeekStart, lastWeekEnd),
            getSalesForPeriod(thisMonthStart),
            getSalesForPeriod(lastMonthStart, lastMonthEnd),
            getSalesForPeriod(fourMonthsAgo),
            getSalesForPeriod(sixMonthsAgo),
            getSalesForPeriod(yearAgo),
        ]);

        // Get daily sales for last 7 days (for graph)
        const dailySalesData = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const nextDate = new Date(date);
            nextDate.setDate(date.getDate() + 1);

            const dayStats = await getSalesForPeriod(date, nextDate);
            dailySalesData.push({
                date: date.toISOString().split("T")[0],
                sales: dayStats.sales,
                orders: dayStats.orders,
            });
        }

        // Get all orders for general stats
        const allOrders = await Order.find({
            seller: sellerId,
            status: { $ne: "cancelled" },
        });

        let totalSales = 0;
        let completedOrders = 0;
        let pendingOrders = 0;
        const customerIds = new Set();

        allOrders.forEach((order) => {
            if (order.user) {
                customerIds.add(order.user.toString());
            }

            order.items.forEach((item) => {
                if (
                    productIds.some(
                        (id) => id.toString() === item.product.toString(),
                    )
                ) {
                    totalSales += item.price * item.quantity;
                }
            });

            if (order.status === "delivered") {
                completedOrders++;
            } else if (
                ["pending", "processing", "shipped"].includes(order.status)
            ) {
                pendingOrders++;
            }
        });

        // Get active customers (logged in within last 7 days) from users who have ordered from this seller
        const activeCustomers = await User.find({
            _id: { $in: Array.from(customerIds) },
            lastLoginAt: { $gte: last7Days },
        }).countDocuments();

        // Get abandoned cart statistics
        const abandonedCarts = await Cart.find({
            "items.product": { $in: productIds },
            lastUpdated: { $lt: last7Days },
        }).populate("user", "name email");

        let abandonedCartValue = 0;
        const abandonedCartCustomers = new Set();

        abandonedCarts.forEach((cart) => {
            if (cart.user) {
                abandonedCartCustomers.add(cart.user._id.toString());
            }
            // Calculate value only from seller's products
            cart.items.forEach((item) => {
                if (
                    productIds.some(
                        (id) => id.toString() === item.product.toString(),
                    )
                ) {
                    abandonedCartValue += item.price * item.quantity;
                }
            });
        });

        // Get product stats
        const [totalProducts, approvedProducts, pendingProducts] =
            await Promise.all([
                Product.countDocuments({ user: sellerId, deleted: false }),
                Product.countDocuments({
                    user: sellerId,
                    deleted: false,
                    approved: true,
                }),
                Product.countDocuments({
                    user: sellerId,
                    deleted: false,
                    approved: false,
                }),
            ]);

        // Get recent orders
        const recentOrders = await Order.find({
            "items.product": { $in: productIds },
        })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate("user", "name email")
            .populate("items.product", "name images")
            .select("_id orderId status total createdAt user items");

        return {
            seller: {
                id: seller._id,
                name: seller.name,
                email: seller.email,
                businessName: seller.business?.businessName || null,
                isApproved: seller.business?.approved || false,
                joinedAt: seller.createdAt,
            },
            stats: {
                products: {
                    total: totalProducts,
                    approved: approvedProducts,
                    pending: pendingProducts,
                },
                orders: {
                    total: allOrders.length,
                    completed: completedOrders,
                    pending: pendingOrders,
                },
                sales: {
                    totalAmount: totalSales,
                    currency: "NGN",
                },
                customers: {
                    total: customerIds.size,
                    active: activeCustomers, // Active in last 7 days (based on login)
                },
                abandonedCarts: {
                    count: abandonedCarts.length,
                    uniqueCustomers: abandonedCartCustomers.size,
                    totalValue: abandonedCartValue,
                    currency: "NGN",
                },
            },
            analytics: {
                today: {
                    sales: todayStats.sales,
                    orders: todayStats.orders,
                    salesChange: calculatePercentageChange(
                        todayStats.sales,
                        yesterdayStats.sales,
                    ),
                    ordersChange: calculatePercentageChange(
                        todayStats.orders,
                        yesterdayStats.orders,
                    ),
                },
                thisWeek: {
                    sales: thisWeekStats.sales,
                    orders: thisWeekStats.orders,
                    salesChange: calculatePercentageChange(
                        thisWeekStats.sales,
                        lastWeekStats.sales,
                    ),
                    ordersChange: calculatePercentageChange(
                        thisWeekStats.orders,
                        lastWeekStats.orders,
                    ),
                },
                thisMonth: {
                    sales: thisMonthStats.sales,
                    orders: thisMonthStats.orders,
                    salesChange: calculatePercentageChange(
                        thisMonthStats.sales,
                        lastMonthStats.sales,
                    ),
                    ordersChange: calculatePercentageChange(
                        thisMonthStats.orders,
                        lastMonthStats.orders,
                    ),
                },
                last4Months: {
                    sales: fourMonthsStats.sales,
                    orders: fourMonthsStats.orders,
                },
                last6Months: {
                    sales: sixMonthsStats.sales,
                    orders: sixMonthsStats.orders,
                },
                lastYear: {
                    sales: yearStats.sales,
                    orders: yearStats.orders,
                },
            },
            chartData: {
                dailySales: dailySalesData,
            },
            recentOrders: recentOrders.map((order) => ({
                id: order._id,
                orderNumber: order.orderId, // map schema field to response key
                status: order.status,
                totalAmount: order.total, // map schema field to response key
                createdAt: order.createdAt,
                customer: {
                    name: order.user?.name,
                    email: order.user?.email,
                },
                itemsCount: order.items.length,
            })),
        };
    };

    signUp = async (data) => {
        const user = await User.create(data);
        return user;
    };

    onBoarding = async (userId, data) => {
        const seller = await User.findById(userId);

        if (!seller) {
            throw new AppError("User not found", 404);
        }

        if (seller.business?.approved) {
            throw new AppError("Business already approved", 400);
        }

        if (data.personalDocument) {
            const personalDocument = await fileService.hasFile(data.personalDocument);
            if (!personalDocument) {
                throw new AppError("Personal document not found", 404);
            }
        }

        if (data.businessDocument) {
            const businessDocument = await fileService.hasFile(data.businessDocument);
            if (!businessDocument) {
                throw new AppError("Business document not found", 404);
            }
        }

        const user = {
            role: "seller",
            deleted: false,
            deletedAt: null,
            name: data.name,
            phoneNumber: data.phoneNumber,
            dob: data.dob,
            addresses: [
                {
                    fullName: data.name,
                    ...data.address,
                },
            ],
            bank: {
                bankName: data.bank.bankName,
                accountNumber: data.bank.accountNumber,
                accountName: data.bank.accountName,
                bankCode: data.bank.bankCode,
                bvn: data.bank.bvn,
            },
            business: {
                message: "",
                approved: false,
                businessName: data.businessName,
                businessType: data.businessType,
                businessAddress: {
                    fullName: data.name,
                    ...data.businessAddress,
                },
                businessPhone: data.businessPhone,
                businessEmail: data.businessEmail,
                documentType: data.documentType,
                personalDocument: data.personalDocument,
                businessDocument: data.businessDocument,
                storeLocation: data.storeLocation,
            },
        };
        return await User.updateOne({ _id: userId }, { $set: user });
    };

    getUserById = async (id) => {
        const user = await User.findOne({
            _id: id,
            role: "seller",
        })
            .select("+bank")
            .populate({
                path: "business",
                populate: [
                    { path: "personalDocument", model: "File" },
                    { path: "businessDocument", model: "File" },
                ],
            });

        if (user && user.wallet) {
            let changed = false;
            if (user.wallet.pendingBalance < 0) {
                user.wallet.pendingBalance = 0;
                changed = true;
            }
            if (user.wallet.balance < 0) {
                user.wallet.balance = 0;
                changed = true;
            }
            if (user.wallet.holdBalance < 0) {
                user.wallet.holdBalance = 0;
                changed = true;
            }
            if (changed) {
                await User.updateOne(
                    { _id: id },
                    {
                        $set: {
                            "wallet.pendingBalance": Math.max(0, user.wallet.pendingBalance || 0),
                            "wallet.balance": Math.max(0, user.wallet.balance || 0),
                            "wallet.holdBalance": Math.max(0, user.wallet.holdBalance || 0),
                        },
                    }
                );
            }
        }

        return user;
    };

    // Get comprehensive store statistics for a seller
    getStoreStats = async (sellerId) => {
        try {
            // Get seller's products
            const sellerProducts = await Product.find({
                user: sellerId,
                deleted: false,
            }).select("_id name basePrice promoPrice rating numReviews");

            const productIds = sellerProducts.map((p) => p._id);

            if (productIds.length === 0) {
                return {
                    totalSales: 0,
                    totalOrders: 0,
                    totalCustomers: 0,
                    totalProducts: 0,
                    averageRating: 0,
                    totalReviews: 0,
                    reviewPercentage: 0,
                    conversionRate: 0,
                    repeatCustomerRate: 0,
                };
            }

            // Get all orders containing seller's products
            const orders = await Order.find({
                "items.product": { $in: productIds },
                status: { $ne: "cancelled" },
            }).populate("user", "_id");

            // Calculate total sales and orders
            let totalSales = 0;
            let totalOrders = orders.length;
            const customerIds = new Set();
            const customerOrderCounts = new Map();

            orders.forEach((order) => {
                if (!order.user) return;
                const customerId = order.user._id.toString();
                customerIds.add(customerId);

                // Count orders per customer for repeat rate calculation
                customerOrderCounts.set(
                    customerId,
                    (customerOrderCounts.get(customerId) || 0) + 1,
                );

                order.items.forEach((item) => {
                    if (
                        productIds.some(
                            (id) => id.toString() === item.product.toString(),
                        )
                    ) {
                        totalSales += item.price * item.quantity;
                    }
                });
            });

            const totalCustomers = customerIds.size;

            // Calculate repeat customer rate
            const repeatCustomers = Array.from(
                customerOrderCounts.values(),
            ).filter((count) => count > 1).length;
            const repeatCustomerRate =
                totalCustomers > 0
                    ? Math.round((repeatCustomers / totalCustomers) * 100)
                    : 0;

            // Get all reviews for seller's products
            const reviews = await Review.find({
                product: { $in: productIds },
            }).select("rating product");

            const totalReviews = reviews.length;
            const averageRating =
                totalReviews > 0
                    ? Math.round(
                          (reviews.reduce(
                              (sum, review) => sum + review.rating,
                              0,
                          ) /
                              totalReviews) *
                              10,
                      ) / 10
                    : 0;

            // Calculate review percentage (reviews per product sold)
            const totalProductsSold = orders.reduce((total, order) => {
                return (
                    total +
                    order.items
                        .filter((item) =>
                            productIds.some(
                                (id) =>
                                    id.toString() === item.product.toString(),
                            ),
                        )
                        .reduce((sum, item) => sum + item.quantity, 0)
                );
            }, 0);

            const reviewPercentage =
                totalProductsSold > 0
                    ? Math.round((totalReviews / totalProductsSold) * 100)
                    : 0;

            // Calculate conversion rate based on product views vs purchases
            const productViews = await ProductViewed.find({
                product: { $in: productIds },
            });

            // Calculate total views (sum of all view counts)
            const totalViews = productViews.reduce(
                (total, view) => total + view.count,
                0,
            );

            // Calculate conversion rate: (unique customers who purchased / total unique viewers) * 100
            const uniqueViewers = new Set(
                productViews.map((view) => view.user.toString()),
            ).size;
            const conversionRate =
                uniqueViewers > 0
                    ? Math.round((totalCustomers / uniqueViewers) * 100 * 100) /
                      100 // Round to 2 decimal places
                    : 0;

            return {
                totalSales: Math.round(totalSales * 100) / 100,
                totalOrders,
                totalCustomers,
                totalProducts: sellerProducts.length,
                averageRating,
                totalReviews,
                reviewPercentage,
                conversionRate,
                repeatCustomerRate,
                // View-related metrics
                totalViews,
                uniqueViewers,
                // Additional metrics
                averageOrderValue:
                    totalOrders > 0
                        ? Math.round((totalSales / totalOrders) * 100) / 100
                        : 0,
                topRatedProducts: sellerProducts
                    .filter((p) => p.rating > 0)
                    .sort((a, b) => b.rating - a.rating)
                    .slice(0, 3)
                    .map((p) => ({
                        id: p._id,
                        name: p.name,
                        rating: p.rating,
                        reviews: p.numReviews,
                    })),
            };
        } catch (error) {
            console.error("Error calculating store stats:", error);
            throw new AppError("Failed to calculate store statistics", 500);
        }
    };
}

export default new SellerService();
