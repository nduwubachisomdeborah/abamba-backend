import axios from "axios";
import { AppError } from "../middlewares/error.js";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

/**
 * Build a multimodal content array from a list of image URLs.
 * Prepends a text prompt then appends each image as a URL reference.
 *
 * @param {string} textPrompt - The text instruction
 * @param {string[]} imageUrls - Array of publicly-accessible image URLs
 * @returns {Array} OpenRouter content array
 */
function buildVisionContent(textPrompt, imageUrls) {
    const content = [{ type: "text", text: textPrompt }];

    for (const url of imageUrls) {
        content.push({
            type: "image_url",
            image_url: { url },
        });
    }

    return content;
}

/**
 * Send a chat completion request to OpenRouter.
 *
 * @param {Array} messages - OpenAI-style messages array
 * @param {string} [model] - Model to use (defaults to env or free vision model)
 * @returns {Promise<string>} The assistant reply text
 */
async function chatCompletion(messages, model) {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        throw new AppError(
            "OPENROUTER_API_KEY is not configured on the server",
            500
        );
    }

    const selectedModel =
        model ||
        process.env.OPENROUTER_MODEL ||
        "meta-llama/llama-4-maverick:free";

    try {
        const response = await axios.post(
            `${OPENROUTER_BASE_URL}/chat/completions`,
            {
                model: selectedModel,
                messages,
            },
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": process.env.SITE_URL || "https://abamba.com.ng",
                    "X-Title": process.env.SITE_NAME || "Abamba",
                },
                timeout: 60_000,
            }
        );

        const choice = response.data?.choices?.[0];

        if (!choice) {
            throw new AppError("No response returned from AI model", 502);
        }

        return choice.message?.content?.trim() ?? "";
    } catch (error) {
        // Re-throw our own errors directly
        if (error instanceof AppError) throw error;

        // Surface OpenRouter API errors
        const status = error.response?.status;
        const message =
            error.response?.data?.error?.message ||
            error.message ||
            "AI service request failed";

        throw new AppError(message, status || 502);
    }
}

class AIService {
    /**
     * Generate a concise, market-ready product name from one or more product images.
     *
     * @param {string[]} imageUrls - Publicly-accessible URLs of product images
     * @param {Object} [hints={}] - Optional context hints
     * @param {string} [hints.category] - Product category hint
     * @param {string} [hints.brand] - Brand hint
     * @param {string} [hints.model] - Override default AI model
     * @returns {Promise<Object>} { name, suggestions }
     */
    async generateProductName(imageUrls, hints = {}) {
        if (!imageUrls || imageUrls.length === 0) {
            throw new AppError(
                "At least one product image URL is required",
                400
            );
        }

        const contextLines = [];
        if (hints.category) contextLines.push(`Category: ${hints.category}`);
        if (hints.brand) contextLines.push(`Brand: ${hints.brand}`);

        const contextBlock =
            contextLines.length > 0
                ? `\nAdditional context:\n${contextLines.join("\n")}`
                : "";

        const prompt =
            `You are an expert e-commerce product naming specialist. ` +
            `Analyse the product in the image(s) and respond with ONLY a JSON object (no markdown) in this exact format:\n` +
            `{"name":"<primary product name>","suggestions":["<alt name 1>","<alt name 2>","<alt name 3>"]}\n` +
            `Rules:\n` +
            `- The primary name must be clear, concise (3-8 words), and market-ready.\n` +
            `- Do NOT include brand names unless clearly visible on the product.\n` +
            `- Do NOT include prices, sizes, or quantities in the name.\n` +
            `- Provide 3 alternative name suggestions in the suggestions array.` +
            contextBlock;

        const content = buildVisionContent(prompt, imageUrls);

        const messages = [{ role: "user", content }];

        const raw = await chatCompletion(messages, hints.model);

        // Strip any accidental markdown fences before parsing
        const cleaned = raw.replace(/```(?:json)?/gi, "").trim();

        try {
            const parsed = JSON.parse(cleaned);

            return {
                name: parsed.name || "",
                suggestions: Array.isArray(parsed.suggestions)
                    ? parsed.suggestions
                    : [],
            };
        } catch {
            // If parsing fails return the raw text as the name
            return { name: raw, suggestions: [] };
        }
    }

    /**
     * Generate a compelling product description using the product name and images.
     *
     * @param {string} productName - The product name to base the description on
     * @param {string[]} imageUrls - Publicly-accessible URLs of product images
     * @param {Object} [hints={}] - Optional context hints
     * @param {string} [hints.category] - Product category hint
     * @param {string} [hints.brand] - Brand hint
     * @param {string} [hints.targetAudience] - Target audience hint
     * @param {string} [hints.model] - Override default AI model
     * @returns {Promise<Object>} { description, shortDescription, keyFeatures }
     */
    async generateProductDescription(productName, imageUrls, hints = {}) {
        if (!productName || !productName.trim()) {
            throw new AppError("Product name is required", 400);
        }

        if (!imageUrls || imageUrls.length === 0) {
            throw new AppError(
                "At least one product image URL is required",
                400
            );
        }

        const contextLines = [`Product name: ${productName}`];
        if (hints.category) contextLines.push(`Category: ${hints.category}`);
        if (hints.brand) contextLines.push(`Brand: ${hints.brand}`);
        if (hints.targetAudience)
            contextLines.push(`Target audience: ${hints.targetAudience}`);

        const prompt =
            `You are an expert e-commerce copywriter. ` +
            `Using the product image(s) and the context below, write compelling product copy.\n` +
            `Context:\n${contextLines.join("\n")}\n\n` +
            `Respond with ONLY a JSON object (no markdown) in this exact format:\n` +
            `{"description":"<full description, 80-150 words>","shortDescription":"<one-sentence tagline>","keyFeatures":["<feature 1>","<feature 2>","<feature 3>","<feature 4>","<feature 5>"]}\n` +
            `Rules:\n` +
            `- The description must be engaging, benefit-focused, and professional.\n` +
            `- Do NOT invent specifications not visible in the image.\n` +
            `- Write in second-person or third-person (no "I").\n` +
            `- keyFeatures must be short bullet-style phrases (max 10 words each).`;

        const content = buildVisionContent(prompt, imageUrls);

        const messages = [{ role: "user", content }];

        const raw = await chatCompletion(messages, hints.model);

        const cleaned = raw.replace(/```(?:json)?/gi, "").trim();

        try {
            const parsed = JSON.parse(cleaned);

            return {
                description: parsed.description || "",
                shortDescription: parsed.shortDescription || "",
                keyFeatures: Array.isArray(parsed.keyFeatures)
                    ? parsed.keyFeatures
                    : [],
            };
        } catch {
            return {
                description: raw,
                shortDescription: "",
                keyFeatures: [],
            };
        }
    }
}

export default new AIService();
