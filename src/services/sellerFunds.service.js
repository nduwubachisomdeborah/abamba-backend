import Order from "../models/order.model.js";
import User from "../models/user.model.js";

/**
 * Release a seller's earnings for an order from pending -> available wallet balance.
 *
 * Idempotent and race-safe: the order's sellerWalletStatus is atomically flipped
 * from "pending" to "paid" BEFORE any money moves, so concurrent/duplicate calls
 * (double-click, webhook retry, etc.) can credit the seller at most once.
 * It NEVER creates payout/transaction records - payouts are only created when a
 * seller explicitly requests a withdrawal.
 *
 * @param {string|ObjectId} orderId - Mongo _id of the order
 * @returns {Promise<{released: boolean, amount: number, sellerId: any, orderRef: any}>}
 */
export async function releaseSellerFunds(orderId) {
    // Atomic claim: only one caller can win this transition
    const claimed = await Order.findOneAndUpdate(
        { _id: orderId, sellerWalletStatus: "pending" },
        { $set: { sellerWalletStatus: "paid", fundsReleased: true } },
        { new: true },
    );

    if (!claimed) {
        return { released: false, amount: 0, sellerId: null, orderRef: null };
    }

    const amount = Number(
        claimed.sellerEarnings !== undefined && claimed.sellerEarnings !== null
            ? claimed.sellerEarnings
            : Math.max(0, Number(claimed.subtotal || 0) - Number(claimed.platformFee || 0)),
    );
    const orderRef = claimed.orderId || claimed._id;

    if (!claimed.seller || !(amount > 0)) {
        return { released: false, amount: 0, sellerId: claimed.seller, orderRef };
    }

    try {
        // Single atomic update (pipeline form) - moves pending -> balance, never below 0
        const updated = await User.findByIdAndUpdate(claimed.seller, [
            {
                $set: {
                    "wallet.balance": {
                        $add: [{ $ifNull: ["$wallet.balance", 0] }, amount],
                    },
                    "wallet.pendingBalance": {
                        $max: [0, { $subtract: [{ $ifNull: ["$wallet.pendingBalance", 0] }, amount] }],
                    },
                },
            },
        ]);

        if (!updated) {
            // Seller missing: roll back the claim so nothing is marked paid without a credit
            await Order.updateOne({ _id: orderId }, { $set: { sellerWalletStatus: "pending", fundsReleased: false } });
            return { released: false, amount: 0, sellerId: claimed.seller, orderRef };
        }
    } catch (err) {
        // Credit failed: roll back claim so the release can be retried safely
        await Order.updateOne({ _id: orderId }, { $set: { sellerWalletStatus: "pending", fundsReleased: false } });
        throw err;
    }

    return { released: true, amount, sellerId: claimed.seller, orderRef };
}

export default { releaseSellerFunds };
