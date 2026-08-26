import notificationService from "../services/notification.service.js";
import { asyncHandler } from "../middlewares/error.js";
import { successResponse } from "../utils/response.util.js";

class NotificationController {
    static createNotification = asyncHandler(async (req, res) => {
        const notification = await notificationService.createNotification(
            req.body
        );

        return successResponse(
            res,
            "Notification created successfully",
            notification
        );
    });

    static updateNotification = asyncHandler(async (req, res) => {
        const notification = await notificationService.updateNotification(
            req.params.notificationId,
            req.body
        );

        return successResponse(
            res,
            "Notification updated successfully",
            notification
        );
    });

    static getMyNotifications = asyncHandler(async (req, res) => {
        const { page = 1, limit = 20 } = req.query;
        const result = await notificationService.listUserNotifications(
            req.user.id,
            {
                page: Number(page) || 1,
                limit: Number(limit) || 20,
            }
        );

        return successResponse(
            res,
            "Notifications retrieved successfully",
            result
        );
    });

    static getUnreadCount = asyncHandler(async (req, res) => {
        const count = await notificationService.countUnread(req.user.id);

        return successResponse(
            res,
            "Unread notifications count retrieved successfully",
            count
        );
    });

    static markAsRead = asyncHandler(async (req, res) => {
        const notification = await notificationService.markAsRead(
            req.params.notificationId,
            req.user.id
        );

        return successResponse(
            res,
            "Notification marked as read",
            notification
        );
    });
}

export default NotificationController;
