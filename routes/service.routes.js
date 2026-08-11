import express from "express";

import {
    createService,
    getServices,
    getServiceById,
    updateService,
    changeServiceStatus,
    deleteService
} from "../controllers/service.controller.js";

import authMiddleware, { authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware, authorizeRoles("CLINIC"));

router.post("/",  createService);

router.get("/",  getServices);

router.get("/:id",  getServiceById);

router.put("/:id",  updateService);

router.patch("/:id/status" , changeServiceStatus);

router.delete("/:id",  deleteService);

export default router;
