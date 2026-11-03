import User from "../models/user.model.js";
import BannerAd from "../models/bannerAd.model.js";
import PlatformSettings from "../models/platformSettings.model.js";
import paystackService from "./payments/paystack.service.js";
import { AppError } from "../middlewares/error.js";

const PLAN_PRICES = {
    starter: 5000,
    growth: 15000,
    vip: 25000,
};

const AD_PACKAGE_DURATIONS = {
    flash_48h: 48,
    growth_7w: 168,
    mega_1m: 720,
};

const AD_PACKAGE_PRICES = {
    flash_48h: 2000,
    growth_7w: 5000,
    mega_1m: 15000,
};

class SellerSubscriptionService {
    /**
     * Accept Merchant Agreement
     * @param {string} sellerId
     * @param {Object} data
     */
    async acceptAgreement(sellerId, { accepted = true, version = "2026.1" } = {}) {
        const seller = await User.findById(sellerId);
        if (!seller) {
            throw new AppError("Seller account not found", 404);
        }

        seller.merchantAgreementAccepted = Boolean(accepted !== false);
        seller.merchantAgreementAcceptedAt = new Date();
        seller.merchantAgreementVersion = String(version || "2026.1");

        await seller.save();

        return {
            merchantAgreementAccepted: seller.merchantAgreementAccepted,
            merchantAgreementAcceptedAt: seller.merchantAgreementAcceptedAt,
            merchantAgreementVersion: seller.merchantAgreementVersion,
        };
    }

    /**
     * Verify Paystack payment for vendor subscription plan (Starter, Growth, VIP)
     * @param {string} sellerId
     * @param {Object} data
     */
    async verifySubscription(sellerId, { reference, planId, amount }) {
        if (!reference) {
            throw new AppError("Payment reference is required", 400);
        }

        const normalizedPlan = String(planId || "").toLowerCase().trim();
        if (!["starter", "growth", "vip"].includes(normalizedPlan)) {
            throw new AppError("Invalid subscription plan. Must be starter, growth, or vip.", 400);
        }

        const expectedPrice = PLAN_PRICES[normalizedPlan];
        const providedAmount = Number(amount) || expectedPrice;

        // Verify transaction with Paystack API
        let verification;
        try {
            verification = await paystackService.verifyTransaction(reference);
        } catch (err) {
            throw new AppError(`Paystack verification failed: ${err.message}`, 400);
        }

        const paystackData = verification?.data;
        if (!paystackData || paystackData.status !== "success") {
            throw new AppError("Payment could not be verified with Paystack or was unsuccessful.", 400);
        }

        // Paystack amounts are in kobo
        const paidKobo = Number(paystackData.amount) || 0;
        const expectedKobo = expectedPrice * 100;

        if (paidKobo < expectedKobo && paidKobo !== Math.round(providedAmount * 100)) {
            throw new AppError(
                `Payment amount mismatch. Expected ₦${expectedPrice.toLocaleString()} but received ₦${(paidKobo / 100).toLocaleString()}`,
                400
            );
        }

        const seller = await User.findById(sellerId);
        if (!seller) {
            throw new AppError("Seller not found", 404);
        }

        const paidAt = new Date();
        const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 12 Months

        seller.subscriptionPlan = normalizedPlan;
        seller.subscriptionStatus = "active";
        seller.subscriptionPrice = providedAmount;
        seller.subscriptionPaidAt = paidAt;
        seller.subscriptionExpiresAt = expiresAt;
        seller.subscriptionReference = reference;

        await seller.save();

        return {
            subscriptionPlan: seller.subscriptionPlan,
            subscriptionStatus: seller.subscriptionStatus,
            subscriptionPrice: seller.subscriptionPrice,
            subscriptionPaidAt: seller.subscriptionPaidAt,
            subscriptionExpiresAt: seller.subscriptionExpiresAt,
            subscriptionReference: seller.subscriptionReference,
        };
    }

    /**
     * Submit an Ad for Sales placement with Paystack verification
     * @param {string} sellerId
     * @param {Object} adData
     */
    async createAd(sellerId, adData) {
        const {
            packageId,
            amount,
            paymentReference,
            photoUrl,
            catchphrase,
            buttonLink,
        } = adData;

        if (!packageId || !["flash_48h", "growth_7w", "mega_1m"].includes(packageId)) {
            throw new AppError("Invalid packageId. Must be flash_48h, growth_7w, or mega_1m.", 400);
        }

        if (!photoUrl) {
            throw new AppError("photoUrl is required for banner ad.", 400);
        }

        if (!catchphrase || catchphrase.length > 40) {
            throw new AppError("catchphrase is required and must not exceed 40 characters.", 400);
        }

        if (!buttonLink) {
            throw new AppError("buttonLink is required for banner ad.", 400);
        }

        if (!paymentReference) {
            throw new AppError("paymentReference is required.", 400);
        }

        // Verify transaction with Paystack
        let verification;
        try {
            verification = await paystackService.verifyTransaction(paymentReference);
        } catch (err) {
            throw new AppError(`Paystack verification failed: ${err.message}`, 400);
        }

        const paystackData = verification?.data;
        if (!paystackData || paystackData.status !== "success") {
            throw new AppError("Ad payment could not be verified with Paystack.", 400);
        }

        const seller = await User.findById(sellerId);
        const storeName =
            seller?.business?.businessName ||
            seller?.name ||
            "Abamba Verified Merchant";

        const durationHours = AD_PACKAGE_DURATIONS[packageId] || 48;
        const amountPaid = Number(amount) || AD_PACKAGE_PRICES[packageId] || 2000;

        const ad = await BannerAd.create({
            sellerId,
            storeName,
            packageId,
            amountPaid,
            paymentReference,
            paymentStatus: "paid",
            photoUrl,
            catchphrase: catchphrase.trim().slice(0, 40),
            buttonLink: buttonLink.trim(),
            approvalStatus: "pending",
            durationHours,
            startDate: null,
            expiresAt: null,
            approvedBy: null,
            rejectionReason: null,
            isActive: false,
        });

        return ad;
    }

    /**
     * Get seller's own ads
     * @param {string} sellerId
     */
    async getSellerAds(sellerId) {
        return BannerAd.find({ sellerId }).sort({ createdAt: -1 });
    }

    /**
     * Super Admin: Get all ads
     * @param {string} status
     */
    async getAllAds(status) {
        const filter = {};
        if (status && ["pending", "approved", "rejected"].includes(status)) {
            filter.approvalStatus = status;
        }

        return BannerAd.find(filter)
            .populate("sellerId", "name email phoneNumber business")
            .populate("approvedBy", "name email")
            .sort({ createdAt: -1 });
    }

    /**
     * Super Admin: Review and approve/reject an ad
     * @param {string} adId
     * @param {string} adminId
     * @param {Object} data
     */
    async updateAdStatus(adId, adminId, { status, durationHours, rejectionReason } = {}) {
        const ad = await BannerAd.findById(adId);
        if (!ad) {
            throw new AppError("Banner ad not found", 404);
        }

        const normalizedStatus = String(status).toLowerCase().trim();
        if (!["approved", "rejected"].includes(normalizedStatus)) {
            throw new AppError("Status must be approved or rejected", 400);
        }

        if (normalizedStatus === "approved") {
            const hours = Number(durationHours) || ad.durationHours || 48;
            const now = new Date();
            ad.approvalStatus = "approved";
            ad.isActive = true;
            ad.durationHours = hours;
            ad.startDate = now;
            ad.expiresAt = new Date(now.getTime() + hours * 3600 * 1000);
            ad.approvedBy = adminId;
            ad.rejectionReason = null;
        } else {
            ad.approvalStatus = "rejected";
            ad.isActive = false;
            ad.rejectionReason = rejectionReason || "Ad rejected by administrator";
        }

        await ad.save();
        return ad;
    }

    /**
     * Public Homepage: Get active banner ads with fair-weighted rotation pool
     */
    async getLiveBanner() {
        const settings = await PlatformSettings.getInstance();
        if (!settings.bannerAdsMasterEnabled) {
            return {
                masterEnabled: false,
                count: 0,
                ad: null,
                ads: [],
            };
        }

        const now = new Date();
        const activeAds = await BannerAd.find({
            approvalStatus: "approved",
            isActive: true,
            expiresAt: { $gt: now },
        });

        if (!activeAds || activeAds.length === 0) {
            return {
                masterEnabled: true,
                count: 0,
                ad: null,
                ads: [],
            };
        }

        // Tier weight priority: mega_1m (3) > growth_7w (2) > flash_48h (1)
        const tierWeights = {
            mega_1m: 3,
            growth_7w: 2,
            flash_48h: 1,
        };

        // Shuffle within tiers for fair rotation across visitor sessions
        const shuffled = [...activeAds].sort(() => Math.random() - 0.5);
        shuffled.sort((a, b) => {
            const weightA = tierWeights[a.packageId] || 1;
            const weightB = tierWeights[b.packageId] || 1;
            // Weighted ordering: higher tiers have priority while keeping rotation fair
            if (Math.random() < 0.7) {
                return weightB - weightA;
            }
            return 0;
        });

        return {
            masterEnabled: true,
            count: shuffled.length,
            ad: shuffled[0] || null,
            ads: shuffled,
        };
    }
}

export default new SellerSubscriptionService();

