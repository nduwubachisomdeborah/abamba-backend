import { Router } from "express";
import NotificationController from "../../controllers/notification.controller.js";
import { authenticate } from "../../middlewares/auth.js";

const router = Router();

router.get("/", authenticate, NotificationController.getMyNotifications);
router.patch(
    "/:notificationId/read",
    authenticate,
    NotificationController.markAsRead
);
router.get(
    "/unread/count",
    authenticate,
    NotificationController.getUnreadCount
);

export default router;
