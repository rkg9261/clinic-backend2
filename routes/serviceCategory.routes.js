import express from "express";

import {
    createServiceCategory,
    getServiceCategories,
    getServiceCategoryById,
    updateServiceCategory,
    changeCategoryStatus,
    deleteServiceCategory
} from "../controllers/serviceCategory.controller.js";

import authMiddleware, { authorizeRoles } from "../middlewares/auth.middleware.js";


const router = express.Router();

router.use(authMiddleware, authorizeRoles("CLINIC"));

router.post("/", createServiceCategory);

router.get("/",  getServiceCategories);

router.get("/:id",  getServiceCategoryById);

router.put("/:id",  updateServiceCategory);

router.patch("/:id/status",  changeCategoryStatus);

router.delete("/:id",  deleteServiceCategory);

export default router;


// get category by according to catgory
