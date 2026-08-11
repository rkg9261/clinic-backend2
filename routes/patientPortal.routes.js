import express from "express";
import authMiddleware, { authorizeRoles } from "../middlewares/auth.middleware.js";
import {
    linkPatientAccount,
    getMyPatientCard,
    getMyAttendance,
    getMyReports,
    shareMyIdOnWhatsApp
} from "../controllers/patientPortal.controller.js";

const router = express.Router();

router.use(authMiddleware, authorizeRoles("PATIENT"));

router.post("/link", linkPatientAccount);
router.get("/card", getMyPatientCard);
router.get("/attendance", getMyAttendance);
router.get("/reports", getMyReports);
router.get("/share/whatsapp", shareMyIdOnWhatsApp);

export default router;
