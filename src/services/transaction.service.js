import Transaction from "../models/transaction.model.js";
import User from "../models/user.model.js";
import { AppError } from "../middlewares/error.js";
import { v4 as uuidv4 } from "uuid";
import PaystackService from "./payments/paystack.service.js";

const MIN_PAYOUT_AMOUNT = Number(process.env.MIN_PAYOUT_AMOUNT) || 1000;
class TransactionService {
    /**
     * Create a payout request
     * @param {string} userId - User ID requesting payout
     * @param {Object} payoutData - Payout data (only amount and optional description)
     * @returns {Promise<Object>} Transaction object
     */
    async createPayout(userId, payoutData) {
        const { amount, description, bankDetails, accountDetails } = payoutData;

        // Validate user exists and is a seller
        const user = await User.findById(userId);
        if (!user) {
            throw new AppError("User not found", 404);
        }

        const isSeller = user.role === "seller" || user.roles?.includes("seller");
        if (!isSeller) {
            throw new AppError("Only sellers can request payouts", 403);
        }

        const bankInfo = bankDetails || accountDetails || user.bank;

        // Check if user has bank details
        if (!bankInfo || !bankInfo.accountNumber) {
            throw new AppError(
                "Bank account not found. Please add your bank details before requesting a payout",
                400,
            );
        }

        const requestedAmount = Number(amount);
        if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
            throw new AppError("Please provide a valid withdrawal amount.", 400);
        }

        // Only one active withdrawal request at a time (prevents double-click duplicates)
        const existingPending = await Transaction.findOne({
            user: userId,
            type: "payout",
            status: { $in: ["pending", "processing"] },
        });
        if (existingPending) {
            throw new AppError(
                "You already have a withdrawal request awaiting approval. Please wait for it to be processed.",
                400,
            );
        }

        // Atomically lock funds: only succeeds if balance is still sufficient
        const locked = await User.findOneAndUpdate(
            { _id: userId, "wallet.balance": { $gte: requestedAmount } },
            {
                $inc: {
                    "wallet.balance": -requestedAmount,
                    "wallet.pendingBalance": requestedAmount,
                },
            },
            { new: true },
        );
        if (!locked) {
            throw new AppError("Insufficient available wallet balance.", 400);
        }

        // Create transaction (ALWAYS pending - admin approval is required)
        const reference = `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        let transaction;
        try {
            transaction = new Transaction({
                user: userId,
                type: "payout",
                amount: requestedAmount,
                method: "bank_transfer",
                accountDetails: {
                    bankName: bankInfo.bankName,
                    accountNumber: bankInfo.accountNumber?.toString(),
                    accountName: bankInfo.accountName,
                    bankCode: bankInfo.bankCode,
                },
                description: description || "Payout request",
                reference,
                status: "pending",
            });
            await transaction.save();
        } catch (err) {
            // Unlock the funds if the request record could not be saved
            await User.updateOne(
                { _id: userId },
                {
                    $inc: {
                        "wallet.balance": requestedAmount,
                        "wallet.pendingBalance": -requestedAmount,
                    },
                },
            );
            throw err;
        }

        return transaction;
    }

    /**
     * Get pending payouts for a user
     * @param {string} userId - User ID
     * @returns {Promise<Array>} Array of pending payout transactions
     */
    async getPendingPayouts(userId) {
        return await Transaction.find({
            user: userId,
            type: "payout",
            status: "pending",
        })
            .populate("user", "name email phoneNumber business bank")
            .sort({ createdAt: -1 });
    }

    /**
     * Get all transactions for a user
     * @param {string} userId - User ID
     * @param {Object} filters - Optional filters
     * @returns {Promise<Array>} Array of transactions
     */
    async getUserTransactions(userId, filters = {}) {
        const query = {};

        if (userId) {
            query.user = userId;
        }

        if (filters.type) {
            query.type = filters.type;
        }

        if (filters.status) {
            query.status = filters.status;
        }

        return await Transaction.find(query)
            .populate("user", "name email phoneNumber business bank")
            .sort({ createdAt: -1 });
    }

    /**
     * Process a payout (admin function)
     * @param {string} transactionId - Transaction ID
     * @param {string} status - New status ('completed' or 'failed')
     * @param {Object} additionalData - Additional data for processing
     * @returns {Promise<Object>} Updated transaction
     */
    async processPayout(transactionId, status, additionalData = {}) {
        let transaction;
        if (transactionId && typeof transactionId === "string" && transactionId.match(/^[0-9a-fA-F]{24}$/)) {
            transaction = await Transaction.findById(transactionId);
        }
        if (!transaction) {
            transaction = await Transaction.findOne({
                $or: [{ reference: transactionId }, { transactionId: transactionId }],
            });
        }
        if (!transaction) {
            throw new AppError("Transaction not found", 404);
        }

        if (transaction.status !== "pending") {
            throw new AppError(`Payout is already ${transaction.status}.`, 400);
        }

        if (!["completed", "failed", "rejected"].includes(status)) {
            throw new AppError("Invalid status", 400);
        }

        if (status === "completed" || status === "approved") {
            const user = await User.findById(transaction.user);

            if (!user) {
                throw new AppError("Seller user not found", 404);
            }

            const isSeller =
                user.role === "seller" ||
                user.roles?.includes("seller") ||
                transaction.type === "payout";

            if (!isSeller) {
                throw new AppError("Only seller payouts can be processed", 400);
            }

            // Atomic claim: only one approval can ever run for a payout (blocks double-click approvals)
            const claimed = await Transaction.findOneAndUpdate(
                { _id: transaction._id, status: "pending" },
                { $set: { status: "processing" } },
                { new: true },
            );
            if (!claimed) {
                throw new AppError("Payout has already been processed or is being processed.", 400);
            }
            transaction = claimed;

            // Retrieve bank details from user profile or transaction snapshot
            let accountName =
                user.bank?.accountName ||
                transaction.accountDetails?.accountName ||
                user.name;
            let accountNumber =
                user.bank?.accountNumber ||
                transaction.accountDetails?.accountNumber;
            let bankCode =
                user.bank?.bankCode ||
                transaction.accountDetails?.bankCode;
            let bankName =
                user.bank?.bankName ||
                transaction.accountDetails?.bankName;

            // Auto-resolve bank code by bank name if bankCode is missing
            if (!bankCode && bankName) {
                try {
                    const bankListRes = await PaystackService.getBankList();
                    const banks = bankListRes?.data || [];
                    const cleanBankName = bankName
                        .toLowerCase()
                        .replace(/bank|plc|limited|ltd/g, "")
                        .trim();
                    const found = banks.find((b) => {
                        const cleanName = b.name
                            .toLowerCase()
                            .replace(/bank|plc|limited|ltd/g, "")
                            .trim();
                        return (
                            cleanName === cleanBankName ||
                            b.name.toLowerCase().includes(cleanBankName) ||
                            cleanBankName.includes(cleanName)
                        );
                    });
                    if (found) {
                        bankCode = found.code;
                        console.log(`[Paystack] Auto-resolved bank code for ${bankName}: ${bankCode}`);
                    }
                } catch (lookupErr) {
                    console.error("[Paystack] Bank lookup failed:", lookupErr?.message);
                }
            }

            let transferSuccess = false;
            let paystackData = null;
            let paystackErrorMsg = null;

            // Only attempt Paystack API if not explicitly marked manual and bank details exist
            if (!additionalData.manual && !additionalData.offline) {
                try {
                    if (accountNumber && bankCode) {
                        // 1. Create Transfer Recipient
                        const recipient = await PaystackService.createTransferRecipient({
                            name: accountName,
                            accountNumber: String(accountNumber),
                            bankCode: String(bankCode),
                            currency: "NGN",
                            type: "nuban",
                        });

                        if (recipient.status && recipient.data?.recipient_code) {
                            // 2. Initiate Transfer
                            const transfer = await PaystackService.initiateTransfer({
                                amount: transaction.amount,
                                recipient: recipient.data.recipient_code,
                                reason: transaction.description || "Abamba Seller Payout",
                                reference: transaction.reference,
                            });

                            if (transfer.status) {
                                transferSuccess = true;
                                paystackData = transfer.data;
                            } else {
                                paystackErrorMsg = transfer.message || "Failed to initiate transfer";
                            }
                        } else {
                            paystackErrorMsg = recipient.message || "Failed to create transfer recipient";
                        }
                    } else {
                        paystackErrorMsg = "Seller bank account number or bank code is missing";
                    }
                } catch (error) {
                    console.error("[processPayout] Paystack Error:", error?.response?.data || error.message);
                    paystackErrorMsg =
                        error.response?.data?.message ||
                        error.message ||
                        "Paystack transfer failed";
                }
            }

            if (transferSuccess && paystackData && String(paystackData.status).toLowerCase() !== "otp") {
                transaction.status = "completed";
                transaction.transactionId =
                    paystackData.transfer_code || transaction.transactionId || additionalData.transactionId;
                transaction.processedAt = new Date();
                transaction.metadata = {
                    ...transaction.metadata,
                    payoutMethod: "paystack_transfer",
                    paystackTransfer: paystackData,
                };
            } else if (additionalData.manual || additionalData.offline) {
                // Explicit manual disbursement by the admin - a bank reference is mandatory
                const bankReference = additionalData.transactionId || additionalData.bankReference;
                if (!bankReference) {
                    await Transaction.updateOne({ _id: transaction._id }, { $set: { status: "pending" } });
                    throw new AppError(
                        "A bank transaction reference is required to mark a payout as manually transferred.",
                        400,
                    );
                }
                transaction.status = "completed";
                transaction.transactionId = String(bankReference);
                transaction.processedAt = new Date();
                transaction.metadata = {
                    ...transaction.metadata,
                    payoutMethod: "manual_transfer",
                    note: additionalData.note || "Manually transferred by admin",
                };
            } else {
                // Paystack failed: do NOT pretend the payout is completed. Release the claim
                // so the payout stays pending and report the real reason to the admin.
                const reason =
                    paystackErrorMsg ||
                    (paystackData && String(paystackData.status).toLowerCase() === "otp"
                        ? "Paystack requires OTP confirmation for transfers (disable OTP in Paystack settings)"
                        : "Unknown Paystack error");
                console.error(`[processPayout] Paystack transfer failed for ${transaction.reference}: ${reason}`);
                await Transaction.updateOne(
                    { _id: transaction._id },
                    {
                        $set: {
                            status: "pending",
                            "metadata.lastPaystackError": reason,
                            "metadata.lastPaystackErrorAt": new Date(),
                        },
                    },
                );
                throw new AppError(
                    `Paystack transfer failed: ${reason}. The payout is still pending. Fix the issue and retry, or transfer manually and approve with { manual: true, transactionId: "<bank reference>" }.`,
                    400,
                );
            }

            // Remove from pending balance (atomic, never below 0)
            await User.updateOne({ _id: transaction.user }, [
                {
                    $set: {
                        "wallet.pendingBalance": {
                            $max: [0, { $subtract: [{ $ifNull: ["$wallet.pendingBalance", 0] }, transaction.amount] }],
                        },
                    },
                },
            ]);
        } else if (status === "failed" || status === "rejected") {
            // Atomic claim so a payout can only be rejected/refunded once
            const claimed = await Transaction.findOneAndUpdate(
                { _id: transaction._id, status: "pending" },
                { $set: { status: "processing" } },
                { new: true },
            );
            if (!claimed) {
                throw new AppError("Payout has already been processed.", 400);
            }
            transaction = claimed;

            transaction.status = "failed";
            transaction.failureReason = additionalData.failureReason || additionalData.reason || "Rejected by admin";
            transaction.rejectionReason = transaction.failureReason;
            transaction.processedAt = new Date();

            // Return amount back to balance and remove from pending (atomic)
            await User.updateOne({ _id: transaction.user }, [
                {
                    $set: {
                        "wallet.balance": {
                            $add: [{ $ifNull: ["$wallet.balance", 0] }, transaction.amount],
                        },
                        "wallet.pendingBalance": {
                            $max: [0, { $subtract: [{ $ifNull: ["$wallet.pendingBalance", 0] }, transaction.amount] }],
                        },
                    },
                },
            ]);
        }

        await transaction.save();
        return transaction;
    }

    /**
     * Revert a payout that was marked "completed" but never actually reached the bank.
     * Atomically flips completed -> cancelled (so it can only happen once) and,
     * optionally, returns the amount to the seller's available wallet balance.
     * @param {string} transactionId - Transaction ID or reference
     * @param {Object} options - { reason, refundToWallet = true, revertedBy }
     */
    async revertPayout(transactionId, options = {}) {
        const { reason, refundToWallet = true, revertedBy } = options;

        let transaction;
        if (transactionId && typeof transactionId === "string" && transactionId.match(/^[0-9a-fA-F]{24}$/)) {
            transaction = await Transaction.findById(transactionId);
        }
        if (!transaction) {
            transaction = await Transaction.findOne({
                $or: [{ reference: transactionId }, { transactionId: transactionId }],
            });
        }
        if (!transaction || transaction.type !== "payout") {
            throw new AppError("Payout not found", 404);
        }

        const reverted = await Transaction.findOneAndUpdate(
            { _id: transaction._id, status: "completed" },
            {
                $set: {
                    status: "cancelled",
                    failureReason: reason || "Reverted by admin: transfer never reached the bank",
                    processedAt: new Date(),
                    "metadata.reverted": true,
                    "metadata.revertedAt": new Date(),
                    "metadata.revertedBy": revertedBy || null,
                    "metadata.refundedToWallet": Boolean(refundToWallet),
                },
            },
            { new: true },
        );
        if (!reverted) {
            throw new AppError("Only completed payouts can be reverted.", 400);
        }

        if (refundToWallet) {
            await User.updateOne({ _id: reverted.user }, [
                {
                    $set: {
                        "wallet.balance": {
                            $add: [{ $ifNull: ["$wallet.balance", 0] }, reverted.amount],
                        },
                    },
                },
            ]);
        }

        return reverted;
    }

    /**
     * Get transaction by reference
     * @param {string} reference - Transaction reference
     * @returns {Promise<Object>} Transaction object
     */
    async getTransactionByReference(reference) {
        const transaction = await Transaction.findOne({ reference });
        if (!transaction) {
            throw new AppError("Transaction not found", 404);
        }
        return transaction;
    }
}

export default new TransactionService();
