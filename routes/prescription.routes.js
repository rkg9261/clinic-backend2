import express from "express";
import {
  getPrescriptionPrefill,
  getPrescriptionFormTemplate,
  createPrescription,
  getPrescriptions,
  getPrescriptionById,
  updatePrescription,
  cancelPrescription,
  deletePrescription,
} from "../controllers/prescription.controller.js";
import authMiddleware, { authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware, authorizeRoles("CLINIC"));

router.get("/prefill", getPrescriptionPrefill);
router.get("/form-template", getPrescriptionFormTemplate);
router.post("/", createPrescription);
router.get("/", getPrescriptions);
router.patch("/:id/cancel", cancelPrescription);
router.get("/:id", getPrescriptionById);
router.put("/:id", updatePrescription);
router.delete("/:id", deletePrescription);

export default router;
