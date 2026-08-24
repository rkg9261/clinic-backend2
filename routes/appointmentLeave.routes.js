import express from "express";

import authMiddleware, {
    authorizeRoles
} from "../middlewares/auth.middleware.js";

import {
    addAppointmentLeave,
    getAppointmentLeaves,
    getAppointmentLeaveById,
    updateAppointmentLeave,
    deleteAppointmentLeave,
    checkAppointmentLeave
} from "../controllers/appointmentLeave.controller.js";


const router = express.Router();


// ======================================================
// Authentication + Clinic Role
// ======================================================
router.use(
    authMiddleware,
    authorizeRoles("CLINIC")
);


// ======================================================
// ADD LEAVE
// POST /api/appointment-leaves
// ======================================================
router.post(
    "/",
    addAppointmentLeave
);


// ======================================================
// GET ALL LEAVES
// GET /api/appointment-leaves
// ======================================================
router.get(
    "/",
    getAppointmentLeaves
);


// ======================================================
// CHECK DATE
// GET /api/appointment-leaves/check/2026-09-15
// ======================================================
router.get(
    "/check/:date",
    checkAppointmentLeave
);


// ======================================================
// GET LEAVE BY ID
// GET /api/appointment-leaves/10
// ======================================================
router.get(
    "/:id",
    getAppointmentLeaveById
);


// ======================================================
// UPDATE LEAVE
// PUT /api/appointment-leaves/10
// ======================================================
router.put(
    "/:id",
    updateAppointmentLeave
);


// ======================================================
// DELETE LEAVE
// DELETE /api/appointment-leaves/10
// ======================================================
router.delete(
    "/:id",
    deleteAppointmentLeave
);


export default router;