import express from "express";


import authMiddleware, {
    authorizeRoles
} from "../middlewares/auth.middleware.js";

import {
    getNext7DaysAvailability,
    //getAvailableTimeSlots
} from "../controllers/appointmentAvailability.controller.js";

const router = express.Router();

// ======================================================
// Authentication + Clinic Role
// ======================================================
// router.use(
//     authMiddleware,
//     authorizeRoles("CLINIC")
// );


router.get(
    "/next-7-days/:branch_id",
    getNext7DaysAvailability
);

// router.get(
//     "/slots/:branch_id/:date",
//     getAvailableTimeSlots
// );

export default router;