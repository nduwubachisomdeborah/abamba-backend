import axios from "axios";
import { genUnique } from "../../helpers/index.js";

class FunzService {
    constructor() {
        this.apiKey = process.env.FUNZ_API_KEY;
        this.apiSecret = process.env.FUNZ_API_SECRET;
        this.baseURL =
            process.env.FUNZ_API_URL ||
            "https://gateway-staging.funzweb.com/api";
        this.token = null;
        this.tokenExpiresAt = null;

        this.api = axios.create({
            baseURL: this.baseURL,
            headers: { "Content-Type": "application/json" },
            timeout: 30000,
        });

        this.api.interceptors.request.use(
            (config) => {
                console.log(
                    `[FunzService] Request: ${config.method?.toUpperCase()} ${config.url}`,
                );
                return config;
            },
            (error) => {
                console.error("[FunzService] Request Error:", error.message);
                return Promise.reject(error);
            },
        );

        this.api.interceptors.response.use(
            (response) => {
                console.log(
                    `[FunzService] Response: ${response.status} from ${response.config.url}`,
                );
                return response;
            },
            (error) => {
                if (error.code === "ECONNABORTED") {
                    console.error(
                        "[FunzService] TIMEOUT - Request took too long",
                    );
                } else if (error.code === "ENOTFOUND") {
                    console.error(
                        "[FunzService] DNS Error - Cannot resolve host",
                    );
                } else if (!error.response) {
                    console.error(
                        "[FunzService] Network Error - No response received:",
                        error.message,
                    );
                }
                return Promise.reject(error);
            },
        );
    }

    /**
     * Authenticate with Funz Gateway and cache the bearer token.
     */
    async authenticate() {
        // Reuse cached token if still valid (with 60s buffer)
        if (
            this.token &&
            this.tokenExpiresAt &&
            new Date(this.tokenExpiresAt).getTime() > Date.now() + 60000
        ) {
            return this.token;
        }

        const res = await this.api.post("/v1/authenticate", {
            api_key: this.apiKey,
            api_secret: this.apiSecret,
        });

        this.token = res.data.token;
        this.tokenExpiresAt = res.data.expires_at;

        return this.token;
    }

    /**
     * Get an authenticated axios instance (auto-refreshes token).
     */
    async getAuthApi() {
        const token = await this.authenticate();
        return axios.create({
            baseURL: this.baseURL,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            timeout: 30000,
        });
    }

    getReference() {
        return "FNZ-" + genUnique() + "-" + Date.now();
    }

    /**
     * Initialize a transaction on Funz Gateway.
     * Returns { message, payment_url }
     */
    async initializeTransaction({
        email,
        amount,
        reference,
        customerName,
        phoneNumber,
        description = "Order payment",
        callbackUrl,
        metadata = [],
    }) {
        const authApi = await this.getAuthApi();

        const payload = {
            amount,
            description,
            reference: reference || this.getReference(),
            customer_email: email,
            customer_name: customerName,
            phone_number: Number(String(phoneNumber).replace(/\D/g, "")) || 0,
            callback_url: callbackUrl || null,
            metadata: metadata.length ? metadata : null,
        };

        const res = await authApi.post("/v1/transactions", payload);
        return res.data;
    }

    /**
     * Fetch a transaction by ID or reference from Funz Gateway.
     * Returns { data: TransactionResource }
     */
    async getTransaction(idOrReference) {
        const authApi = await this.getAuthApi();
        const res = await authApi.get(
            `/v1/transactions/${encodeURIComponent(idOrReference)}`,
        );
        return res.data;
    }

    /**
     * Verify a transaction by checking its status.
     * Returns the transaction data if successful, throws if not.
     */
    async verifyTransaction(reference) {
        const result = await this.getTransaction(reference);
        return result;
    }
}

export default new FunzService();
