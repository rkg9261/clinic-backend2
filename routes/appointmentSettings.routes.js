import express from "express";

import authMiddleware, {
    authorizeRoles
} from "../middlewares/auth.middleware.js";

import {
    addAppointmentSettings,
    getAppointmentSettings,
    updateAppointmentSettings,
    deleteAppointmentSettings
} from "../controllers/appointmentSettings.controller.js";


const router = express.Router();


// ======================================================
// Authentication + Clinic Role
// ======================================================
router.use(
    authMiddleware,
    authorizeRoles("CLINIC")
);


// ======================================================
// ADD APPOINTMENT SETTINGS
// POST /api/appointment-settings
// ======================================================
router.post(
    "/",
    addAppointmentSettings
);


// ======================================================
// GET APPOINTMENT SETTINGS
// GET /api/appointment-settings
// ======================================================
router.get(
    "/",
    getAppointmentSettings
);


// ======================================================
// UPDATE APPOINTMENT SETTINGS
// PUT /api/appointment-settings
// ======================================================
router.put(
    "/",
    updateAppointmentSettings
);


// ======================================================
// DELETE APPOINTMENT SETTINGS
// DELETE /api/appointment-settings
// ======================================================
router.delete(
    "/",
    deleteAppointmentSettings
);


export default router;