import express from "express";
import {
  createAppointment,
  getAppointmentByDate,
  getAppointment,
  getAppointmentById,
  deleteAppointment,
} from "../controllers/appointment.controller.js";
// import authMiddleware, {
//   authorizeRoles,
// } from "../middlewares/auth.middleware.js";

const router = express.Router();

// router.use(authMiddleware, authorizeRoles("PATIENT"));
//localhost:5000  Z
router.post("/create", createAppointment);
router.get("/list", getAppointment)
router.get("/listbydate/:date", getAppointmentByDate)
router.get("/:id", getAppointmentById)
router.delete("/:id", deleteAppointment)

export default router;
