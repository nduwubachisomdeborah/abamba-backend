import cartService from '../services/cart.service.js';
import { asyncHandler } from '../middlewares/error.js';
import { successResponse } from '../utils/response.util.js';

class CartController {
  /**
   * @desc    Get user's cart
   * @route   GET /api/v1/cart
   * @access  Private
   */
  static getCart = asyncHandler(async (req, res) => {
    const cart = await cartService.getCart(req.user.id);
    
    return successResponse(res, 'Cart retrieved successfully', cart);
  });
  
  /**
   * @desc    Add item to cart
   * @route   POST /api/v1/cart
   * @access  Private
   */
  static addItem = asyncHandler(async (req, res) => {
    const cart = await cartService.addItem(req.user.id, req.body);
    
    return successResponse(res, 'Item added to cart successfully', cart);
  });
  
  /**
   * @desc    Update cart item quantity
   * @route   PATCH /api/v1/cart/items/:itemId
   * @access  Private
   */
  static updateItemQuantity = asyncHandler(async (req, res) => {
    const { itemId } = req.params;
    const { quantity } = req.body;
    
    const cart = await cartService.updateItemQuantity(req.user.id, itemId, quantity);
    
    return successResponse(res, 'Cart item updated successfully', cart);
  });
  
  /**
   * @desc    Remove item from cart
   * @route   DELETE /api/v1/cart/items/:itemId
   * @access  Private
   */
  static removeItem = asyncHandler(async (req, res) => {
    const { itemId } = req.params;
    
    const cart = await cartService.removeItem(req.user.id, itemId);
    
    return successResponse(res, 'Item removed from cart successfully', cart);
  });
  
  /**
   * @desc    Clear cart
   * @route   DELETE /api/v1/cart
   * @access  Private
   */
  static clearCart = asyncHandler(async (req, res) => {
    const cart = await cartService.clearCart(req.user.id);
    
    return successResponse(res, 'Cart cleared successfully', cart);
  });
}

export default CartController;
