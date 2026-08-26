import Transaction from "../models/transaction.model.js";
import User from "../models/user.model.js";
import { AppError } from "../middlewares/error.js";
import { v4 as uuidv4 } from "uuid";
import PaystackService from "./payments/paystack.service.js";

class TransactionService {
    /**
     * Create a payout request
     * @param {string} userId - User ID requesting payout
     * @param {Object} payoutData - Payout data (only amount and optional description)
     * @returns {Promise<Object>} Transaction object
     */
    async createPayout(userId, payoutData) {
        const { amount, description } = payoutData;

        // Validate user exists and is a seller
        const user = await User.findById(userId).populate("bank");
        if (!user) {
            throw new AppError("User not found", 404);
        }

        if (user.role !== "seller") {
            throw new AppError("Only sellers can request payouts", 403);
        }

        // Check if user has bank details
        if (!user.bank) {
            throw new AppError(
                "Bank account not found. Please add your bank details before requesting a payout",
                400,
            );
        }

        // Check if user has sufficient balance
        if (user.wallet.balance < amount) {
            throw new AppError("Insufficient wallet balance", 400);
        }

        // Generate unique reference
        const reference = `PYT-${uuidv4().substring(0, 8).toUpperCase()}`;

        // Create transaction with bank details from user profile
        const transaction = new Transaction({
            user: userId,
            type: "payout",
            amount,
            method: "bank_transfer",
            accountDetails: {
                bankName: user.bank.bankName,
                accountNumber: user.bank.accountNumber.toString(),
                accountName: user.bank.accountName,
                bankCode: user.bank.bankCode,
            },
            description: description || "Payout request",
            reference,
            status: "pending",
        });

        await transaction.save();

        // Update user's wallet - move amount from balance to pendingBalance
        await User.findByIdAndUpdate(userId, {
            $inc: {
                "wallet.balance": -amount,
                "wallet.pendingBalance": amount,
            },
        });

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
        }).sort({ createdAt: -1 });
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

        return await Transaction.find(query).sort({ createdAt: -1 });
    }

    /**
     * Process a payout (admin function)
     * @param {string} transactionId - Transaction ID
     * @param {string} status - New status ('completed' or 'failed')
     * @param {Object} additionalData - Additional data for processing
     * @returns {Promise<Object>} Updated transaction
     */
    async processPayout(transactionId, status, additionalData = {}) {
        const transaction = await Transaction.findById(transactionId);
        if (!transaction) {
            throw new AppError("Transaction not found", 404);
        }

        if (transaction.status !== "pending") {
            throw new AppError("Transaction is not in pending status", 400);
        }

        if (!["completed", "failed"].includes(status)) {
            throw new AppError("Invalid status", 400);
        }

        if (status === "completed") {
            try {
                const user = await User.findById(transaction.user).populate(
                    "bank",
                );

                if (!user || user.role !== "seller") {
                    throw new AppError("User not found", 404);
                }

                if (!user.bank) {
                    throw new AppError(
                        "Bank account not found. Please add your bank details before requesting a payout",
                        400,
                    );
                }

                // 1. Create Transfer Recipient
                const recipient = await PaystackService.createTransferRecipient(
                    {
                        name: user.bank.accountName,
                        accountNumber: user.bank.accountNumber,
                        bankCode: user.bank.bankCode,
                        currency: "NGN",
                        type: "nuban",
                    },
                );

                console.log({ recipient });

                if (!recipient.status) {
                    throw new AppError(
                        "Failed to create transfer recipient: " +
                            recipient.message,
                        500,
                    );
                }

                // 2. Initiate Transfer
                const transfer = await PaystackService.initiateTransfer({
                    amount: transaction.amount,
                    recipient: recipient.data.recipient_code,
                    reason: transaction.description || "Abamba Payout",
                    reference: transaction.reference,
                });

                console.log({ transfer });

                if (!transfer.status) {
                    throw new AppError(
                        "Failed to initiate transfer: " + transfer.message,
                        500,
                    );
                }

                transaction.status = "completed";
                transaction.transactionId =
                    transfer.data.transfer_code || additionalData.transactionId;
                transaction.processedAt = new Date();
                transaction.metadata = {
                    ...transaction.metadata,
                    paystackTransfer: transfer.data,
                };

                // Remove from pending balance since payout is complete
                await User.findByIdAndUpdate(transaction.user, {
                    $inc: {
                        "wallet.pendingBalance": -transaction.amount,
                    },
                });
            } catch (error) {
                console.log(error?.response?.data);
                // If Paystack processing fails, keep as pending or mark failed?
                // For now, let's propagate the error so admin knows it failed
                throw new AppError(
                    error.message || "Payout processing failed",
                    500,
                );
            }
        } else if (status === "failed") {
            transaction.status = "failed";
            transaction.failureReason = additionalData.failureReason;
            transaction.processedAt = new Date();

            // Return amount back to balance and remove from pending
            await User.findByIdAndUpdate(transaction.user, {
                $inc: {
                    "wallet.balance": transaction.amount,
                    "wallet.pendingBalance": -transaction.amount,
                },
            });
        }

        await transaction.save();
        return transaction;
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
