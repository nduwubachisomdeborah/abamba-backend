import express from 'express';
import OrderController from '../../controllers/order.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { adminOnly } from '../../middlewares/auth.js';
import { sellerOrAdmin } from '../../middlewares/seller.js';
import { validateCreateOrder, validateUpdateOrderStatus, validateUpdatePayment } from '../../validators/order.validator.js';

const router = express.Router();

// Protect all order routes
router.use(authenticate);

// Customer order routes
router.post('/', validateCreateOrder, OrderController.createOrder);
router.post('/payment/verify', OrderController.verifyPayment);

// Both customer and seller order routes
router.get('/', OrderController.getOrders);
router.get('/:id', OrderController.getOrderById);

// Admin-only routes
router.patch('/:id/status', adminOnly, validateUpdateOrderStatus, OrderController.updateOrderStatus);
router.patch('/:id/payment', adminOnly, validateUpdatePayment, OrderController.updatePayment);
router.delete('/:id', adminOnly, OrderController.deleteOrder);

export default router;
