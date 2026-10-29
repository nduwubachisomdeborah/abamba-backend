/**
 * Payout / wallet reconciliation tool.
 *
 * DRY RUN by default (prints a report, changes nothing).
 *
 * Usage:
 *   node scripts/reconcile_phantom_payouts.js                       -> report for all sellers with payouts
 *   node scripts/reconcile_phantom_payouts.js --seller=<email|id>   -> report for one seller
 *   node scripts/reconcile_phantom_payouts.js --seller=<email|id> --revert-completed --since=2026-10-01 --apply
 *        -> cancels every "completed" payout (created since the date) for that seller. Use ONLY after
 *           confirming on the Paystack dashboard / bank statement that the money never left.
 *   node scripts/reconcile_phantom_payouts.js --seller=<email|id> --reset-wallet --apply
 *        -> sets wallet.balance to the computed expected balance
 *
 * Expected balance = earnings of orders already released (sellerWalletStatus = "paid")
 *                    - completed payouts that really left the bank
 *                    - pending/processing payouts (locked in wallet.pendingBalance)
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDB from "../src/config/database.js";
import User from "../src/models/user.model.js";
import Order from "../src/models/order.model.js";
import Transaction from "../src/models/transaction.model.js";

const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
        const [k, v] = a.replace(/^--/, "").split("=");
        return [k, v === undefined ? true : v];
    }),
);
const APPLY = Boolean(args.apply);
const naira = (n) => `\u20a6${Number(n || 0).toLocaleString("en-NG")}`;

async function resolveSellers() {
    if (args.seller) {
        const q = mongoose.Types.ObjectId.isValid(args.seller)
            ? { _id: args.seller }
            : { email: String(args.seller).toLowerCase() };
        return User.find(q);
    }
    const ids = await Transaction.distinct("user", { type: "payout" });
    return User.find({ _id: { $in: ids } });
}

async function report(seller) {
    const [orders, payouts] = await Promise.all([
        Order.find({ seller: seller._id, sellerWalletStatus: "paid", deleted: false }).lean(),
        Transaction.find({ user: seller._id, type: "payout" }).sort({ createdAt: 1 }).lean(),
    ]);

    const earned = orders.reduce(
        (s, o) =>
            s +
            Number(
                o.sellerEarnings ?? Math.max(0, Number(o.subtotal || 0) - Number(o.platformFee || 0)),
            ),
        0,
    );
    const sum = (st) =>
        payouts.filter((p) => st.includes(p.status)).reduce((s, p) => s + Number(p.amount || 0), 0);
    const completed = sum(["completed"]);
    const inFlight = sum(["pending", "processing"]);
    const expectedBalance = earned - completed - inFlight;

    console.log("\n==================================================");
    console.log(`Seller: ${seller.name} <${seller.email}> (${seller._id})`);
    console.log(`  Released order earnings : ${naira(earned)} (${orders.length} orders)`);
    console.log(`  Completed payouts       : ${naira(completed)}`);
    console.log(`  Pending/processing      : ${naira(inFlight)}`);
    console.log(`  Wallet balance (actual) : ${naira(seller.wallet?.balance)}`);
    console.log(`  Wallet pending (actual) : ${naira(seller.wallet?.pendingBalance)}`);
    console.log(`  Expected balance        : ${naira(expectedBalance)}`);
    console.log("  Payout history:");
    payouts.forEach((p) =>
        console.log(
            `    ${p._id}  ${new Date(p.createdAt).toISOString().slice(0, 10)}  ${naira(p.amount).padEnd(12)} ${p.status.padEnd(10)} ${p.metadata?.payoutMethod || "-"}  ref=${p.transactionId || p.reference}`,
        ),
    );

    // Duplicate-looking payouts (same amount, same day)
    const seen = new Map();
    payouts.forEach((p) => {
        const key = `${new Date(p.createdAt).toISOString().slice(0, 10)}|${p.amount}`;
        seen.set(key, (seen.get(key) || 0) + 1);
    });
    for (const [k, c] of seen) if (c > 1) console.log(`  !! Possible duplicates: ${c} payouts of ${k}`);

    return { payouts, expectedBalance };
}

async function run() {
    await connectDB();
    console.log(`Mode: ${APPLY ? "APPLY (writes enabled)" : "DRY RUN"}`);

    const sellers = await resolveSellers();
    for (const seller of sellers) {
        const { payouts, expectedBalance } = await report(seller);

        if (args["revert-completed"]) {
            if (!args.seller) throw new Error("--revert-completed requires --seller=<email|id>");
            const since = args.since ? new Date(args.since) : new Date(0);
            const targets = payouts.filter((p) => p.status === "completed" && new Date(p.createdAt) >= since);
            console.log(`  -> ${targets.length} completed payout(s) selected for revert`);
            for (const p of targets) {
                if (APPLY) {
                    await Transaction.updateOne(
                        { _id: p._id, status: "completed" },
                        {
                            $set: {
                                status: "cancelled",
                                failureReason: "Reverted by reconciliation: transfer never reached the bank",
                                "metadata.reverted": true,
                                "metadata.revertedAt": new Date(),
                                "metadata.revertedBy": "reconcile_phantom_payouts.js",
                            },
                        },
                    );
                    console.log(`     reverted ${p._id} (${naira(p.amount)})`);
                } else {
                    console.log(`     [dry-run] would revert ${p._id} (${naira(p.amount)})`);
                }
            }
        }

        if (args["reset-wallet"]) {
            if (!args.seller) throw new Error("--reset-wallet requires --seller=<email|id>");
            // Recompute expected balance AFTER any reverts above
            const fresh = await report(await User.findById(seller._id));
            const target = Math.max(0, fresh.expectedBalance);
            if (APPLY) {
                await User.updateOne({ _id: seller._id }, { $set: { "wallet.balance": target } });
                console.log(`  -> wallet.balance set to ${naira(target)}`);
            } else {
                console.log(`  -> [dry-run] would set wallet.balance to ${naira(target)}`);
            }
        }
    }
    console.log("\nDone.");
}

run()
    .catch((e) => {
        console.error("Reconciliation failed:", e);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
