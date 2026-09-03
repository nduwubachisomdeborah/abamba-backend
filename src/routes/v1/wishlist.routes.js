import { Router } from 'express';
import WishlistController from '../../controllers/wishlist.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { validateCreateWishlist, validateUpdateWishlist, validateAddProduct } from '../../validators/wishlist.validator.js';

const router = Router();

// All wishlist routes require authentication
router.use(authenticate);

// User wishlist routes
router.get('/', WishlistController.getWishlists);
router.post('/', validateCreateWishlist, WishlistController.createWishlist);
router.get('/:id', WishlistController.getWishlistById);
router.patch('/:id', validateUpdateWishlist, WishlistController.updateWishlist);
router.delete('/:id', WishlistController.deleteWishlist);

// Product in wishlist routes
router.post('/products', validateAddProduct, WishlistController.addProductToDefaultWishlist);
router.post('/toggle', validateAddProduct, WishlistController.addProductToDefaultWishlist);
router.post('/products/:productId', WishlistController.addProductToDefaultWishlist);
router.delete('/products/:productId', WishlistController.removeProductFromDefaultWishlist);
router.post('/:id/products', validateAddProduct, WishlistController.addProductToWishlist);
router.delete('/:id/products/:productId', WishlistController.removeProductFromWishlist);

export default router;
