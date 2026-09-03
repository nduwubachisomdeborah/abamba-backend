import express from 'express';
import CartController from '../../controllers/cart.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { validateAddItem, validateUpdateQuantity } from '../../validators/cart.validator.js';

const router = express.Router();

// Protect all cart routes
router.use(authenticate);

// Cart routes
router.get('/', CartController.getCart);
router.get('/items', CartController.getCart);
router.post('/', validateAddItem, CartController.addItem);
router.post('/items', validateAddItem, CartController.addItem);
router.patch('/items/:itemId', validateUpdateQuantity, CartController.updateItemQuantity);
router.delete('/items/:itemId', CartController.removeItem);
router.delete('/', CartController.clearCart);
router.delete('/clear', CartController.clearCart);
router.post('/clear', CartController.clearCart);

export default router;
