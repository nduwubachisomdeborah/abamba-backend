import express from 'express';
import AddressController from '../../controllers/address.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { validateAddress, validateUpdateAddress } from '../../validators/address.validator.js';

const router = express.Router();

// Protect all address routes
router.use(authenticate);

// Address routes
router.get('/', AddressController.getAddresses);
router.get('/:id', AddressController.getAddressById);
router.post('/', validateAddress, AddressController.addAddress);
router.patch('/:id', validateUpdateAddress, AddressController.updateAddress);
router.patch('/:id/default', AddressController.setDefaultAddress);
router.delete('/:id', AddressController.deleteAddress);

export default router;
