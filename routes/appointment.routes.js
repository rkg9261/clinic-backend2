import express from "express";
import {
  createAppointment,
  getAppointment,
  getAppointmentById,
  deleteAppointment,
} from "../controllers/appointment.controller.js";
// import authMiddleware, {
//   authorizeRoles,
// } from "../middlewares/auth.middleware.js";

const router = express.Router();

// router.use(authMiddleware, authorizeRoles("PATIENT"));

router.post("/create", createAppointment);
router.get("/list", getAppointment)
router.get("/:id", getAppointmentById)
router.delete("/:id", deleteAppointment)

export default router;
