import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";
import { AppError } from "../middlewares/error.js";
import emailService from "./email.service.js";

class NotificationService {
    async createNotification(payload) {
        await this._ensureUserExists(payload.user);
        const notification = await Notification.create(payload);
        return notification;
    }

    /**
     * Convenience method to send a notification to a user (in-app + email)
     * @param {string} userId - Recipient user ID
     * @param {string} title - Notification title
     * @param {string} description - Notification description (supports markdown)
     * @param {Object} options - Optional settings { actionUrl, actionText }
     */
    async send(userId, title, description, options = {}) {
        // 1. Create in-app notification
        try {
            await this.createNotification({ user: userId, title, description });
        } catch (err) {
            console.error(
                `Failed to send in-app notification to ${userId}:`,
                err.message
            );
        }

        // 2. Send email notification
        try {
            const user = await User.findById(userId).select("email name");
            if (user?.email) {
                // Convert basic markdown to HTML for email
                const htmlDescription = this._markdownToHtml(description);

                await emailService.sendEmail(
                    user.email,
                    title,
                    "notification",
                    {
                        name: user.name || "Valued Customer",
                        title,
                        description: htmlDescription,
                        actionUrl: options.actionUrl,
                        actionText: options.actionText || "View Details",
                    }
                );
            }
        } catch (err) {
            console.error(
                `Failed to send email notification to ${userId}:`,
                err.message
            );
        }
    }

    /**
     * Convert basic markdown to HTML for email rendering
     */
    _markdownToHtml(text) {
        if (!text) return "";
        return text
            .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") // **bold**
            .replace(/\*(.+?)\*/g, "<em>$1</em>") // *italic*
            .replace(/\n\n/g, "</p><p>") // double newlines to paragraphs
            .replace(/\n/g, "<br>") // single newlines to breaks
            .replace(/^/, "<p>")
            .replace(/$/, "</p>");
    }

    async updateNotification(notificationId, updates) {
        if (updates.user) {
            await this._ensureUserExists(updates.user);
        }

        const allowedFields = ["title", "description", "read", "user"];
        const safeUpdates = allowedFields.reduce((acc, field) => {
            if (updates[field] !== undefined) {
                acc[field] = updates[field];
            }
            return acc;
        }, {});

        if (Object.keys(safeUpdates).length === 0) {
            throw new AppError("No valid fields provided for update", 400);
        }

        const notification = await Notification.findByIdAndUpdate(
            notificationId,
            safeUpdates,
            { new: true }
        );

        if (!notification) {
            throw new AppError("Notification not found", 404);
        }

        return notification;
    }

    async listUserNotifications(userId, { page = 1, limit = 20 } = {}) {
        const query = { user: userId };
        const skip = (page - 1) * limit;

        const [notifications, total] = await Promise.all([
            Notification.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Notification.countDocuments(query),
        ]);

        return {
            notifications,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.max(Math.ceil(total / limit), 1),
            },
        };
    }

    async countUnread(userId) {
        const count = await Notification.countDocuments({
            user: userId,
            read: false,
        });

        return { count };
    }

    async markAsRead(notificationId, userId) {
        const notification = await Notification.findOneAndUpdate(
            { _id: notificationId, user: userId },
            { read: true },
            { new: true }
        );

        if (!notification) {
            throw new AppError("Notification not found", 404);
        }

        return notification;
    }

    async _ensureUserExists(userId) {
        const user = await User.findOne({ _id: userId, deleted: false });
        if (!user) {
            throw new AppError("Recipient user not found", 404);
        }
    }
}

export default new NotificationService();
