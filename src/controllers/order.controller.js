import orderService from '../services/order.service.js';
import paymentService from '../services/payment.service.js';
import User from '../models/user.model.js';
import { asyncHandler } from '../middlewares/error.js';
import { successResponse } from '../utils/response.util.js';

class OrderController {
  /**
   * @desc    Create a new order
   * @route   POST /api/v1/orders
   * @access  Private
   */
  static createOrder = asyncHandler(async (req, res) => {
    const shippingAddress = req.body.shippingAddress;
    const addressId = req.body.addressId;

    if (!shippingAddress && !addressId) {
      // Check if user has a registered address in DB
      const user = await User.findById(req.user.id);
      const defaultAddr = user?.addresses?.find((a) => a.isDefault) || user?.addresses?.[0];
      if (!defaultAddr) {
        return res.status(400).json({
          success: false,
          message: "Shipping address is required to place an order.",
        });
      }
      req.body.shippingAddress = defaultAddr;
    }

    const order = await orderService.createOrder(req.user.id, req.body);
    
    return successResponse(res, 'Order created successfully', order);
  });
  
  /**
   * @desc    Get all orders with pagination
   * @route   GET /api/v1/orders
   * @access  Private (Admin sees all, users see only their orders)
   */
  static getOrders = asyncHandler(async (req, res) => {
    const { orders, pagination } = await orderService.getOrders(
      req.query,
      req.user.id,
      req.user.role
    );
    
    return successResponse(res, 'Orders retrieved successfully', { orders, pagination });
  });
  
  /**
   * @desc    Get order by ID
   * @route   GET /api/v1/orders/:id
   * @access  Private (Admin sees all, users see only their orders)
   */
  static getOrderById = asyncHandler(async (req, res) => {
    const order = await orderService.getOrderById(
      req.params.id,
      req.user.id,
      req.user.role
    );
    
    return successResponse(res, 'Order retrieved successfully', order);
  });
  
  /**
   * @desc    Update order status
   * @route   PATCH /api/v1/orders/:id/status
   * @access  Private (Admin only)
   */
  static updateOrderStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    
    const order = await orderService.updateOrderStatus(
      req.params.id,
      status,
      req.user.id,
      req.user.role
    );
    
    return successResponse(res, 'Order status updated successfully', order);
  });
  
  /**
   * @desc    Update order payment information
   * @route   PATCH /api/v1/orders/:id/payment
   * @access  Private (Admin only)
   */
  static updatePayment = asyncHandler(async (req, res) => {
    const order = await orderService.updatePayment(
      req.params.id,
      req.body,
      req.user.id,
      req.user.role
    );
    
    return successResponse(res, 'Payment information updated successfully', order);
  });
  
  /**
   * @desc    Verify payment by reference and finalize orders in holder
   * @route   POST /api/v1/orders/payment/verify
   * @access  Private (Authenticated user)
   */
  static verifyPayment = asyncHandler(async (req, res) => {
    const { reference } = req.body;
    if (!reference) {
      return res.status(400).json({ success: false, message: 'reference is required' });
    }

    const result = await paymentService.verifyAndFinalizeByReference(reference);
    return successResponse(res, 'Payment verified and orders updated successfully', result);
  });
  
  /**
   * @desc    Delete order (soft delete)
   * @route   DELETE /api/v1/orders/:id
   * @access  Private (Admin only)
   */
  static deleteOrder = asyncHandler(async (req, res) => {
    const order = await orderService.deleteOrder(
      req.params.id,
      req.user.id,
      req.user.role
    );
    
    return successResponse(res, 'Order deleted successfully', order);
  });
}

export default OrderController;
