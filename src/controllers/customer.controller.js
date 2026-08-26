import customerService from "../services/customer.service.js";
import { asyncHandler } from "../middlewares/error.js";
import { successResponse } from "../utils/response.util.js";

class CustomerController {
    /**
     * @desc    Get all customers who have purchased from this seller
     * @route   GET /api/v1/customers
     * @access  Private/Seller
     */
    getCustomers = asyncHandler(async (req, res) => {
        const result = await customerService.getSellerCustomers(req.user._id, {
            page: req.query.page,
            limit: req.query.limit,
            search: req.query.search,
            sortBy: req.query.sortBy,
            sortOrder: req.query.sortOrder,
        });

        return successResponse(res, "Customers retrieved successfully", result);
    });

    /**
     * @desc    Get a specific customer by ID (must have purchased from seller)
     * @route   GET /api/v1/customers/:customerId
     * @access  Private/Seller
     */
    getCustomerById = asyncHandler(async (req, res) => {
        const { customerId } = req.params;
        const customer = await customerService.getSellerCustomerById(
            req.user._id,
            customerId
        );

        return successResponse(
            res,
            "Customer details retrieved successfully",
            customer
        );
    });

    /**
     * @desc    Get orders for a specific customer (only orders with seller's products)
     * @route   GET /api/v1/customers/:customerId/orders
     * @access  Private/Seller
     */
    getCustomerOrders = asyncHandler(async (req, res) => {
        const { customerId } = req.params;
        const result = await customerService.getCustomerOrdersForSeller(
            req.user._id,
            customerId,
            {
                page: req.query.page,
                limit: req.query.limit,
                status: req.query.status,
                sortBy: req.query.sortBy || "createdAt",
                sortOrder: req.query.sortOrder || "desc",
            }
        );

        return successResponse(
            res,
            "Customer orders retrieved successfully",
            result
        );
    });

    /**
     * @desc    Get customer metrics overview for seller dashboard
     * @route   GET /api/v1/customers/metrics/overview
     * @access  Private/Seller
     */
    getCustomerMetrics = asyncHandler(async (req, res) => {
        const metrics = await customerService.getSellerCustomerMetrics(
            req.user._id
        );

        return successResponse(
            res,
            "Customer metrics retrieved successfully",
            metrics
        );
    });

    /**
     * @desc    Get recent customers who purchased from this seller
     * @route   GET /api/v1/customers/metrics/recent
     * @access  Private/Seller
     */
    getRecentCustomers = asyncHandler(async (req, res) => {
        const limit = parseInt(req.query.limit) || 5;
        const customers = await customerService.getRecentCustomersForSeller(
            req.user._id,
            limit
        );

        return successResponse(
            res,
            "Recent customers retrieved successfully",
            customers
        );
    });

    /**
     * @desc    Get top customers by purchase amount
     * @route   GET /api/v1/customers/metrics/top
     * @access  Private/Seller
     */
    getTopCustomers = asyncHandler(async (req, res) => {
        const limit = parseInt(req.query.limit) || 5;
        const period = req.query.period || "month"; // day, week, month, year, all

        const customers = await customerService.getTopCustomersForSeller(
            req.user._id,
            limit,
            period
        );

        return successResponse(
            res,
            "Top customers retrieved successfully",
            customers
        );
    });
}

export default new CustomerController();
