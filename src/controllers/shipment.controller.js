import shipmentService from "../services/shipment.service.js";
import { asyncHandler } from "../middlewares/error.js";
import { successResponse, errorResponse } from "../utils/response.util.js";

class ShipmentController {
    /**
     * @desc    Track shipment by tracking number (public endpoint)
     * @route   GET /api/v1/shipments/tracking/:trackingNumber
     * @access  Public
     */
    static getShipmentByTracking = asyncHandler(async (req, res) => {
        const { trackingNumber } = req.params;

        const shipment =
            await shipmentService.getShipmentByTracking(trackingNumber);

        return successResponse(
            res,
            "Shipment tracking information retrieved successfully",
            shipment,
        );
    });

    /**
     * @desc    Get all shipments with pagination and filtering
     * @route   GET /api/v1/shipments
     * @access  Private (User sees their shipments, Seller sees shipments with their products, Admin sees all)
     */
    static getShipments = asyncHandler(async (req, res) => {
        const { shipments, pagination } = await shipmentService.getShipments(
            req.query,
            req.user.id,
            req.user.role,
        );

        return successResponse(res, "Shipments retrieved successfully", {
            shipments,
            pagination,
        });
    });

    /**
     * @desc    Get shipment by ID
     * @route   GET /api/v1/shipments/:id
     * @access  Private (User sees their shipment, Seller sees shipment with their products, Admin sees all)
     */
    static getShipmentById = asyncHandler(async (req, res) => {
        const shipment = await shipmentService.getShipmentById(
            req.params.id,
            req.user.id,
            req.user.role,
        );

        return successResponse(
            res,
            "Shipment retrieved successfully",
            shipment,
        );
    });

    /**
     * @desc    Create a new shipment
     * @route   POST /api/v1/shipments
     * @access  Private/Admin
     */
    static createShipment = asyncHandler(async (req, res) => {
        const shipment = await shipmentService.createShipment(
            req.body,
            req.user.id,
            req.user.role,
        );

        return successResponse(res, "Shipment created successfully", shipment);
    });

    /**
     * @desc    Add tracking update to shipment
     * @route   POST /api/v1/shipments/:id/tracking
     * @access  Private/Admin
     */
    static addTrackingUpdate = asyncHandler(async (req, res) => {
        const shipment = await shipmentService.addTrackingUpdate(
            req.params.id,
            req.body,
            req.user.id,
            req.user.role,
        );

        return successResponse(
            res,
            "Tracking update added successfully",
            shipment,
        );
    });

    /**
     * @desc    Update shipment
     * @route   PATCH /api/v1/shipments/:id
     * @access  Private/Admin
     */
    static updateShipment = asyncHandler(async (req, res) => {
        if (req.user.role !== "admin") {
            return errorResponse(
                res,
                "Not authorized to update shipments",
                403,
            );
        }

        const shipment = await shipmentService.updateShipment(
            req.params.id,
            req.body,
        );

        return successResponse(res, "Shipment updated successfully", shipment);
    });

    /**
     * @desc    Delete shipment (soft delete)
     * @route   DELETE /api/v1/shipments/:id
     * @access  Private/Admin
     */
    static deleteShipment = asyncHandler(async (req, res) => {
        if (req.user.role !== "admin") {
            return errorResponse(
                res,
                "Not authorized to delete shipments",
                403,
            );
        }

        await shipmentService.deleteShipment(req.params.id);

        return successResponse(res, "Shipment deleted successfully", null);
    });

    static getCarriers = asyncHandler(async (req, res) => {
        const { productId, shippingAddressId, variantId, quantity, state } = {
            ...req.query,
            ...req.body,
        };
        const userId = req.user?.id || null;

        const carriers = await shipmentService.getCarriers(
            userId,
            shippingAddressId,
            productId,
            variantId,
            quantity,
            state,
        );

        return successResponse(
            res,
            "Carriers retrieved successfully",
            carriers,
        );
    });

    static webhookShipment = asyncHandler(async (req, res) => {
        await shipmentService.handleWebhookShipment(req.body);

        return successResponse(
            res,
            "Shipment tracking information updated successfully",
            null,
        );
    });
}

export default ShipmentController;
