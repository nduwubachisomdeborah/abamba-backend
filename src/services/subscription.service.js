import Subscription from '../models/subscription.model.js';
import { AppError } from '../middlewares/error.js';
import crypto from 'crypto';
import PaginationUtil from '../utils/pagination.util.js';

class SubscriptionService {
  /**
   * Subscribe a new email
   * @param {Object} subscriptionData - Contains just the email address
   * @returns {Promise<Object>} New subscription
   */
  async subscribe(subscriptionData) {
    const { email } = subscriptionData;
    
    // Check if subscription already exists
    let subscription = await Subscription.findOne({ email });
    
    if (subscription) {
      // If already subscribed, return existing subscription
      if (subscription.status === 'confirmed') {
        return subscription;
      }
      
      // If pending or unsubscribed, update it
      subscription.status = 'pending';
      
      // Generate new confirmation token
      const confirmationToken = crypto.randomBytes(32).toString('hex');
      subscription.confirmationToken = confirmationToken;
      subscription.confirmationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      await subscription.save();
      return subscription;
    }
    
    // Create new subscription
    const confirmationToken = crypto.randomBytes(32).toString('hex');
    const unsubscribeToken = crypto.randomBytes(32).toString('hex');
    
    subscription = new Subscription({
      email,
      confirmationToken,
      confirmationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      unsubscribeToken,
      subscribedAt: new Date()
    });
    
    await subscription.save();
    
    return subscription;
  }
  
  /**
   * Confirm a subscription using confirmation token
   * @param {string} token - Confirmation token
   * @returns {Promise<Object>} Confirmed subscription
   */
  async confirmSubscription(token) {
    const subscription = await Subscription.findOne({
      confirmationToken: token,
      confirmationExpires: { $gt: Date.now() }
    });
    
    if (!subscription) {
      throw new AppError('Invalid or expired confirmation token', 400);
    }
    
    subscription.status = 'confirmed';
    subscription.confirmationToken = undefined;
    subscription.confirmationExpires = undefined;
    subscription.confirmedAt = new Date();
    
    await subscription.save();
    
    return subscription;
  }
  
  /**
   * Unsubscribe using unsubscribe token
   * @param {string} token - Unsubscribe token
   * @returns {Promise<Object>} Unsubscribed subscription
   */
  async unsubscribe(token) {
    const subscription = await Subscription.findOne({
      unsubscribeToken: token
    });
    
    if (!subscription) {
      throw new AppError('Invalid unsubscribe token', 400);
    }
    
    subscription.status = 'unsubscribed';
    subscription.unsubscribedAt = new Date();
    
    await subscription.save();
    
    return subscription;
  }
  
  // Removed updatePreferences method as we no longer store preferences
  
  /**
   * Get all subscriptions with pagination and filtering
   * @param {Object} query - Query parameters for pagination and filtering
   * @returns {Promise<Object>} Subscriptions and pagination info
   */
  async getAllSubscriptions(query = {}) {
    const { page = 1, limit = 10, status, source } = query;
    
    // Get pagination options
    const { page: pageNum, limit: limitNum, skip } = PaginationUtil.getPaginationOptions({ page, limit });
    
    const filter = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (source) {
      filter.source = source;
    }
    
    // Get total count for pagination
    const total = await Subscription.countDocuments(filter);
    
    // Get paginated subscriptions
    const subscriptions = await Subscription.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('user', 'firstName lastName email')
      .lean();
      
    // Get pagination data
    const paginationData = PaginationUtil.getPaginationData(total, pageNum, limitNum);
    
    return {
      subscriptions,
      pagination: paginationData
    };
  }
  
  /**
   * Get subscription by email
   * @param {string} email - Email address
   * @returns {Promise<Object>} Subscription
   */
  async getSubscriptionByEmail(email) {
    const subscription = await Subscription.findOne({ email });
    
    if (!subscription) {
      throw new AppError('Subscription not found', 404);
    }
    
    return subscription;
  }
  
  /**
   * Delete subscription
   * @param {string} email - Email address
   * @returns {Promise<void>}
   */
  async deleteSubscription(email) {
    const result = await Subscription.deleteOne({ email });
    
    if (result.deletedCount === 0) {
      throw new AppError('Subscription not found', 404);
    }
  }
}

export default new SubscriptionService();
