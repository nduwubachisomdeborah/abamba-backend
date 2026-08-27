import LogisticsCompany from "../models/logisticsCompany.model.js";
import DispatchTracker from "../models/dispatchTracker.model.js";

/**
 * 2-Turn Round-Robin Allocation for Checkout
 * GET /api/v1/logistics/checkout-options?state=Imo
 */
export const getCheckoutLogistics = async (req, res) => {
    try {
        const rawState = req.query.state || "Imo";
        const state = rawState.toLowerCase().includes("abia") ? "Abia" : "Imo";

        // 1. Fetch all companies
        const allCompanies = await LogisticsCompany.find().sort({ createdAt: 1 });
        const activeInState = allCompanies.filter(
            (c) => c.active && c.state === state
        );

        if (activeInState.length === 0) {
            const fallbackCompany = allCompanies.find((c) => c.state === state) || allCompanies[0];
            return res.status(200).json({
                success: true,
                data: {
                    defaultCompany: fallbackCompany,
                    allCompanies,
                },
            });
        }

        // 2. Fetch or create tracker for this state
        let tracker = await DispatchTracker.findOne({ state });
        if (!tracker) {
            tracker = await DispatchTracker.create({
                state,
                currentCompanyIndex: 0,
                currentTurnCount: 0,
            });
        }

        // Ensure index is within range
        let index = tracker.currentCompanyIndex % activeInState.length;
        let turnCount = tracker.currentTurnCount + 1;

        // Selected Default Company for this customer
        const defaultCompany = activeInState[index];

        // Check if quota of 2 turns is reached
        if (turnCount >= 2) {
            tracker.currentCompanyIndex = (index + 1) % activeInState.length;
            tracker.currentTurnCount = 0; // Reset for next company
        } else {
            tracker.currentTurnCount = turnCount;
        }

        await tracker.save();

        // 3. Structure response
        const formattedCompanies = allCompanies.map((c) => ({
            id: c._id,
            _id: c._id,
            code: c.code,
            name: c.name,
            email: c.email,
            phone: c.phone,
            state: c.state,
            hub: c.hub,
            pricingType: c.pricingType,
            defaultBasePrice: c.defaultBasePrice,
            active: c.active,
            isAvailableInState: c.active && c.state === state,
            bankDetails: c.bankDetails,
            completedDeliveries: c.completedDeliveries,
            totalEarned: c.totalEarned,
            pendingPayout: c.pendingPayout,
        }));

        return res.status(200).json({
            success: true,
            data: {
                defaultCompany,
                allCompanies: formattedCompanies,
            },
        });
    } catch (error) {
        console.error("Logistics checkout options error:", error);
        return res.status(500).json({
            success: false,
            message: "Error fetching logistics options",
            error: error.message,
        });
    }
};

/**
 * Get all regional logistics companies (Admin & Public)
 * GET /api/v1/admin/regional-logistics or GET /api/v1/logistics/companies
 */
export const getAllCompanies = async (req, res) => {
    try {
        const { state } = req.query;
        const query = {};
        if (state) {
            query.state = state.toLowerCase().includes("abia") ? "Abia" : "Imo";
        }

        const companies = await LogisticsCompany.find(query).sort({ state: 1, name: 1 });
        const trackers = await DispatchTracker.find();

        return res.status(200).json({
            success: true,
            message: "Logistics companies retrieved successfully",
            data: {
                companies,
                trackers,
            },
        });
    } catch (error) {
        console.error("Error fetching logistics companies:", error);
        return res.status(500).json({
            success: false,
            message: "Error fetching logistics companies",
            error: error.message,
        });
    }
};

/**
 * Toggle company active status
 * PATCH /api/v1/admin/regional-logistics/:id/toggle
 */
export const toggleCompanyStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const company = await LogisticsCompany.findById(id);
        if (!company) {
            return res
                .status(404)
                .json({ success: false, message: "Company not found" });
        }

        company.active = !company.active;
        await company.save();

        return res.status(200).json({
            success: true,
            message: `${company.name} is now ${
                company.active ? "Active" : "Disabled"
            }`,
            data: company,
        });
    } catch (error) {
        console.error("Error toggling company status:", error);
        return res.status(500).json({
            success: false,
            message: "Error toggling company status",
            error: error.message,
        });
    }
};

/**
 * Settle monthly payout
 * POST /api/v1/admin/regional-logistics/:id/settle
 */
export const markMonthlyPayoutSettled = async (req, res) => {
    try {
        const { id } = req.params;
        const company = await LogisticsCompany.findByIdAndUpdate(
            id,
            { pendingPayout: 0 },
            { new: true }
        );

        if (!company) {
            return res
                .status(404)
                .json({ success: false, message: "Company not found" });
        }

        return res.status(200).json({
            success: true,
            message: `Monthly payout marked as settled for ${company.name}`,
            data: company,
        });
    } catch (error) {
        console.error("Error settling payout:", error);
        return res.status(500).json({
            success: false,
            message: "Error settling payout",
            error: error.message,
        });
    }
};

/**
 * Update company details / bank details / pricing
 * PATCH /api/v1/admin/regional-logistics/:id
 */
export const updateCompany = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedCompany = await LogisticsCompany.findByIdAndUpdate(
            id,
            { $set: req.body },
            { new: true, runValidators: true }
        );

        if (!updatedCompany) {
            return res
                .status(404)
                .json({ success: false, message: "Company not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Logistics company updated successfully",
            data: updatedCompany,
        });
    } catch (error) {
        console.error("Error updating company:", error);
        return res.status(500).json({
            success: false,
            message: "Error updating company",
            error: error.message,
        });
    }
};

export default {
    getCheckoutLogistics,
    getAllCompanies,
    toggleCompanyStatus,
    markMonthlyPayoutSettled,
    updateCompany,
};
