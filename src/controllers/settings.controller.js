import PlatformSettings from "../models/platformSettings.model.js";
import { asyncHandler } from "../middlewares/error.js";
import { successResponse, errorResponse } from "../utils/response.util.js";

class SettingsController {
    /**
     * @desc    Get public promotion / bonus week status
     * @route   GET /api/v1/settings/promotions
     * @access  Public
     */
    static getPromotionsStatus = asyncHandler(async (req, res) => {
        const settings = await PlatformSettings.getInstance();
        const isBonusEventActive = Boolean(settings.isBonusEventActive);

        return res.status(200).json({
            status: "success",
            success: true,
            message: "Promotion status retrieved successfully",
            data: {
                isBonusEventActive,
            },
        });
    });

    /**
     * @desc    Toggle bonus event / promotion status
     * @route   PATCH /api/v1/settings/promotions
     * @access  Private/Admin
     */
    static toggleBonusEvent = asyncHandler(async (req, res) => {
        const { isBonusEventActive } = req.body;

        if (typeof isBonusEventActive !== "boolean") {
            return errorResponse(res, "isBonusEventActive must be a boolean", 400);
        }

        const settings = await PlatformSettings.getInstance();
        settings.isBonusEventActive = isBonusEventActive;
        await settings.save();

        return res.status(200).json({
            status: "success",
            success: true,
            message: `Bonus week promotion ${isBonusEventActive ? "activated" : "deactivated"} successfully`,
            data: {
                isBonusEventActive: settings.isBonusEventActive,
            },
        });
    });

    /**
     * @desc    Get public platform settings
     * @route   GET /api/v1/settings
     * @access  Public
     */
    static getPublicSettings = asyncHandler(async (req, res) => {
        const settings = await PlatformSettings.getInstance();

        return res.status(200).json({
            status: "success",
            success: true,
            data: {
                platformName: settings.platformName,
                isBonusEventActive: Boolean(settings.isBonusEventActive),
                contactInfo: settings.contactInfo,
                supportEmail: settings.supportEmail,
                logo: settings.logo,
                favicon: settings.favicon,
                homePage: settings.homePage,
            },
        });
    });
}

export default SettingsController;
