import express from "express";

import {
    createServiceSubCategory,
    getServiceSubCategories,
    getServiceSubCategoryById,
    updateServiceSubCategory,
    changeSubCategoryStatus,
    deleteServiceSubCategory
} from "../controllers/serviceSubCategory.controller.js";

import authMiddleware, { authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware, authorizeRoles("CLINIC"));

router.post("/",  createServiceSubCategory);

router.get("/",  getServiceSubCategories);

router.get("/:id",  getServiceSubCategoryById);

router.put("/:id",  updateServiceSubCategory);

router.patch("/:id/status",  changeSubCategoryStatus);

router.delete("/:id",  deleteServiceSubCategory);

export default router;