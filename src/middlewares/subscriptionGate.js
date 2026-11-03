import PlatformSettings from "../models/platformSettings.model.js";
import User from "../models/user.model.js";

/**
 * Middleware to enforce vendor subscription before publishing inventory
 * when vendorSubscriptionEnabled is toggled ON by Super Admin.
 */
export const checkVendorSubscriptionGate = async (req, res, next) => {
    try {
        const platformSettings = await PlatformSettings.getInstance();
        if (platformSettings?.vendorSubscriptionEnabled) {
            const sellerId = req.user?._id || req.user?.id;
            const seller = await User.findById(sellerId);
            const isSubscribed =
                seller?.subscriptionStatus === "active" &&
                seller?.subscriptionExpiresAt &&
                new Date(seller.subscriptionExpiresAt) > new Date();

            if (!isSubscribed) {
                return res.status(403).json({
                    success: false,
                    code: "SUBSCRIPTION_REQUIRED",
                    message: "You must activate your merchant subscription plan to publish inventory.",
                });
            }
        }
        next();
    } catch (err) {
        next(err);
    }
};

export default checkVendorSubscriptionGate;

