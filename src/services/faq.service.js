import FAQ from "../models/faq.model.js";
import { AppError } from "../middlewares/error.js";

class FaqService {
    async createFaq(faqData) {
        const faq = new FAQ(faqData);
        await faq.save();
        return faq;
    }

    async getAllFaqs(options = {}) {
        const {
            page = 1,
            limit = 10,
            search = "",
            category = "",
            isPublished,
        } = options;

        const query = { deleted: { $ne: true } };

        // Search in question and answer
        if (search) {
            query.$or = [
                { question: { $regex: search, $options: "i" } },
                { answer: { $regex: search, $options: "i" } },
            ];
        }

        // Filter by category
        if (category) {
            query.category = { $regex: category, $options: "i" };
        }

        // Filter by published status
        if (isPublished !== undefined) {
            query.isPublished = isPublished === "true" || isPublished === true;
        }

        const skip = (page - 1) * limit;

        const faqs = await FAQ.find(query)
            .sort({ order: 1, createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await FAQ.countDocuments(query);

        return {
            faqs,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            total,
        };
    }

    async getFaqById(faqId) {
        const faq = await FAQ.findById(faqId);
        if (!faq || faq.deleted) {
            throw new AppError("FAQ not found", 404);
        }
        return faq;
    }

    async updateFaq(faqId, updateData) {
        const faq = await FAQ.findById(faqId);
        if (!faq || faq.deleted) {
            throw new AppError("FAQ not found", 404);
        }

        Object.keys(updateData).forEach((key) => {
            if (updateData[key] !== undefined) {
                faq[key] = updateData[key];
            }
        });

        await faq.save();
        return faq;
    }

    async deleteFaq(faqId) {
        const faq = await FAQ.findById(faqId);
        if (!faq || faq.deleted) {
            throw new AppError("FAQ not found", 404);
        }

        faq.deleted = true;
        faq.deletedAt = new Date();
        await faq.save();
    }

    async getFaqCategories() {
        const categories = await FAQ.distinct("category", {
            deleted: { $ne: true },
        });
        return categories;
    }
}

export default new FaqService();
