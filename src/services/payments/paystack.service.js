import axios from "axios";
import { genUnique } from "../../helpers/index.js";

class PaystackService {
    constructor() {
        this.secretKey = process.env.PAYSTACK_API_KEY;
        this.currency = process.env.CURRENCY || "NGN";
        this.api = axios.create({
            baseURL: "https://api.paystack.co",
            headers: {
                Authorization: `Bearer ${this.secretKey}`,
                "Content-Type": "application/json",
            },
            timeout: 30000, // 30 second timeout
        });

        // Debug interceptor for requests
        this.api.interceptors.request.use(
            (config) => {
                console.log(
                    `[PaystackService] Request: ${config.method?.toUpperCase()} ${config.url}`,
                );
                return config;
            },
            (error) => {
                console.error(
                    "[PaystackService] Request Error:",
                    error.message,
                );
                return Promise.reject(error);
            },
        );

        // Debug interceptor for responses
        this.api.interceptors.response.use(
            (response) => {
                console.log(
                    `[PaystackService] Response: ${response.status} from ${response.config.url}`,
                );
                return response;
            },
            (error) => {
                if (error.code === "ECONNABORTED") {
                    console.error(
                        "[PaystackService] TIMEOUT - Request took too long",
                    );
                } else if (error.code === "ENOTFOUND") {
                    console.error(
                        "[PaystackService] DNS Error - Cannot resolve host",
                    );
                } else if (!error.response) {
                    console.error(
                        "[PaystackService] Network Error - No response received:",
                        error.message,
                    );
                }
                return Promise.reject(error);
            },
        );
    }

    getReference() {
        return "PSK-" + genUnique() + "-" + Date.now();
    }

    async initializeTransaction({
        email,
        amount,
        reference,
        callback_url,
        metadata = {},
    }) {
        const payload = {
            email,
            amount: Math.round(amount * 100),
            currency: this.currency,
            reference: reference || this.getReference(),
            callback_url,
            metadata,
        };
        const res = await this.api.post("/transaction/initialize", payload);
        return res.data;
    }

    async verifyTransaction(reference) {
        const res = await this.api.get(`/transaction/verify/${reference}`);
        return res.data;
    }

    async getBankList(country = "NG") {
        const codes = {
            NG: "nigeria",
        };
        const response = await this.api.get(
            `/bank?country=${(codes[country] || country).toLowerCase()}`,
        );
        return response.data;
    }

    async initiateTransfer({ amount, recipient, reason, reference }) {
        const payload = {
            source: "balance",
            amount: Math.round(amount * 100),
            recipient,
            reference: reference || this.getReference(),
            reason,
        };

        const startTime = Date.now();
        console.log("[PaystackService] initiateTransfer - START", {
            payload,
            timestamp: new Date().toISOString(),
        });

        try {
            const response = await this.api.post("/transfer", payload);
            const duration = Date.now() - startTime;
            console.log("[PaystackService] initiateTransfer - SUCCESS", {
                duration: `${duration}ms`,
                status: response.status,
                timestamp: new Date().toISOString(),
            });
            return response.data;
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error("[PaystackService] initiateTransfer - ERROR", {
                duration: `${duration}ms`,
                status: error.response?.status,
                message: error.message,
                data: error.response?.data,
                code: error.code,
                timestamp: new Date().toISOString(),
            });
            throw error;
        }
    }

    async createTransferRecipient({
        name,
        accountNumber,
        bankCode,
        currency = "NGN",
        type = "nuban",
    }) {
        // Ensure account_number and bank_code are strings (Paystack requires string values)
        const payload = {
            type,
            name: String(name),
            account_number: String(accountNumber),
            bank_code: String(bankCode),
            currency,
        };

        const startTime = Date.now();
        console.log("[PaystackService] createTransferRecipient - START", {
            payload,
            timestamp: new Date().toISOString(),
        });

        try {
            const response = await this.api.post("/transferrecipient", payload);
            const duration = Date.now() - startTime;
            console.log("[PaystackService] createTransferRecipient - SUCCESS", {
                duration: `${duration}ms`,
                status: response.status,
                timestamp: new Date().toISOString(),
            });
            return response.data;
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error("[PaystackService] createTransferRecipient - ERROR", {
                duration: `${duration}ms`,
                status: error.response?.status,
                message: error.message,
                data: error.response?.data,
                code: error.code,
                timestamp: new Date().toISOString(),
            });
            throw error;
        }
    }

    async resolveAccountNumber({ accountNumber, bankCode }) {
        const response = await this.api.get(
            `/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
        );
        return response.data;
    }

    addFee(targetAmount, currency = "NGN") {
        if (currency === "NGN") {
            const rate = 0.015;
            const extra = 100;
            const feeCap = 2000;

            // Step 1: Try compute WITHOUT cap
            // For amounts >= 2500 → extra ₦100 applies
            const withExtra = targetAmount >= 2500;

            let customerPays;
            let fee;

            if (withExtra) {
                // Equation:
                // target = X - (0.015X + 100)
                // (1 - 0.015)X = target + 100
                // 0.985X = target + 100
                customerPays = (targetAmount + extra) / (1 - rate);
                fee = rate * customerPays + extra;
            } else {
                // For amounts under 2500 → NO extra 100
                // target = X - (0.015X)
                // 0.985X = target
                customerPays = targetAmount / (1 - rate);
                fee = rate * customerPays;
            }

            // Step 2: Apply cap if needed
            if (fee > feeCap) {
                fee = feeCap;
                customerPays = targetAmount + fee;
            }

            // Round to 2 decimals
            const r = (v) => Math.round(v * 100) / 100;

            return {
                merchantReceives: r(targetAmount),
                customerPays: r(customerPays),
                fee: r(fee),
            };
        }

        return {
            customerPays: targetAmount,
            fee: 0,
            merchantReceives: targetAmount,
        };
    }
}

export default new PaystackService();
