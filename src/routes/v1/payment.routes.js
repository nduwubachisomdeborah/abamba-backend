import { Router } from "express";
import PaymentController from "../../controllers/payment.controller.js";

const router = Router();

router.post("/webhook/paystack", PaymentController.webhookPaystack);
router.post("/webhook/funz", PaymentController.webhookFunz);

router.get("/providers", PaymentController.getPaymentProviders);

router.get("/status", PaymentController.getPaymentStatus);

export default router;
