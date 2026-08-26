import { Router } from "express";
import userRoutes from "./user.routes.js";
import productRoutes from "./product.routes.js";
import authRoutes from "./auth.routes.js";
import adminRoutes from "./admin.routes.js";
import reviewRoutes from "./review.routes.js";
import orderRoutes from "./order.routes.js";
import cartRoutes from "./cart.routes.js";
import shipmentRoutes from "./shipment.routes.js";
import wishlistRoutes from "./wishlist.routes.js";
import subscriptionRoutes from "./subscription.routes.js";
import sellerProductRoutes from "./seller.product.routes.js";
import adminProductRoutes from "./admin.product.routes.js";
import uploadRoutes from "./upload.routes.js";
import sellerRoutes from "./seller.routes.js";
import customerRoutes from "./customer.routes.js";
import paymentRoutes from "./payment.routes.js";
import storeLocationRoutes from "./storeLocation.routes.js";
import notificationRoutes from "./notification.routes.js";
import webhookRoutes from "./webhook.routes.js";
import aiRoutes from "./ai.routes.js";

const router = Router();

// Register all v1 routes
router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/users", userRoutes);
router.use("/products", productRoutes);
router.use("/reviews", reviewRoutes);
router.use("/orders", orderRoutes);
router.use("/cart", cartRoutes);
router.use("/shipments", shipmentRoutes);
router.use("/wishlists", wishlistRoutes);
router.use("/subscriptions", subscriptionRoutes);
router.use("/upload", uploadRoutes);
router.use("/seller/products", sellerProductRoutes);
router.use("/seller", sellerRoutes);
router.use("/admin/products", adminProductRoutes);
router.use("/customers", customerRoutes);
router.use("/payments", paymentRoutes);
router.use("/store-locations", storeLocationRoutes);
router.use("/notifications", notificationRoutes);
router.use("/webhooks", webhookRoutes);
router.use("/ai", aiRoutes);

// Health check route
router.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "API v1 is active",
        timestamp: new Date().toISOString(),
    });
});

export default router;
