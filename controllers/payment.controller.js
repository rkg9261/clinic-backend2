import crypto from "crypto";
import Razorpay from "razorpay";
import { db } from "../config/db.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});
/*
Create Razorpay Order
*/
export const createPaymentOrder = async (req, res) => {
  try {
    const {
      appointmentId,
      amount
    } = req.body;

    if (!appointmentId) {
      return res.status(400).json({
        success: false,
        message: "Appointment ID is required."
      });
    }

    const paymentAmount = Number(amount);

    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment amount."
      });
    }

    // Check appointment
    const [appointments] = await db.query(
      `
      SELECT id
      FROM appointments
      WHERE id = ?
      LIMIT 1
      `,
      [appointmentId]
    );

    if (!appointments.length) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found."
      });
    }

    // Check existing payment
    const [existingPayment] = await db.query(
      `
      SELECT *
      FROM appointment_payments
      WHERE appointment_id = ?
      LIMIT 1
      `,
      [appointmentId]
    );

    if (
      existingPayment.length &&
      existingPayment[0].payment_status === "CAPTURED"
    ) {
      return res.status(400).json({
        success: false,
        message: "Appointment payment is already completed."
      });
    }

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: Math.round(paymentAmount * 100),
      currency: "INR",
      receipt: `appointment_${appointmentId}`,
      notes: {
        appointmentId: String(appointmentId)
      }
    });

    if (existingPayment.length) {

      await db.query(
        `
        UPDATE appointment_payments
        SET
          razorpay_order_id = ?,
          amount = ?,
          currency = 'INR',
          payment_status = 'PENDING',
          updated_at = CURRENT_TIMESTAMP
        WHERE appointment_id = ?
        `,
        [
          order.id,
          paymentAmount,
          appointmentId
        ]
      );

    } else {

      await db.query(
        `
        INSERT INTO appointment_payments
        (
          appointment_id,
          razorpay_order_id,
          amount,
          currency,
          payment_status
        )
        VALUES (?, ?, ?, 'INR', 'PENDING')
        `,
        [
          appointmentId,
          order.id,
          paymentAmount
        ]
      );

    }

    return res.status(201).json({
      success: true,
      message: "Payment order created.",
      data: {
        appointmentId,
        orderId: order.id,
        amount: paymentAmount,
        currency: "INR",
        keyId: process.env.RAZORPAY_KEY_ID
      }
    });

  } catch (error) {

    console.error(
      "CREATE PAYMENT ORDER ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to create payment order."+error.message
    });
  }
};
/*
5. Verify Razorpay payment

This is the most important API.
*/
export const verifyPayment = async (req, res) => {
  try {

    const {
      appointmentId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    if (
      !appointmentId ||
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment verification data is incomplete."
      });
    }

    // Get order from OUR database
    const [payments] = await db.query(
      `
      SELECT *
      FROM appointment_payments
      WHERE appointment_id = ?
      AND razorpay_order_id = ?
      LIMIT 1
      `,
      [
        appointmentId,
        razorpay_order_id
      ]
    );

    if (!payments.length) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found."
      });
    }

    // Create server-side signature
    const generatedSignature =
      crypto
        .createHmac(
          "sha256",
          process.env.RAZORPAY_KEY_SECRET
        )
        .update(
          `${razorpay_order_id}|${razorpay_payment_id}`
        )
        .digest("hex");

    // Verify signature
    if (
      generatedSignature !== razorpay_signature
    ) {

      await db.query(
        `
        UPDATE appointment_payments
        SET
          payment_status = 'FAILED',
          failure_reason = 'Invalid payment signature'
        WHERE appointment_id = ?
        `,
        [appointmentId]
      );

      return res.status(400).json({
        success: false,
        message: "Payment verification failed."
      });
    }

    // Save successful verification
    await db.query(
      `
      UPDATE appointment_payments
      SET
        razorpay_payment_id = ?,
        razorpay_signature = ?,
        payment_status = 'CAPTURED',
        updated_at = CURRENT_TIMESTAMP
      WHERE appointment_id = ?
      `,
      [
        razorpay_payment_id,
        razorpay_signature,
        appointmentId
      ]
    );

    return res.json({
      success: true,
      message: "Payment verified successfully.",
      data: {
        appointmentId,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        paymentStatus: "CAPTURED"
      }
    });

  } catch (error) {

    console.error(
      "VERIFY PAYMENT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to verify payment."
    });
  }
};

/*
6. Get payment status

This is the API you can call from your admin panel, appointment list, etc.
*/
export const getPaymentStatus = async (req, res) => {
  try {

    const { appointmentId } = req.params;

    const [payments] = await db.query(
      `
      SELECT
        id,
        appointment_id,
        razorpay_order_id,
        razorpay_payment_id,
        amount,
        currency,
        payment_status,
        payment_method,
        failure_reason,
        created_at,
        updated_at
      FROM appointment_payments
      WHERE appointment_id = ?
      LIMIT 1
      `,
      [appointmentId]
    );

    if (!payments.length) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found."
      });
    }

    return res.json({
      success: true,
      data: payments[0]
    });

  } catch (error) {

    console.error(
      "GET PAYMENT STATUS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to get payment status."
    });
  }
};
/*
    7. Razorpay Webhook
        This is important because the customer can close the browser, lose internet, or the frontend may not receive the response. 
        Razorpay recommends webhooks for reliable server-side payment tracking.
*/
export const razorpayWebhook = async (req, res) => {

  try {

    const webhookSignature =
      req.headers["x-razorpay-signature"];

    if (!webhookSignature) {
      return res.status(400).json({
        success: false,
        message: "Webhook signature missing."
      });
    }

    const expectedSignature =
      crypto
        .createHmac(
          "sha256",
          process.env.RAZORPAY_WEBHOOK_SECRET
        )
        .update(req.rawBody)
        .digest("hex");

    if (
      expectedSignature !== webhookSignature
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid webhook signature."
      });
    }

    const event = req.body.event;

    const payment =
      req.body?.payload?.payment?.entity;

    if (!payment) {
      return res.json({
        success: true
      });
    }

    const razorpayOrderId =
      payment.order_id;

    const razorpayPaymentId =
      payment.id;

    let paymentStatus = null;

    if (event === "payment.authorized") {
      paymentStatus = "AUTHORIZED";
    }

    if (event === "payment.captured") {
      paymentStatus = "CAPTURED";
    }

    if (event === "payment.failed") {
      paymentStatus = "FAILED";
    }

    if (!paymentStatus) {
      return res.json({
        success: true
      });
    }

    await db.query(
      `
      UPDATE appointment_payments
      SET
        razorpay_payment_id = ?,
        payment_status = ?,
        payment_method = ?,
        failure_reason = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE razorpay_order_id = ?
      `,
      [
        razorpayPaymentId,
        paymentStatus,
        payment.method || null,
        payment.error_description || null,
        razorpayOrderId
      ]
    );

    return res.json({
      success: true
    });

  } catch (error) {

    console.error(
      "RAZORPAY WEBHOOK ERROR:",
      error
    );

    return res.status(500).json({
      success: false
    });
  }
};