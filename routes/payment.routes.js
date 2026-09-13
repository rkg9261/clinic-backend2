import express from "express";

import {
  createPaymentOrder,
  verifyPayment,
  getPaymentStatus,
  razorpayWebhook
} from "../controllers/payment.controller.js";

const router = express.Router();

router.post(
  "/create-order",
  createPaymentOrder
);

router.post(
  "/verify",
  verifyPayment
);

router.get(
  "/status/:appointmentId",
  getPaymentStatus
);

router.post(
  "/webhook",
  razorpayWebhook
);

export default router;