import Shipment from "../models/shipment.model.js";
import Order from "../models/order.model.js";
import User from "../models/user.model.js";
import emailService from "../services/email.service.js";
import notificationService from "../services/notification.service.js";
import fs from "fs";
import path from "path";

class WebhookController {
    /**
     * Human-readable status text for emails
     */
    static statusTextMap = {
        pending: "Pending",
        in_transit: "In Transit",
        delivered: "Delivered",
        failed: "Delivery Failed",
        returned: "Returned",
    };

    /**
     * Status-specific message templates
     */
    static statusMessageMap = {
        pending: "Your shipment has been created and is awaiting pickup.",
        in_transit: "Great news! Your shipment is on its way.",
        delivered:
            "Your shipment has been delivered. Thank you for shopping with us!",
        failed: "Unfortunately, there was an issue with your delivery. Our team will contact you shortly.",
        returned:
            "Your shipment has been returned. Please contact support for assistance.",
    };

    /**
     * Send status update emails to buyer and seller
     */
    static sendStatusEmails = async (shipment, status, payload) => {
        try {
            // Get orders with user and seller details
            const orders = await Order.find({ _id: { $in: shipment.orders } })
                .populate("user", "name email")
                .populate("seller", "name email");

            if (!orders.length) {
                console.log(
                    "[ShipBubble Webhook] No orders found for email notification",
                );
                return;
            }

            const statusText =
                WebhookController.statusTextMap[status] || status;
            const message =
                WebhookController.statusMessageMap[status] ||
                `Your shipment status has been updated to: ${statusText}`;

            // Send emails for each order
            for (const order of orders) {
                const emailData = {
                    trackingNumber: shipment.trackingNumber,
                    trackingUrl: shipment.trackingUrl,
                    courierName: payload.courier?.name || "Courier",
                    status,
                    statusText,
                    message,
                    orderId: order.orderId,
                };

                // Send to buyer (include waybill document if available)
                if (order.user?.email) {
                    try {
                        await emailService.sendEmail(
                            order.user.email,
                            `Shipment Update: ${statusText}`,
                            "shipment-status",
                            {
                                ...emailData,
                                name: order.user.name || "Valued Customer",
                                waybillDocument:
                                    payload.waybill_document || null,
                            },
                        );
                        console.log(
                            `[ShipBubble Webhook] Email sent to buyer: ${order.user.email}`,
                        );
                    } catch (err) {
                        console.error(
                            `[ShipBubble Webhook] Failed to send email to buyer:`,
                            err.message,
                        );
                    }
                }

                // Send to seller
                if (order.seller?.email) {
                    try {
                        await emailService.sendEmail(
                            order.seller.email,
                            `Shipment Update: ${statusText} - Order #${order.orderId}`,
                            "shipment-status",
                            {
                                ...emailData,
                                name: order.seller.name || "Seller",
                                message: `A shipment for Order #${order.orderId} has been updated to: ${statusText}`,
                            },
                        );
                        console.log(
                            `[ShipBubble Webhook] Email sent to seller: ${order.seller.email}`,
                        );
                    } catch (err) {
                        console.error(
                            `[ShipBubble Webhook] Failed to send email to seller:`,
                            err.message,
                        );
                    }
                }
            }
        } catch (error) {
            console.error(
                "[ShipBubble Webhook] Error sending status emails:",
                error,
            );
        }
    };

    /**
     * Handle ShipBubble webhook events
     */
    static handleShipBubble = async (req, res) => {
        try {
            const payload = req.body;
            const event = payload.event;
            const orderId = payload.order_id;

            console.log(
                `[ShipBubble Webhook] Received event: ${event} for order: ${orderId}`,
            );

            // Log webhook payload to file
            try {
                const logDir = path.join(process.cwd(), "logs");
                if (!fs.existsSync(logDir)) {
                    fs.mkdirSync(logDir);
                }
                const logFile = path.join(logDir, "shipping_webhooks.json");

                const logEntry = {
                    timestamp: new Date().toISOString(),
                    payload: payload,
                };

                // Read existing file to append or start new array
                let logs = [];
                if (fs.existsSync(logFile)) {
                    try {
                        const fileContent = fs.readFileSync(logFile, "utf8");
                        if (fileContent.trim()) {
                            logs = JSON.parse(fileContent);
                        }
                    } catch (readErr) {
                        console.error(
                            "[ShipBubble Webhook] Error reading log file:",
                            readErr,
                        );
                        // If error reading (e.g. corrupted), maybe backup and start new?
                        // For now, let's just append to array if possible, or handle corruption.
                        // Simplest safe approach: if parse fails, start new array (logs might be lost but app continues)
                    }
                }

                if (!Array.isArray(logs)) {
                    logs = [];
                }

                logs.push(logEntry);

                fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
            } catch (logLimitErr) {
                console.error(
                    "[ShipBubble Webhook] Failed to log webhook:",
                    logLimitErr,
                );
            }

            switch (event) {
                case "shipment.label.created":
                    await WebhookController.handleLabelCreated(payload);
                    break;
                case "shipment.status.changed":
                    await WebhookController.handleStatusChanged(payload);
                    break;
                case "shipment.cancelled":
                    await WebhookController.handleShipmentCancelled(payload);
                    break;
                case "shipment.cod.remitted":
                    await WebhookController.handleCodRemitted(payload);
                    break;
                default:
                    console.log(
                        `[ShipBubble Webhook] Unknown event type: ${event}`,
                    );
            }

            // Always return 200 to acknowledge receipt
            return res.status(200).json({
                success: true,
                message: "Webhook received",
            });
        } catch (error) {
            console.error("[ShipBubble Webhook] Error:", error);
            // Still return 200 to prevent retries for processing errors
            return res.status(200).json({
                success: true,
                message: "Webhook received with processing error",
            });
        }
    };

    /**
     * Handle shipment.label.created event
     */
    static handleLabelCreated = async (payload) => {
        const { order_id, status, tracking_url, courier } = payload;

        const shipment = await Shipment.findOne({ trackingNumber: order_id });

        if (shipment) {
            shipment.trackingUrl = tracking_url;
            if (courier?.tracking_code) {
                shipment.notes = `Courier: ${courier.name}, Tracking Code: ${courier.tracking_code}`;
            }
            await shipment.save();

            // Send email notifications
            await WebhookController.sendStatusEmails(
                shipment,
                "pending",
                payload,
            );

            console.log(
                `[ShipBubble Webhook] Label created - Updated shipment: ${order_id}`,
            );
        } else {
            console.log(
                `[ShipBubble Webhook] Label created - Shipment not found: ${order_id}`,
            );
        }
    };

    /**
     * Handle shipment.status.changed event
     */
    static handleStatusChanged = async (payload) => {
        const { order_id, status, package_status, tracking_url } = payload;

        const shipment = await Shipment.findOne({ trackingNumber: order_id });

        if (!shipment) {
            console.log(
                `[ShipBubble Webhook] Status changed - Shipment not found: ${order_id}`,
            );
            return;
        }

        // Map ShipBubble status to local status
        const statusMap = {
            pending: "pending",
            pickedup: "in_transit",
            "picked up": "in_transit",
            "in transit": "in_transit",
            in_transit: "in_transit",
            "out for delivery": "in_transit",
            out_for_delivery: "in_transit",
            delivered: "delivered",
            completed: "delivered", // Map ShipBubble completed to delivered
            failed: "failed",
            cancelled: "failed",
            returned: "returned",
        };

        const normalizedStatus = status?.toLowerCase();
        const newStatus = statusMap[normalizedStatus] || shipment.status;

        // Add to tracking history
        if (package_status && package_status.length > 0) {
            const latestPackageStatus =
                package_status[package_status.length - 1];

            // Map to tracking history status enum
            const trackingStatusMap = {
                pending: "information_received",
                pickedup: "in_transit",
                "picked up": "in_transit",
                "in transit": "in_transit",
                in_transit: "in_transit",
                "out for delivery": "out_for_delivery",
                out_for_delivery: "out_for_delivery",
                delivered: "delivered",
                failed: "failed_attempt",
                cancelled: "exception",
                returned: "returned",
            };

            const trackingStatus =
                trackingStatusMap[latestPackageStatus.status?.toLowerCase()] ||
                "in_transit";

            shipment.trackingHistory.push({
                status: trackingStatus,
                description: latestPackageStatus.status,
                timestamp: new Date(latestPackageStatus.datetime),
            });
        }

        shipment.status = newStatus;
        if (tracking_url) {
            shipment.trackingUrl = tracking_url;
        }

        await shipment.save();

        // Send email notifications
        await WebhookController.sendStatusEmails(shipment, newStatus, payload);

        // If delivered, also update linked orders
        // If delivered, also update linked orders and release funds
        if (newStatus === "delivered") {
            // Find orders first to get seller info
            const orders = await Order.find({ _id: { $in: shipment.orders } });

            for (const order of orders) {
                // Update order status
                order.status = "delivered";

                // Release funds if still pending
                if (order.sellerWalletStatus === "pending") {
                    const creditAmount = Number(order.subtotal || 0);
                    if (order.seller && creditAmount > 0) {
                        // Move from pending to balance
                        await User.findByIdAndUpdate(order.seller, {
                            $inc: {
                                "wallet.balance": creditAmount,
                                "wallet.pendingBalance": -creditAmount,
                            },
                        });

                        order.sellerWalletStatus = "paid";

                        // Notify seller
                        await notificationService.send(
                            order.seller,
                            "Funds Released",
                            `Order #${order.orderId} has been delivered. **₦${creditAmount}** is now available for withdrawal.`,
                        );
                        console.log(
                            `[ShipBubble Webhook] Released funds for order: ${order.orderId}`,
                        );
                    }
                }

                await order.save();
            }

            console.log(
                `[ShipBubble Webhook] Orders marked as delivered and funds released for shipment: ${order_id}`,
            );
        }

        console.log(
            `[ShipBubble Webhook] Status changed - Updated shipment: ${order_id} to ${newStatus}`,
        );
    };

    /**
     * Handle shipment.cancelled event
     */
    static handleShipmentCancelled = async (payload) => {
        const { order_id } = payload;

        const shipment = await Shipment.findOne({ trackingNumber: order_id });

        if (!shipment) {
            console.log(
                `[ShipBubble Webhook] Cancelled - Shipment not found: ${order_id}`,
            );
            return;
        }

        shipment.status = "failed";
        shipment.trackingHistory.push({
            status: "exception",
            description: "Shipment cancelled",
            timestamp: new Date(),
        });

        await shipment.save();

        // Send email notifications
        await WebhookController.sendStatusEmails(shipment, "failed", payload);

        // Update linked orders status to cancelled
        await Order.updateMany(
            { _id: { $in: shipment.orders } },
            { status: "cancelled" },
        );

        console.log(`[ShipBubble Webhook] Shipment cancelled: ${order_id}`);
    };

    /**
     * Handle shipment.cod.remitted event
     */
    static handleCodRemitted = async (payload) => {
        const { order_id } = payload;
        // Log COD remittance - can be extended to update payment records
        console.log(`[ShipBubble Webhook] COD remitted for order: ${order_id}`);
    };
}

export default WebhookController;
