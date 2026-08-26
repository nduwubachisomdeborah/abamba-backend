import { asyncHandler } from "../middlewares/error.js";
import { successResponse } from "../utils/response.util.js";
import adminService from "../services/admin.service.js";
import adminPermissionService from "../services/adminPermission.service.js";
import adminStatsService from "../services/adminStats.service.js";
import transactionService from "../services/transaction.service.js";
import shipBubbleService from "../services/shiping/shipbubble.service.js";
import storeLocationService from "../services/storeLocation.service.js";
import CourierService from "../models/courierService.model.js";
import Transaction from "../models/transaction.model.js";
import Order from "../models/order.model.js";
import Shipment from "../models/shipment.model.js";

class AdminController {
    static login = asyncHandler(async (req, res) => {
        const { email, password } = req.body;
        const data = await adminService.login(email, password);
        return successResponse(res, "Admin login successful", data);
    });

    static getProfile = asyncHandler(async (req, res) => {
        return successResponse(res, "Admin profile retrieved", {
            user: req.user,
        });
    });

    static getPermissions = asyncHandler(async (req, res) => {
        const permissions = await adminPermissionService.getPermissions(
            req.user.id,
        );
        return successResponse(res, "Permissions retrieved", permissions);
    });

    static setPermissions = asyncHandler(async (req, res) => {
        const { pages, full } = req.body;
        const updated = await adminPermissionService.setPermissions(
            req.user.id,
            pages,
            full,
        );
        return successResponse(res, "Permissions updated", updated);
    });

    static createAdmin = asyncHandler(async (req, res) => {
        const data = await adminService.createAdmin(req.body);
        return successResponse(res, "Admin created successfully", data);
    });

    static updateAdmin = asyncHandler(async (req, res) => {
        const data = await adminService.updateAdmin(req.params.id, req.body);
        return successResponse(res, "Admin updated successfully", data);
    });

    static deleteAdmin = asyncHandler(async (req, res) => {
        await adminService.deleteAdmin(req.params.id);
        return successResponse(res, "Admin deleted successfully", null);
    });

    static getStats = asyncHandler(async (req, res) => {
        const stats = await adminStatsService.getStats();
        return successResponse(res, "Admin statistics retrieved", stats);
    });

    static getAllUsers = asyncHandler(async (req, res) => {
        const { page = 1, limit = 10, search = "" } = req.query;
        const data = await adminService.getAllUsers(
            parseInt(page),
            parseInt(limit),
            search,
        );
        return successResponse(res, "Users retrieved successfully", data);
    });

    static getAllSellers = asyncHandler(async (req, res) => {
        const { page = 1, limit = 10, search = "" } = req.query;
        const data = await adminService.getAllSellers(
            parseInt(page),
            parseInt(limit),
            search,
        );
        return successResponse(res, "Sellers retrieved successfully", data);
    });

    static getAllAdmins = asyncHandler(async (req, res) => {
        const { page = 1, limit = 10, search = "" } = req.query;
        const data = await adminService.getAllAdmins(
            parseInt(page),
            parseInt(limit),
            search,
        );
        return successResponse(res, "Admins retrieved successfully", data);
    });

    static getAllProducts = asyncHandler(async (req, res) => {
        const {
            page = 1,
            limit = 10,
            search = "",
            status,
            approved,
        } = req.query;

        const data = await adminService.getAllProducts({
            page,
            limit,
            search,
            status,
            approved,
        });

        return successResponse(res, "Products retrieved successfully", data);
    });

    static getAllOrders = asyncHandler(async (req, res) => {
        const { page = 1, limit = 10, search = "", status } = req.query;

        const data = await adminService.getAllOrders({
            page,
            limit,
            search,
            status,
        });

        return successResponse(res, "Orders retrieved successfully", data);
    });

    static getOrder = asyncHandler(async (req, res) => {
        const data = await adminService.getOrder(req.params.id);
        return successResponse(res, "Order retrieved successfully", data);
    });

    static suspendUser = asyncHandler(async (req, res) => {
        const user = await adminService.suspendUser(req.params.id);
        return successResponse(res, "User suspended successfully", user);
    });

    static unsuspendUser = asyncHandler(async (req, res) => {
        const user = await adminService.unsuspendUser(req.params.id);
        return successResponse(res, "User unsuspended successfully", user);
    });

    static deleteUser = asyncHandler(async (req, res) => {
        await adminService.deleteUser(req.params.id);
        return successResponse(res, "User deleted successfully", null);
    });

    static getSellerInfo = asyncHandler(async (req, res) => {
        const data = await adminService.getSellerInfo(req.params.id);
        return successResponse(res, "Seller info retrieved successfully", data);
    });

    static getSellerOrders = asyncHandler(async (req, res) => {
        const {
            page = 1,
            limit = 10,
            search = "",
            sortBy = "createdAt",
            sortOrder = "desc",
        } = req.query;
        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            search,
            sortBy,
            sortOrder,
        };
        const data = await adminService.getSellerOrders(req.params.id, options);
        return successResponse(
            res,
            "Seller orders retrieved successfully",
            data,
        );
    });

    static getSellerReviews = asyncHandler(async (req, res) => {
        const {
            page = 1,
            limit = 10,
            search = "",
            sortBy = "createdAt",
            sortOrder = "desc",
        } = req.query;
        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            search,
            sortBy,
            sortOrder,
        };
        const data = await adminService.getSellerReviews(
            req.params.id,
            options,
        );
        return successResponse(
            res,
            "Seller reviews retrieved successfully",
            data,
        );
    });

    static getSellerPayments = asyncHandler(async (req, res) => {
        const {
            page = 1,
            limit = 10,
            search = "",
            sortBy = "createdAt",
            sortOrder = "desc",
        } = req.query;
        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            search,
            sortBy,
            sortOrder,
        };
        const data = await adminService.getSellerPayments(
            req.params.id,
            options,
        );
        return successResponse(
            res,
            "Seller payments retrieved successfully",
            data,
        );
    });

    static updateSellerApproval = asyncHandler(async (req, res) => {
        const data = await adminService.updateSellerApproval(
            req.params.id,
            req.body,
        );
        const message = req.body.approved
            ? "Seller approved successfully"
            : "Seller rejected successfully";
        return successResponse(res, message, data);
    });

    static approveProduct = asyncHandler(async (req, res) => {
        const product = await adminService.approveProduct(
            req.params.productId,
            req.user.id,
        );

        return successResponse(res, "Product approved successfully", product);
    });

    static rejectProduct = asyncHandler(async (req, res) => {
        const product = await adminService.rejectProduct(
            req.params.productId,
            req.user.id,
            req.body.message,
        );

        return successResponse(res, "Product rejected successfully", product);
    });

    static getPlatformSettings = asyncHandler(async (req, res) => {
        const settings = await adminService.getPlatformSettings();
        return successResponse(
            res,
            "Platform settings retrieved successfully",
            settings,
        );
    });

    static updatePlatformSettings = asyncHandler(async (req, res) => {
        const settings = await adminService.updatePlatformSettings(req.body);
        return successResponse(
            res,
            "Platform settings updated successfully",
            settings,
        );
    });

    // Payout management methods
    static getPendingPayouts = asyncHandler(async (req, res) => {
        const pendingPayouts = await transactionService.getUserTransactions(
            null,
            { type: "payout", status: "pending" },
        );
        return successResponse(
            res,
            "Pending payouts retrieved successfully",
            pendingPayouts,
        );
    });

    static approvePayout = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const updatedTransaction = await transactionService.processPayout(
            id,
            "completed",
        );
        return successResponse(
            res,
            "Payout approved successfully",
            updatedTransaction,
        );
    });

    static rejectPayout = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { reason } = req.body;
        const updatedTransaction = await transactionService.processPayout(
            id,
            "failed",
            { failureReason: reason },
        );
        return successResponse(
            res,
            "Payout rejected successfully",
            updatedTransaction,
        );
    });

    static getPayoutStats = asyncHandler(async (req, res) => {
        const stats = await Transaction.aggregate([
            {
                $match: { type: "payout" },
            },
            {
                $group: {
                    _id: null,
                    totalPayoutAmount: { $sum: "$amount" },
                    totalPayoutCount: { $sum: 1 },
                    totalPendingPayouts: {
                        $sum: {
                            $cond: {
                                if: { $eq: ["$status", "pending"] },
                                then: "$amount",
                                else: 0,
                            },
                        },
                    },
                    pendingPayoutCount: {
                        $sum: {
                            $cond: {
                                if: { $eq: ["$status", "pending"] },
                                then: 1,
                                else: 0,
                            },
                        },
                    },
                },
            },
        ]);

        const payoutStats = stats[0] || {
            totalPayoutAmount: 0,
            totalPayoutCount: 0,
            totalPendingPayouts: 0,
            pendingPayoutCount: 0,
        };

        return successResponse(
            res,
            "Payout statistics retrieved successfully",
            payoutStats,
        );
    });

    static getCouriers = asyncHandler(async (req, res) => {
        const couriers = await CourierService.find();
        return successResponse(
            res,
            "Couriers retrieved successfully",
            couriers,
        );
    });

    static toggleCourier = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const courier = await CourierService.findById(id);

        if (!courier) {
            throw new Error("Courier not found");
        }

        courier.enabled = !courier.enabled;
        await courier.save();

        return successResponse(
            res,
            `Courier ${courier.enabled ? "enabled" : "disabled"} successfully`,
            courier,
        );
    });

    static getOrderCarriers = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const rates = await shipBubbleService.getOrderCarriers(id);
        return successResponse(
            res,
            "Shipping rates retrieved successfully",
            rates,
        );
    });

    static createShipment = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { request_token, service_code, courier_id, courier_name } =
            req.body;

        const order = await Order.findById(id);
        if (!order) {
            throw new Error("Order not found");
        }

        const shipmentData = await shipBubbleService.createShipment({
            request_token,
            service_code,
            courier_id,
        });

        // Create local shipment record
        const shipment = new Shipment({
            orders: [order._id],
            carrier: courier_name || shipmentData.courier?.name,
            trackingNumber: shipmentData.order_id,
            trackingUrl: shipmentData.tracking_url,
            status: "pending",
            shippingMethod: "standard", // Default
            shippingCost: shipmentData.payment?.shipping_fee || 0,
            notes: `Courier: ${courier_name || shipmentData.courier?.name}`,
        });

        await shipment.save();

        // Update order with shipment reference and change status
        order.shipment = shipment._id;
        order.status = "shipped"; // Marking as shipped since label is created
        await order.save();

        return successResponse(
            res,
            "Shipment created successfully",
            shipmentData,
        );
    });

    static createStoreLocation = asyncHandler(async (req, res) => {
        const data = await storeLocationService.createStoreLocation(req.body);
        return successResponse(
            res,
            "Store location created successfully",
            data,
        );
    });

    static getAllStoreLocations = asyncHandler(async (req, res) => {
        const data = await storeLocationService.getAllStoreLocations(req.query);
        return successResponse(
            res,
            "Store locations retrieved successfully",
            data,
        );
    });

    static getStoreLocation = asyncHandler(async (req, res) => {
        const data = await storeLocationService.getStoreLocationById(
            req.params.id,
        );
        return successResponse(
            res,
            "Store location retrieved successfully",
            data,
        );
    });

    static updateStoreLocation = asyncHandler(async (req, res) => {
        const data = await storeLocationService.updateStoreLocation(
            req.params.id,
            req.body,
        );
        return successResponse(
            res,
            "Store location updated successfully",
            data,
        );
    });

    static deleteStoreLocation = asyncHandler(async (req, res) => {
        await storeLocationService.deleteStoreLocation(req.params.id);
        return successResponse(
            res,
            "Store location deleted successfully",
            null,
        );
    });
}

export default AdminController;
