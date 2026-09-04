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
        const user = await User.findById(userId);
        if (!user) {
            throw new AppError("User not found", 404);
        }

        const isSeller = user.role === "seller" || user.roles?.includes("seller");
        if (!isSeller) {
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
            throw new AppError(`Transaction is already ${transaction.status}`, 400);
        }

        if (!["completed", "failed"].includes(status)) {
            throw new AppError("Invalid status", 400);
        }

        if (status === "completed") {
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

            if (transferSuccess && paystackData) {
                transaction.status = "completed";
                transaction.transactionId =
                    paystackData.transfer_code || transaction.transactionId || additionalData.transactionId;
                transaction.processedAt = new Date();
                transaction.metadata = {
                    ...transaction.metadata,
                    payoutMethod: "paystack_transfer",
                    paystackTransfer: paystackData,
                };
            } else {
                // If Paystack automated transfer failed (e.g., inactive business/transfers disabled),
                // approve the payout in the system as manual transfer so the admin is not blocked.
                console.warn(`[processPayout] Paystack transfer skipped/failed: ${paystackErrorMsg}. Approving as manual payout.`);
                transaction.status = "completed";
                transaction.transactionId =
                    additionalData.transactionId || transaction.transactionId || `MAN-${Date.now()}`;
                transaction.processedAt = new Date();
                transaction.metadata = {
                    ...transaction.metadata,
                    payoutMethod: "manual_transfer",
                    paystackError: paystackErrorMsg,
                    note: paystackErrorMsg
                        ? `Approved in system. Paystack automated transfer notice: ${paystackErrorMsg}`
                        : "Approved manually by admin",
                };
            }

            // Remove from pending balance safely
            const sellerUser = await User.findById(transaction.user);
            if (sellerUser && sellerUser.wallet) {
                sellerUser.wallet.pendingBalance = Math.max(
                    0,
                    (Number(sellerUser.wallet.pendingBalance) || 0) - transaction.amount,
                );
                await sellerUser.save();
            }
        } else if (status === "failed") {
            transaction.status = "failed";
            transaction.failureReason = additionalData.failureReason || "Rejected by admin";
            transaction.processedAt = new Date();

            // Return amount back to balance and remove from pending
            const sellerUser = await User.findById(transaction.user);
            if (sellerUser) {
                if (!sellerUser.wallet) {
                    sellerUser.wallet = { balance: 0, pendingBalance: 0, holdBalance: 0 };
                }
                sellerUser.wallet.balance =
                    (Number(sellerUser.wallet.balance) || 0) + transaction.amount;
                sellerUser.wallet.pendingBalance = Math.max(
                    0,
                    (Number(sellerUser.wallet.pendingBalance) || 0) - transaction.amount,
                );
                await sellerUser.save();
            }
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
