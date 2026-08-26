import storeLocationService from "../services/storeLocation.service.js";
import { asyncHandler } from "../middlewares/error.js";
import {
    sendResponse,
    successResponse,
    errorResponse,
} from "../utils/response.util.js";

class StoreLocationController {
    /**
     * @desc    Get all store locations
     * @route   GET /api/v1/store-locations
     * @access  Public
     */
    static getAllStoreLocations = asyncHandler(async (req, res) => {
        const { includeDisabled } = req.query;
        
        const filters = {};
        if (includeDisabled === 'true') {
            // Include both enabled and disabled locations
            delete filters.disabled;
        }

        const storeLocations = await storeLocationService.getAllStoreLocations(filters);

        return successResponse(res, "Store locations retrieved successfully", {
            storeLocations,
            count: storeLocations.length,
        });
    });

    /**
     * @desc    Get store location by ID
     * @route   GET /api/v1/store-locations/:id
     * @access  Public
     */
    static getStoreLocationById = asyncHandler(async (req, res) => {
        const { id } = req.params;

        const storeLocation = await storeLocationService.getStoreLocationById(id);

        return successResponse(res, "Store location retrieved successfully", {
            storeLocation,
        });
    });

    /**
     * @desc    Get store location by address code
     * @route   GET /api/v1/store-locations/address/:addressCode
     * @access  Public
     */
    static getStoreLocationByAddressCode = asyncHandler(async (req, res) => {
        const { addressCode } = req.params;

        const storeLocation = await storeLocationService.getStoreLocationByAddressCode(addressCode);

        return successResponse(res, "Store location retrieved successfully", {
            storeLocation,
        });
    });

    /**
     * @desc    Get enabled store locations only
     * @route   GET /api/v1/store-locations/enabled
     * @access  Public
     */
    static getEnabledStoreLocations = asyncHandler(async (req, res) => {
        const storeLocations = await storeLocationService.getEnabledStoreLocations();

        return successResponse(res, "Enabled store locations retrieved successfully", {
            storeLocations,
            count: storeLocations.length,
        });
    });

    /**
     * @desc    Create a new store location
     * @route   POST /api/v1/store-locations
     * @access  Private/Admin
     */
    static createStoreLocation = asyncHandler(async (req, res) => {
        const storeLocationData = req.body;

        const storeLocation = await storeLocationService.createStoreLocation(storeLocationData);

        return sendResponse(
            res,
            201,
            true,
            "Store location created successfully",
            {
                storeLocation,
            }
        );
    });

    /**
     * @desc    Update store location
     * @route   PATCH /api/v1/store-locations/:id
     * @access  Private/Admin
     */
    static updateStoreLocation = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const updateData = req.body;

        const storeLocation = await storeLocationService.updateStoreLocation(id, updateData);

        return successResponse(res, "Store location updated successfully", {
            storeLocation,
        });
    });

    /**
     * @desc    Delete store location (soft delete)
     * @route   DELETE /api/v1/store-locations/:id
     * @access  Private/Admin
     */
    static deleteStoreLocation = asyncHandler(async (req, res) => {
        const { id } = req.params;

        const storeLocation = await storeLocationService.deleteStoreLocation(id);

        return successResponse(res, "Store location deleted successfully", {
            storeLocation,
        });
    });
}

export default StoreLocationController;
