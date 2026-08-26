import { asyncHandler } from "../middlewares/error.js";
import { successResponse } from "../utils/response.util.js";
import faqService from "../services/faq.service.js";

class FaqController {
    static createFaq = asyncHandler(async (req, res) => {
        const faq = await faqService.createFaq(req.body);
        return successResponse(res, "FAQ created successfully", faq, 201);
    });

    static getAllFaqs = asyncHandler(async (req, res) => {
        const { page, limit, search, category, isPublished } = req.query;
        const data = await faqService.getAllFaqs({
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 10,
            search,
            category,
            isPublished,
        });
        return successResponse(res, "FAQs retrieved successfully", data);
    });

    static getFaqById = asyncHandler(async (req, res) => {
        const faq = await faqService.getFaqById(req.params.id);
        return successResponse(res, "FAQ retrieved successfully", faq);
    });

    static updateFaq = asyncHandler(async (req, res) => {
        const faq = await faqService.updateFaq(req.params.id, req.body);
        return successResponse(res, "FAQ updated successfully", faq);
    });

    static deleteFaq = asyncHandler(async (req, res) => {
        await faqService.deleteFaq(req.params.id);
        return successResponse(res, "FAQ deleted successfully", null);
    });

    static getFaqCategories = asyncHandler(async (req, res) => {
        const categories = await faqService.getFaqCategories();
        return successResponse(
            res,
            "FAQ categories retrieved successfully",
            categories
        );
    });
}

export default FaqController;
