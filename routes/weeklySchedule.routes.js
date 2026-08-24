import express from "express";

import authMiddleware, {
    authorizeRoles
} from "../middlewares/auth.middleware.js";

import {
    addWeeklySchedule,
    getWeeklySchedule,
    getWeeklyScheduleByDay,
    updateWeeklySchedule,
    deleteWeeklySchedule
} from "../controllers/weeklySchedule.controller.js";


const router = express.Router();


// ======================================================
// Authentication + Clinic Role
// ======================================================
router.use(
    authMiddleware,
    authorizeRoles("CLINIC")
);


// ======================================================
// ADD
// POST /api/weekly-schedule
// ======================================================
router.post(
    "/",
    addWeeklySchedule
);


// ======================================================
// GET ALL 7 DAYS
// GET /api/weekly-schedule
// ======================================================
router.get(
    "/",
    getWeeklySchedule
);


// ======================================================
// GET BY DAY
// GET /api/weekly-schedule/day/MONDAY
// ======================================================
router.get(
    "/day/:day",
    getWeeklyScheduleByDay
);


// ======================================================
// UPDATE
// PUT /api/weekly-schedule/:id
// ======================================================
router.put(
    "/:id",
    updateWeeklySchedule
);


// ======================================================
// DELETE
// DELETE /api/weekly-schedule/:id
// ======================================================
router.delete(
    "/:id",
    deleteWeeklySchedule
);


export default router;