import { Router } from 'express';
import AdminProductController from '../../controllers/admin.product.controller.js';
import { authenticate, restrictTo } from '../../middlewares/auth.js';
import { validateDisableReason } from '../../validators/admin.product.validator.js';

const router = Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(restrictTo('admin'));

// Get products pending approval
router.get('/pending', AdminProductController.getProductsPendingApproval);

// Get disabled products
router.get('/disabled', AdminProductController.getDisabledProducts);

// Product approval endpoints
router.patch('/:id/approve', AdminProductController.approveProduct);
router.patch('/:id/reject', AdminProductController.rejectProductApproval);

// Product disable/enable endpoints
router.patch('/:id/disable', validateDisableReason, AdminProductController.disableProduct);
router.patch('/:id/enable', AdminProductController.enableProduct);

export default router;
