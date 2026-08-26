import subscriptionService from '../services/subscription.service.js';
import { asyncHandler } from '../middlewares/error.js';
import { successResponse, errorResponse } from '../utils/response.util.js';

class SubscriptionController {
  /**
   * @desc    Subscribe to email updates
   * @route   POST /api/v1/subscriptions
   * @access  Public
   */
  static subscribe = asyncHandler(async (req, res) => {
    const subscription = await subscriptionService.subscribe(req.body);
    
    // In a real application, you would send a confirmation email here
    
    return successResponse(res, 'Subscription created successfully. Please check your email to confirm.', subscription);
  });

  /**
   * @desc    Confirm subscription
   * @route   GET /api/v1/subscriptions/confirm/:token
   * @access  Public
   */
  static confirmSubscription = asyncHandler(async (req, res) => {
    const subscription = await subscriptionService.confirmSubscription(req.params.token);
    
    return successResponse(res, 'Subscription confirmed successfully', subscription);
  });

  /**
   * @desc    Unsubscribe
   * @route   GET /api/v1/subscriptions/unsubscribe/:token
   * @access  Public
   */
  static unsubscribe = asyncHandler(async (req, res) => {
    const subscription = await subscriptionService.unsubscribe(req.params.token);
    
    return successResponse(res, 'Unsubscribed successfully', subscription);
  });

  // Removed updatePreferences method as we no longer store preferences

  /**
   * @desc    Get all subscriptions
   * @route   GET /api/v1/subscriptions
   * @access  Private/Admin
   */
  static getAllSubscriptions = asyncHandler(async (req, res) => {
    const { subscriptions, pagination } = await subscriptionService.getAllSubscriptions(req.query);
    
    return successResponse(res, 'Subscriptions retrieved successfully', { subscriptions, pagination });
  });

  /**
   * @desc    Get subscription by email
   * @route   GET /api/v1/subscriptions/:email
   * @access  Private/Admin
   */
  static getSubscriptionByEmail = asyncHandler(async (req, res) => {
    const subscription = await subscriptionService.getSubscriptionByEmail(req.params.email);
    
    return successResponse(res, 'Subscription retrieved successfully', subscription);
  });

  /**
   * @desc    Delete subscription
   * @route   DELETE /api/v1/subscriptions/:email
   * @access  Private/Admin
   */
  static deleteSubscription = asyncHandler(async (req, res) => {
    await subscriptionService.deleteSubscription(req.params.email);
    
    return successResponse(res, 'Subscription deleted successfully', null);
  });
}

export default SubscriptionController;
