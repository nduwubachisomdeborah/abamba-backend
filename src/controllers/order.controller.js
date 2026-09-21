import orderService from '../services/order.service.js';
import paymentService from '../services/payment.service.js';
import User from '../models/user.model.js';
import { asyncHandler, AppError } from '../middlewares/error.js';
import { successResponse } from '../utils/response.util.js';

class OrderController {
  /**
   * @desc    Create a new order
   * @route   POST /api/v1/orders
   * @access  Private (Registered User)
   */
  static createOrder = asyncHandler(async (req, res) => {
    // Strictly disallow guest accounts from placing orders
    if (req.user?.isGuest || req.user?.role === 'guest' || req.decodedToken?.isGuest) {
      throw new AppError(
        'Guest checkout is not permitted. Please sign up or log in to place an order.',
        403
      );
    }

    const shippingAddress = req.body.shippingAddress;
    const addressId = req.body.addressId;
    const isPickup = Boolean(
      req.body.isPickupStation === true ||
      req.body.fulfillmentType === 'pickup_station' ||
      req.body.isPickup === true ||
      req.body.courierId === 'pickup-station' ||
      req.body.carrierId === 'pickup-station' ||
      req.body.courierName?.toLowerCase()?.includes('pick-up')
    );

    if (!shippingAddress && !addressId) {
      if (isPickup) {
        req.body.shippingAddress = {
          fullName: req.user?.name || "Customer",
          addressLine1: req.body.pickupStation?.address || "ANGELINA HOUSE, 31 WETHERAL ROAD OWERRI IMO STATE NIGERIA",
          addressLine2: "",
          city: "Owerri",
          state: "Imo",
          zipCode: "460281",
          country: "NG",
          phoneNumber: req.user?.phoneNumber || req.user?.phone || req.body.pickupStation?.customerPhone || "+2348060039760",
        };
      } else {
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
    } else if (shippingAddress && typeof shippingAddress === 'object' && !isPickup) {
      // Automatically attach shipping address to user profile if not already saved
      try {
        const user = await User.findById(req.user.id);
        if (user) {
          user.addresses = user.addresses || [];
          const alreadyExists = user.addresses.some(
            (a) =>
              a.addressLine1?.toLowerCase() === shippingAddress.addressLine1?.toLowerCase() &&
              a.city?.toLowerCase() === shippingAddress.city?.toLowerCase()
          );

          if (!alreadyExists && shippingAddress.addressLine1 && shippingAddress.city && shippingAddress.state) {
            user.addresses.push({
              fullName: shippingAddress.fullName || user.name || "Customer",
              addressLine1: shippingAddress.addressLine1,
              addressLine2: shippingAddress.addressLine2 || "",
              city: shippingAddress.city,
              state: shippingAddress.state,
              zipCode: shippingAddress.zipCode || "000000",
              country: shippingAddress.country || "NG",
              phoneNumber: shippingAddress.phoneNumber || user.phoneNumber || "0000000000",
              isDefault: user.addresses.length === 0 || Boolean(shippingAddress.isDefault || req.body.saveAddress),
            });
            await user.save();
          }
        }
      } catch (addrErr) {
        console.warn("Could not save address to user profile:", addrErr.message);
      }
    }

    const result = await orderService.createOrder(req.user.id, req.body);

    const primaryOrderId =
      result.orderId ||
      result.orders?.[0]?._id ||
      result.orderHolder?._id;
    const primaryOrderNum =
      result.orderHolder?.orderId ||
      result.orders?.[0]?.orderId ||
      `ORD-${primaryOrderId}`;
    const primaryTotal =
      result.totalAmount ||
      result.orderHolder?.total ||
      result.total;

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: {
        order: {
          _id: primaryOrderId,
          orderId: primaryOrderNum,
          total: primaryTotal,
        },
        orderId: primaryOrderId,
        totalAmount: primaryTotal,
        authorization_url:
          result.authorization_url ||
          result.providerInit?.data?.authorization_url,
        access_code:
          result.access_code ||
          result.providerInit?.data?.access_code,
        reference: result.reference || result.payment?.reference,
        providerInit: result.providerInit,
        ...result,
      },
    });
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
      req.user.role,
      req.user
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
      req.user.role,
      req.user
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
      req.user.role,
      req.user
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
   * @desc    Initialize or retry payment for an order / order holder
   * @route   POST /api/v1/orders/:id/payment/initialize or POST /api/v1/orders/payment/initialize
   * @access  Private (Registered User)
   */
  static initializeOrderPayment = asyncHandler(async (req, res) => {
    if (req.user?.isGuest || req.user?.role === 'guest' || req.decodedToken?.isGuest) {
      throw new AppError(
        'Guest checkout is not permitted. Please sign up or log in to initialize payment.',
        403
      );
    }

    const orderId = req.params.id || req.body.orderId || req.body.orderHolderId;
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required to initialize payment',
      });
    }

    const provider = req.body.provider || 'paystack';
    const callbackUrl = req.body.callbackUrl;

    const result = await paymentService.initializePaymentForOrder(
      orderId,
      req.user.id,
      { provider, callbackUrl }
    );

    return successResponse(res, 'Payment initialized successfully', result);
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
