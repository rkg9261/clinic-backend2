import express from "express";
import {
    createClinic,
    listClinics,
    getClinicById,
    listMyCreatedClinics,
    updateClinic
} from "../controllers/clinic.controller.js";
import authMiddleware, { authorizeRoles } from "../middlewares/auth.middleware.js";
import { clinicUpload } from "../middlewares/upload.middleware.js";

const router = express.Router();

router.use(authMiddleware, authorizeRoles("ADMIN"));

router.post("/", clinicUpload, createClinic);
router.get("/", listClinics);
router.get("/my", listMyCreatedClinics);
router.get("/:id", getClinicById);
router.put("/:id", clinicUpload, updateClinic);

export default router;
