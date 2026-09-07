import express from "express";

import authMiddleware, {
    authorizeRoles
} from "../middlewares/auth.middleware.js";

import {
    addBlog,
    getBlogs,
    getBlogById,
    updateBlog,
    deleteBlog,
    searchBlog
} from "../controllers/blog.controller.js";


const router = express.Router();


// ======================================================
// Authentication + Clinic Role
// ======================================================
router.use(
    authMiddleware,
    authorizeRoles("CLINIC")
);


// ======================================================
// ADD BLOG
// POST /api/blogs
// ======================================================
router.post(
    "/",
    addBlog
);


// ======================================================
// GET ALL BLOGS
// GET /api/blogs
// ======================================================
router.get(
    "/",
    getBlogs
);


// ======================================================
// SEARCH BLOG
// GET /api/blogs/search?keyword=doctor
// ======================================================
router.get(
    "/search",
    searchBlog
);


// ======================================================
// GET BLOG BY ID
// GET /api/blogs/:id
// ======================================================
router.get(
    "/:id",
    getBlogById
);


// ======================================================
// UPDATE BLOG
// PUT /api/blogs/:id
// ======================================================
router.put(
    "/:id",
    updateBlog
);


// ======================================================
// DELETE BLOG
// DELETE /api/blogs/:id
// ======================================================
router.delete(
    "/:id",
    deleteBlog
);


export default router;