import express from "express";

import authMiddleware, {
    authorizeRoles
} from "../middlewares/auth.middleware.js";

import {
    addFaq,
    getFaqs,
    getFaqById,
    updateFaq,
    deleteFaq,
    searchFaq
} from "../controllers/faq.controller.js";


const router = express.Router();


// ======================================================
// GET ALL FAQS
// GET /api/faqs without authentication
// ======================================================
router.get(
    "/",
    getFaqs
);



// ======================================================
// Authentication + Clinic Role
// ======================================================
router.use(
    authMiddleware,
    authorizeRoles("CLINIC")
);


// ======================================================
// ADD FAQ
// POST /api/faqs
// ======================================================
router.post(
    "/",
    addFaq
);



// ======================================================
// SEARCH FAQ
// GET /api/faqs/search?keyword=appointment
// ======================================================
router.get(
    "/search",
    searchFaq
);


// ======================================================
// GET FAQ BY ID
// GET /api/faqs/:id
// ======================================================
router.get(
    "/:id",
    getFaqById
);


// ======================================================
// UPDATE FAQ
// PUT /api/faqs/:id
// ======================================================
router.put(
    "/:id",
    updateFaq
);


// ======================================================
// DELETE FAQ
// DELETE /api/faqs/:id
// ======================================================
router.delete(
    "/:id",
    deleteFaq
);


export default router;