import express from "express";

import authMiddleware, {
    authorizeRoles
} from "../middlewares/auth.middleware.js";

import {
    addBlockedSlot,
    getBlockedSlots,
    getBlockedSlotsByDate,
    getBlockedSlotById,
    updateBlockedSlot,
    deleteBlockedSlot
} from "../controllers/blockedSlot.controller.js";


const router = express.Router();


// ======================================================
// Authentication + Clinic Role
// ======================================================
router.use(
    authMiddleware,
    authorizeRoles("CLINIC")
);


// ======================================================
// ADD BLOCKED SLOT
// POST /api/blocked-slots
// ======================================================
router.post(
    "/",
    addBlockedSlot
);


// ======================================================
// GET ALL BLOCKED SLOTS
// GET /api/blocked-slots
// ======================================================
router.get(
    "/",
    getBlockedSlots
);


// ======================================================
// GET BLOCKED SLOTS BY DATE
// GET /api/blocked-slots/date/2026-08-24
// ======================================================
router.get(
    "/date/:date",
    getBlockedSlotsByDate
);


// ======================================================
// GET BLOCKED SLOT BY ID
// GET /api/blocked-slots/10
// ======================================================
router.get(
    "/:id",
    getBlockedSlotById
);


// ======================================================
// UPDATE
// PUT /api/blocked-slots/10
// ======================================================
router.put(
    "/:id",
    updateBlockedSlot
);


// ======================================================
// DELETE / UNBLOCK
// DELETE /api/blocked-slots/10
// ======================================================
router.delete(
    "/:id",
    deleteBlockedSlot
);


export default router;