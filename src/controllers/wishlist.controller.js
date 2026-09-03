import wishlistService from '../services/wishlist.service.js';
import { asyncHandler } from '../middlewares/error.js';
import { successResponse, errorResponse } from '../utils/response.util.js';

class WishlistController {
  /**
   * @desc    Get all user's wishlists
   * @route   GET /api/v1/wishlists
   * @access  Private
   */
  static getWishlists = asyncHandler(async (req, res) => {
    const { wishlists, pagination } = await wishlistService.getWishlists(req.user.id, req.query);
    
    return successResponse(res, 'Wishlists retrieved successfully', { wishlists, pagination });
  });

  /**
   * @desc    Get a specific wishlist
   * @route   GET /api/v1/wishlists/:id
   * @access  Private (own wishlist) or Public (if wishlist is public)
   */
  static getWishlistById = asyncHandler(async (req, res) => {
    const wishlist = await wishlistService.getWishlistById(req.params.id, req.user.id);
    
    return successResponse(res, 'Wishlist retrieved successfully', wishlist);
  });

  /**
   * @desc    Create a new wishlist
   * @route   POST /api/v1/wishlists
   * @access  Private
   */
  static createWishlist = asyncHandler(async (req, res) => {
    const wishlist = await wishlistService.createWishlist(req.user.id, req.body);
    
    return successResponse(res, 'Wishlist created successfully', wishlist);
  });

  /**
   * @desc    Add product to wishlist
   * @route   POST /api/v1/wishlists/:id/products
   * @access  Private
   */
  static addProductToWishlist = asyncHandler(async (req, res) => {
    const wishlist = await wishlistService.addProductToWishlist(
      req.params.id,
      req.user.id,
      req.body
    );
    
    return successResponse(res, 'Product added to wishlist successfully', wishlist);
  });
  
  /**
   * @desc    Toggle product in default wishlist (Add if absent, remove if present)
   * @route   POST /api/v1/wishlists/products
   * @access  Private
   */
  static addProductToDefaultWishlist = asyncHandler(async (req, res) => {
    const result = await wishlistService.toggleWishlistProduct(
      req.user.id,
      req.body.productId
    );
    
    return res.status(200).json({
      status: "success",
      success: true,
      message: result.isWishlisted ? "Added to wishlist" : "Removed from wishlist",
      data: {
        isWishlisted: result.isWishlisted,
        isInWishlist: result.isInWishlist,
        count: result.count,
        wishlist: result.wishlist
      }
    });
  });

  /**
   * @desc    Remove product from wishlist
   * @route   DELETE /api/v1/wishlists/:id/products/:productId
   * @access  Private
   */
  static removeProductFromWishlist = asyncHandler(async (req, res) => {
    const wishlist = await wishlistService.removeProductFromWishlist(
      req.params.id,
      req.user.id,
      req.params.productId
    );
    
    return successResponse(res, 'Product removed from wishlist successfully', wishlist);
  });

  /**
   * @desc    Update wishlist details
   * @route   PATCH /api/v1/wishlists/:id
   * @access  Private
   */
  static updateWishlist = asyncHandler(async (req, res) => {
    const wishlist = await wishlistService.updateWishlist(
      req.params.id,
      req.user.id,
      req.body
    );
    
    return successResponse(res, 'Wishlist updated successfully', wishlist);
  });

  /**
   * @desc    Delete wishlist
   * @route   DELETE /api/v1/wishlists/:id
   * @access  Private
   */
  static deleteWishlist = asyncHandler(async (req, res) => {
    await wishlistService.deleteWishlist(req.params.id, req.user.id);
    
    return successResponse(res, 'Wishlist deleted successfully', null);
  });

  // Public wishlist functionality removed - wishlists are now private to each user
}

export default WishlistController;
