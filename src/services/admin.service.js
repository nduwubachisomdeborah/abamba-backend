import User from "../models/user.model.js";
import { AppError } from "../middlewares/error.js";
import adminPermissionService from "./adminPermission.service.js";
import Review from "../models/review.model.js";
import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import PlatformSettings from "../models/platformSettings.model.js";
import notificationService from "./notification.service.js";

class AdminService {
    async login(email, password) {
        const user = await User.findOne({ email, role: "admin" }).select(
            "+password",
        );

        if (!user || !(await user.correctPassword(password))) {
            throw new AppError("Incorrect email or password", 401);
        }

        user.lastLoginAt = new Date();
        await user.save();

        const token = user.generateAuthToken();
        const permissions = await adminPermissionService.getPermissions(
            user._id,
        );

        const userObject = user.toObject();
        delete userObject.password;

        return { user: userObject, token, permissions };
    }

    async createAdmin(adminData) {
        const {
            name,
            email,
            phoneNumber,
            password,
            pages = [],
            full = false,
            active = true,
            title,
        } = adminData;

        if (await User.findOne({ email, role: "admin" })) {
            throw new AppError("Admin with this email already exists", 400);
        }

        const adminUser = new User({
            name,
            email,
            phoneNumber,
            password,
            role: "admin",
            active,
            otp: { verified: true },
            title,
        });

        await adminUser.save();

        const permissions = await adminPermissionService.setPermissions(
            adminUser._id,
            pages,
            full,
        );

        const userObj = adminUser.toObject();
        delete userObj.password;

        return { user: userObj, permissions };
    }

    async updateAdmin(adminId, updateData) {
        const {
            name,
            email,
            phoneNumber,
            password,
            pages,
            full,
            active,
            title,
        } = updateData;

        const adminUser = await User.findById(adminId);
        if (!adminUser || adminUser.role !== "admin") {
            throw new AppError("Admin not found", 404);
        }

        if (name !== undefined) adminUser.name = name;
        if (email !== undefined) adminUser.email = email;
        if (phoneNumber !== undefined) adminUser.phoneNumber = phoneNumber;
        if (password !== undefined) adminUser.password = password;
        if (active !== undefined) adminUser.active = active;
        if (title !== undefined) adminUser.title = title;

        await adminUser.save();

        let permissions;
        if (pages !== undefined || full !== undefined) {
            const existingPermissions =
                await adminPermissionService.getPermissions(adminUser._id);
            permissions = await adminPermissionService.setPermissions(
                adminUser._id,
                pages !== undefined ? pages : existingPermissions.pages,
                full !== undefined ? full : existingPermissions.full,
            );
        } else {
            permissions = await adminPermissionService.getPermissions(
                adminUser._id,
            );
        }

        const userObj = adminUser.toObject();
        delete userObj.password;

        return { user: userObj, permissions };
    }

    async deleteAdmin(adminId) {
        const adminUser = await User.findById(adminId).select("+active");
        if (!adminUser || adminUser.role !== "admin") {
            throw new AppError("Admin not found", 404);
        }

        adminUser.deleted = true;
        adminUser.deletedAt = new Date();
        adminUser.active = false;
        await adminUser.save();
    }

    async getAllUsers(page = 1, limit = 10, search = "") {
        const skip = (page - 1) * limit;
        const query = { role: "user", deleted: { $ne: true }, isGuest: false };

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { phoneNumber: { $regex: search, $options: "i" } },
            ];
        }

        const users = await User.find(query)
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const totalUsers = await User.countDocuments(query);

        return {
            users,
            totalPages: Math.ceil(totalUsers / limit),
            currentPage: page,
            totalUsers,
        };
    }

    async getAllSellers(page = 1, limit = 10, search = "") {
        const skip = (page - 1) * limit;
        const query = {
            $or: [
                { role: "seller" },
                { "business.businessName": { $exists: true, $ne: "" } },
            ],
            deleted: { $ne: true },
        };

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { phoneNumber: { $regex: search, $options: "i" } },
            ];
        }

        const sellers = await User.find(query)
            .select("+business +bank")
            .populate("business.personalDocument")
            .populate("business.businessDocument")
            .populate("business.storeLocation")
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const sellerIds = sellers.map((seller) => seller._id);

        let totalSalesBySeller = {};
        if (sellerIds.length > 0) {
            const salesAggregation = await Order.aggregate([
                {
                    $match: {
                        seller: { $in: sellerIds },
                        deleted: { $ne: true },
                        "payment.status": "completed",
                    },
                },
                {
                    $group: {
                        _id: "$seller",
                        totalAmount: { $sum: "$payment.amount" },
                    },
                },
            ]);

            totalSalesBySeller = salesAggregation.reduce(
                (acc, { _id, totalAmount }) => {
                    acc[_id.toString()] = totalAmount;
                    return acc;
                },
                {},
            );
        }

        const sellersWithTotals = sellers.map((seller) => {
            const sellerObj = seller.toObject();
            sellerObj.totalSalesAmount =
                totalSalesBySeller[seller._id.toString()] || 0;
            return sellerObj;
        });

        const [totalSellers, activeSellers, pendingApprovals, suspendedSellers] =
            await Promise.all([
                User.countDocuments(query),
                User.countDocuments({
                    ...query,
                    "business.approved": true,
                    suspended: { $ne: true },
                }),
                User.countDocuments({
                    ...query,
                    "business.approved": false,
                }),
                User.countDocuments({
                    ...query,
                    suspended: true,
                }),
            ]);

        return {
            sellers: sellersWithTotals,
            totalPages: Math.ceil(totalSellers / limit),
            currentPage: page,
            totalSellers,
            total: totalSellers,
            activeSellers,
            pendingApprovals,
            suspendedSellers,
            stats: {
                totalSellers,
                activeSellers,
                pendingApprovals,
                suspendedSellers,
            },
        };
    }

    async getAllAdmins(page = 1, limit = 10, search = "") {
        const skip = (page - 1) * limit;
        const query = { role: "admin", deleted: { $ne: true } };

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { phoneNumber: { $regex: search, $options: "i" } },
            ];
        }

        const adminDocs = await User.find(query)
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })
            .select("-password +title +active");

        const totalAdmins = await User.countDocuments(query);

        const admins = await Promise.all(
            adminDocs.map(async (adminDoc) => {
                const admin = adminDoc.toObject();
                const permissions = await adminPermissionService.getPermissions(
                    admin._id,
                );

                return { ...admin, permissions };
            }),
        );

        return {
            admins,
            totalPages: Math.ceil(totalAdmins / limit),
            currentPage: page,
            totalAdmins,
        };
    }

    async getAllProducts(options = {}) {
        const { page = 1, limit = 10, search = "", status, approved } = options;

        const pageNumber = Number.isNaN(Number(page)) ? 1 : parseInt(page);
        const limitNumber = Number.isNaN(Number(limit)) ? 10 : parseInt(limit);
        const skip = (pageNumber - 1) * limitNumber;

        const query = { deleted: { $ne: true } };

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { brand: { $regex: search, $options: "i" } },
            ];
        }

        if (status) {
            query.status = status;
        }

        if (approved !== undefined) {
            if (approved === "true") {
                query.approved = true;
            } else if (approved === "false") {
                query.approved = false;
            }
        }

        const [products, totalProducts] = await Promise.all([
            Product.find(query)
                .populate({ path: "user", select: "name email" })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNumber),
            Product.countDocuments(query),
        ]);

        const productsWithSeller = products.map((product) => {
            const productObj = product.toObject();
            productObj.seller = product.user
                ? {
                      id: product.user._id,
                      name: product.user.name,
                      email: product.user.email,
                  }
                : null;
            return productObj;
        });

        return {
            products: productsWithSeller,
            totalPages: Math.ceil(totalProducts / limitNumber) || 0,
            currentPage: pageNumber,
            totalProducts,
        };
    }

    async getSellerInfo(sellerId) {
        const seller = await User.findById(sellerId)
            .select("+business +bank")
            .populate("business.personalDocument")
            .populate("business.businessDocument")
            .populate("business.storeLocation")
            .lean();
        if (!seller) {
            throw new AppError("Seller not found", 404);
        }
        return seller;
    }

    async getAllOrders(options = {}) {
        const { page = 1, limit = 10, search = "", status } = options;

        const pageNumber = parseInt(page);
        const limitNumber = parseInt(limit);
        const skip = (pageNumber - 1) * limitNumber;

        const query = { deleted: { $ne: true } };

        if (search) {
            query.$or = [
                { orderId: { $regex: search, $options: "i" } },
                { status: { $regex: search, $options: "i" } },
                {
                    "shippingAddress.fullName": {
                        $regex: search,
                        $options: "i",
                    },
                },
            ];
        }

        if (status) {
            query.status = status;
        }

        const aggregation = [
            { $match: query },
            {
                $addFields: {
                    sortPriority: {
                        $cond: {
                            if: { $eq: ["$status", "processing"] },
                            then: 0,
                            else: 1,
                        },
                    },
                },
            },
            { $sort: { sortPriority: 1, createdAt: -1 } },
            { $skip: skip },
            { $limit: limitNumber },
            {
                $lookup: {
                    from: "users",
                    localField: "user",
                    foreignField: "_id",
                    as: "user",
                },
            },
            { $unwind: "$user" },
            {
                $project: {
                    "user.password": 0,
                    "user.otp": 0,
                    sortPriority: 0,
                },
            },
        ];

        const orders = await Order.aggregate(aggregation);
        const totalOrders = await Order.countDocuments(query);

        return {
            orders,
            totalPages: Math.ceil(totalOrders / limitNumber),
            currentPage: pageNumber,
            totalOrders,
        };
    }

    async getOrder(orderId) {
        let order;

        // Check if orderId is a number (sequential ID) or ObjectId
        const isNumeric = !isNaN(orderId) && !isNaN(parseFloat(orderId));

        if (isNumeric) {
            order = await Order.findOne({ orderId: Number(orderId) })
                .populate("user", "name email phoneNumber")
                .populate("shipment")
                .populate("seller", "name email business");
        } else {
            order = await Order.findById(orderId)
                .populate("user", "name email phoneNumber")
                .populate("shipment")
                .populate("seller", "name email business");
        }

        if (!order) {
            throw new AppError("Order not found", 404);
        }

        return order;
    }

    async getSellerOrders(sellerId, options = {}) {
        const {
            page = 1,
            limit = 10,
            search = "",
            sortBy = "createdAt",
            sortOrder = "desc",
        } = options;
        const query = { seller: sellerId, deleted: { $ne: true } };

        if (search) {
            query.$or = [
                { orderId: { $regex: search, $options: "i" } },
                { status: { $regex: search, $options: "i" } },
                {
                    "shippingAddress.fullName": {
                        $regex: search,
                        $options: "i",
                    },
                },
            ];
        }

        const sortOptions = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

        const orders = await Order.find(query)
            .populate("user", "name email")
            .sort(sortOptions)
            .skip((page - 1) * limit)
            .limit(limit);
        const totalOrders = await Order.countDocuments(query);

        return {
            data: orders,
            totalPages: Math.ceil(totalOrders / limit),
            currentPage: page,
            total: totalOrders,
        };
    }

    async getSellerReviews(sellerId, options = {}) {
        const {
            page = 1,
            limit = 10,
            search = "",
            sortBy = "createdAt",
            sortOrder = "desc",
        } = options;
        const sellerProducts = await Product.find({ user: sellerId }).select(
            "_id",
        );
        const productIds = sellerProducts.map((p) => p._id);
        const query = { product: { $in: productIds } };

        if (search) {
            // To search by user or product name, we need to get their IDs first
            const users = await User.find({
                name: { $regex: search, $options: "i" },
            }).select("_id");
            const userIds = users.map((u) => u._id);

            const products = await Product.find({
                name: { $regex: search, $options: "i" },
            }).select("_id");
            const searchedProductIds = products.map((p) => p._id);

            query.$or = [
                { comment: { $regex: search, $options: "i" } },
                { user: { $in: userIds } },
                { product: { $in: searchedProductIds } },
            ];
        }

        const sortOptions = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

        console.log({ query });

        const reviews = await Review.find(query)
            .populate("user", "name")
            .populate("product", "name")
            .sort(sortOptions)
            .skip((page - 1) * limit)
            .limit(limit);
        const totalReviews = await Review.countDocuments(query);

        return {
            data: reviews,
            totalPages: Math.ceil(totalReviews / limit),
            currentPage: page,
            total: totalReviews,
        };
    }

    async getSellerPayments(sellerId, options = {}) {
        const {
            page = 1,
            limit = 10,
            search = "",
            sortBy = "createdAt",
            sortOrder = "desc",
        } = options;
        const query = {
            seller: sellerId,
            "payment.status": "completed",
            deleted: { $ne: true },
        };

        if (search) {
            query.$or = [
                { "payment.transactionId": { $regex: search, $options: "i" } },
                { "payment.paymentMethod": { $regex: search, $options: "i" } },
            ];
        }

        const sortOptions = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

        const payments = await Order.find(query)
            .select("payment user createdAt")
            .populate("user", "name email")
            .sort(sortOptions)
            .skip((page - 1) * limit)
            .limit(limit);
        const totalPayments = await Order.countDocuments(query);

        return {
            data: payments.map((p) => p.payment),
            totalPages: Math.ceil(totalPayments / limit),
            currentPage: page,
            total: totalPayments,
        };
    }

    async updateSellerApproval(sellerId, { approved, message = "" }) {
        const seller = await User.findById(sellerId).select("+business");

        if (!seller || seller.role !== "seller") {
            throw new AppError("Seller not found", 404);
        }

        if (!seller.business) {
            throw new AppError(
                "Seller business information is incomplete",
                400,
            );
        }

        seller.business.approved = approved;
        seller.business.message = approved ? "" : message;

        await seller.save();

        // Notify seller of approval/rejection
        const title = approved
            ? "Business approved!"
            : "Business application update";
        const description = approved
            ? "Congratulations! Your business has been approved. You can now start listing products."
            : `Your business application was not approved.\n\n**Reason:** ${message}`;
        await notificationService.send(sellerId, title, description);

        const sellerObj = seller.toObject();
        delete sellerObj.password;

        return sellerObj;
    }

    async approveProduct(productId, adminId) {
        const product = await Product.findById(productId).select(
            "+approved +status +approvedAt +approvedBy +rejectedAt +rejectedBy +rejectedReason",
        );

        if (!product) {
            throw new AppError("Product not found", 404);
        }

        product.approved = true;
        product.status = "approved";
        product.approvedAt = new Date();
        product.approvedBy = adminId;
        product.rejectedAt = null;
        product.rejectedBy = null;
        product.rejectedReason = null;

        await product.save();

        // Notify seller of product approval
        await notificationService.send(
            product.user,
            "Product approved!",
            `Your product **"${product.name}"** has been approved and is now live.`,
        );

        return product;
    }

    async rejectProduct(productId, adminId, message) {
        const rejectionMessage = message?.trim();

        if (!rejectionMessage) {
            throw new AppError("Rejection message is required", 400);
        }

        const product = await Product.findById(productId).select(
            "+approved +status +approvedAt +approvedBy +rejectedAt +rejectedBy +rejectedReason",
        );

        if (!product) {
            throw new AppError("Product not found", 404);
        }

        product.approved = false;
        product.status = "rejected";
        product.approvedAt = null;
        product.approvedBy = null;
        product.rejectedAt = new Date();
        product.rejectedBy = adminId;
        product.rejectedReason = rejectionMessage;

        await product.save();

        // Notify seller of product rejection
        await notificationService.send(
            product.user,
            "Product not approved",
            `Your product **"${product.name}"** was not approved.\n\n**Reason:** ${rejectionMessage}`,
        );

        return product;
    }

    async suspendUser(userId) {
        const user = await User.findById(userId);
        if (!user) {
            throw new AppError("User not found", 404);
        }
        user.suspended = true;
        await user.save();

        // Notify user of suspension
        await notificationService.send(
            userId,
            "Account suspended",
            "Your account has been suspended. Please contact support for more information.",
        );

        return user;
    }

    async unsuspendUser(userId) {
        const user = await User.findById(userId);
        if (!user) {
            throw new AppError("User not found", 404);
        }
        user.suspended = false;
        await user.save();

        // Notify user of account reactivation
        await notificationService.send(
            userId,
            "Account reactivated",
            "Your account has been reactivated. You can now access your account normally.",
        );

        return user;
    }

    async deleteUser(userId) {
        const user = await User.findById(userId);
        if (!user) {
            throw new AppError("User not found", 404);
        }
        user.deleted = true;
        user.deletedAt = new Date();
        await user.save();
    }

    async getPlatformSettings() {
        const settings = await PlatformSettings.getInstance();
        return settings;
    }

    async updatePlatformSettings(updateData) {
        const settings = await PlatformSettings.getInstance();

        // Update top-level fields
        const topLevelFields = [
            "platformName",
            "platformUrl",
            "adminEmail",
            "supportEmail",
            "contactInfo",
            "timeZone",
            "logo",
            "favicon",
        ];

        topLevelFields.forEach((field) => {
            if (updateData[field] !== undefined) {
                settings[field] = updateData[field];
            }
        });

        // Update nested objects (merge with existing values)
        if (updateData.socialMedia) {
            settings.socialMedia = {
                ...(settings.socialMedia?.toObject?.() ||
                    settings.socialMedia ||
                    {}),
                ...updateData.socialMedia,
            };
        }

        if (updateData.systemPreferences) {
            settings.systemPreferences = {
                ...(settings.systemPreferences?.toObject?.() ||
                    settings.systemPreferences ||
                    {}),
                ...updateData.systemPreferences,
            };
        }

        if (updateData.security) {
            settings.security = {
                ...(settings.security?.toObject?.() || settings.security || {}),
                ...updateData.security,
            };

            // Handle nested passwordPolicy
            if (updateData.security.passwordPolicy) {
                settings.security.passwordPolicy = {
                    ...(settings.security?.passwordPolicy?.toObject?.() ||
                        settings.security?.passwordPolicy ||
                        {}),
                    ...updateData.security.passwordPolicy,
                };
            }
        }

        // Update legal documents
        if (updateData.termsOfUse) {
            settings.termsOfUse = {
                ...(settings.termsOfUse?.toObject?.() ||
                    settings.termsOfUse ||
                    {}),
                ...updateData.termsOfUse,
            };

            // Auto-update lastUpdated if content is being updated
            if (updateData.termsOfUse.content !== undefined) {
                settings.termsOfUse.lastUpdated = new Date();
            }
        }

        if (updateData.privacyPolicy) {
            settings.privacyPolicy = {
                ...(settings.privacyPolicy?.toObject?.() ||
                    settings.privacyPolicy ||
                    {}),
                ...updateData.privacyPolicy,
            };

            // Auto-update lastUpdated if content is being updated
            if (updateData.privacyPolicy.content !== undefined) {
                settings.privacyPolicy.lastUpdated = new Date();
            }
        }

        // Update Contact Us page
        if (updateData.contactUs) {
            const existingContactUs =
                settings.contactUs?.toObject?.() || settings.contactUs || {};

            settings.contactUs = {
                heroSection: {
                    ...(existingContactUs.heroSection || {}),
                    ...(updateData.contactUs.heroSection || {}),
                },
                storeLocation: {
                    ...(existingContactUs.storeLocation || {}),
                    ...(updateData.contactUs.storeLocation || {}),
                },
                contactCall: {
                    ...(existingContactUs.contactCall || {}),
                    ...(updateData.contactUs.contactCall || {}),
                },
                contactEmail: {
                    ...(existingContactUs.contactEmail || {}),
                    ...(updateData.contactUs.contactEmail || {}),
                },
            };
        }

        // Update Home Page Banners
        if (updateData.homePage) {
            const existingHomePage =
                settings.homePage?.toObject?.() || settings.homePage || {};

            settings.homePage = {
                banners:
                    updateData.homePage.banners !== undefined
                        ? updateData.homePage.banners
                        : existingHomePage.banners || [],
                featuredBanners:
                    updateData.homePage.featuredBanners !== undefined
                        ? updateData.homePage.featuredBanners
                        : existingHomePage.featuredBanners || [],
            };
        }

        await settings.save();
        return settings;
    }
}

export default new AdminService();
