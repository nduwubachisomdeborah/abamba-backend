import productService from '../services/product.service.js';
import Product from '../models/product.model.js';
import { asyncHandler } from '../middlewares/error.js';
import { successResponse, badResponse } from '../utils/response.util.js';

class AdminProductController {
  /**
   * @desc    Get products pending approval
   * @route   GET /api/v1/admin/products/pending
   * @access  Private (Admin only)
   */
  static getProductsPendingApproval = asyncHandler(async (req, res) => {
    const { products, pagination } = await productService.getProductsPendingApproval(req.query);
    
    return successResponse(res, 'Products pending approval retrieved successfully', {
      products,
      pagination
    });
  });

  /**
   * @desc    Get disabled products
   * @route   GET /api/v1/admin/products/disabled
   * @access  Private (Admin only)
   */
  static getDisabledProducts = asyncHandler(async (req, res) => {
    const { products, pagination } = await productService.getDisabledProducts(req.query);
    
    return successResponse(res, 'Disabled products retrieved successfully', {
      products,
      pagination
    });
  });

  /**
   * @desc    Approve a product
   * @route   PATCH /api/v1/admin/products/:id/approve
   * @access  Private (Admin only)
   */
  static approveProduct = asyncHandler(async (req, res) => {
    const product = await productService.approveProduct(req.params.id, req.user.id);
    
    return successResponse(res, 'Product approved successfully', product);
  });

  /**
   * @desc    Reject product approval
   * @route   PATCH /api/v1/admin/products/:id/reject
   * @access  Private (Admin only)
   */
  static rejectProductApproval = asyncHandler(async (req, res) => {
    const product = await productService.rejectProductApproval(req.params.id);
    
    return successResponse(res, 'Product approval rejected', product);
  });

  /**
   * @desc    Disable a product
   * @route   PATCH /api/v1/admin/products/:id/disable
   * @access  Private (Admin only)
   */
  static disableProduct = asyncHandler(async (req, res) => {
    const { reason } = req.body;
    
    if (!reason) {
      return badResponse(res, 'Please provide a reason for disabling the product');
    }
    
    const product = await productService.disableProduct(req.params.id, req.user.id, reason);
    
    return successResponse(res, 'Product disabled successfully', product);
  });

  /**
   * @desc    Enable a disabled product
   * @route   PATCH /api/v1/admin/products/:id/enable
   * @access  Private (Admin only)
   */
  static enableProduct = asyncHandler(async (req, res) => {
    const product = await productService.enableProduct(req.params.id);
    
    return successResponse(res, 'Product enabled successfully', product);
  });

  /**
   * @desc    Toggle product recommendation
   * @route   PATCH /api/v1/admin/products/:id/toggle-recommend
   * @access  Private (Admin only)
   */
  static toggleProductRecommendation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isRecommended } = req.body;

    let product;
    if (typeof isRecommended !== 'undefined') {
      product = await Product.findByIdAndUpdate(
        id,
        { isRecommended: Boolean(isRecommended) },
        { new: true }
      );
    } else {
      const current = await Product.findById(id);
      if (!current) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
      current.isRecommended = !current.isRecommended;
      product = await current.save();
    }

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    return res.status(200).json({
      success: true,
      message: `Product ${product.isRecommended ? 'pinned to' : 'unpinned from'} Recommended`,
      data: product,
    });
  });
}

export default AdminProductController;
