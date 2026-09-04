import PlatformSettings from "../models/platformSettings.model.js";
import adminService from "../services/admin.service.js";
import { asyncHandler } from "../middlewares/error.js";
import { successResponse, errorResponse } from "../utils/response.util.js";

class SettingsController {
    /**
     * @desc    Get Platform Settings
     * @route   GET /api/v1/settings/platform or GET /api/v1/admin/settings/platform
     * @access  Public
     */
    static getPlatformSettings = asyncHandler(async (req, res) => {
        let settings = await PlatformSettings.findOne();
        if (!settings) {
            settings = await PlatformSettings.create({
                adminEmail: "abambanigeria@gmail.com",
                supportEmail: "Abambasupport@gmail.com",
                systemPreferences: { bonusWeekEnabled: true },
            });
        }
        return res.status(200).json({
            status: "success",
            success: true,
            data: settings,
        });
    });

    /**
     * @desc    Update (PATCH) Platform Settings
     * @route   PATCH /api/v1/settings/platform or PATCH /api/v1/admin/settings/platform
     * @access  Private/Admin
     */
    static updatePlatformSettings = asyncHandler(async (req, res) => {
        const updatedSettings = await adminService.updatePlatformSettings(req.body);
        return res.status(200).json({
            status: "success",
            success: true,
            message: "Platform settings updated successfully",
            data: updatedSettings,
        });
    });

    /**
     * @desc    Get public promotion / bonus week status
     * @route   GET /api/v1/settings/promotions
     * @access  Public
     */
    static getPromotionsStatus = asyncHandler(async (req, res) => {
        const settings = await PlatformSettings.getInstance();
        const isBonusEventActive = Boolean(
            settings.systemPreferences?.bonusWeekEnabled ?? settings.isBonusEventActive
        );

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
        if (!settings.systemPreferences) settings.systemPreferences = {};
        settings.systemPreferences.bonusWeekEnabled = isBonusEventActive;
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
            data: settings,
        });
    });
}

export const getPlatformSettings = SettingsController.getPlatformSettings;
export const updatePlatformSettings = SettingsController.updatePlatformSettings;

export default SettingsController;
