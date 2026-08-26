import { Router } from 'express';
import SubscriptionController from '../../controllers/subscription.controller.js';
import { validateSubscribe } from '../../validators/subscription.validator.js';
import { authenticate, restrictTo } from '../../middlewares/auth.js';

const router = Router();

// Public routes
router.post('/', validateSubscribe, SubscriptionController.subscribe);
router.get('/confirm/:token', SubscriptionController.confirmSubscription);
router.get('/unsubscribe/:token', SubscriptionController.unsubscribe);

// Admin-only routes
router.use(authenticate);
router.use(restrictTo('admin'));

router.get('/', SubscriptionController.getAllSubscriptions);
router.get('/:email', SubscriptionController.getSubscriptionByEmail);
router.delete('/:email', SubscriptionController.deleteSubscription);

export default router;
