import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import authMiddleware, { authorizeRoles } from "../middlewares/auth.middleware.js";
import {
    searchByFileNumber,
    addNewPatient,
    listPatients,
    openPatientFile,
    addPatientFileEntry,
    markAttendance,
    rechargePatient,
    downloadPatientReport,
    sharePatientIdWhatsApp,
    getBranchOperationsReport,
} from "../controllers/patient.controller.js";

// Configure document upload
const uploadDir = path.join(process.cwd(), "uploads", "documents");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname || "").toLowerCase();
        const safeBase = path
            .basename(file.originalname || "file", ext)
            .replace(/[^a-zA-Z0-9_-]/g, "_");
        cb(null, `${Date.now()}-${safeBase}${ext}`);
    }
});

const fileFilter = (_req, file, cb) => {
    const allowedMimes = ["application/pdf", "image/png", "image/jpeg"];
    const allowedExts = [".pdf", ".png", ".jpg", ".jpeg"];
    const ext = path.extname(file.originalname || "").toLowerCase();
    const mimeValid = allowedMimes.includes((file.mimetype || "").toLowerCase());
    const extValid = allowedExts.includes(ext);

    if (!mimeValid || !extValid) {
        return cb(new Error("Only PDF, PNG, or JPEG files are allowed"));
    }

    cb(null, true);
};

const documentUpload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    }
});

const router = express.Router();

router.use(authMiddleware, authorizeRoles("CLINIC"));

router.get("/report/operations", getBranchOperationsReport);
router.get("/search/:fileNumber", searchByFileNumber);
router.post("/search", searchByFileNumber);
router.get("/", listPatients);
router.post("/", documentUpload.single("document"), addNewPatient);
router.get("/:id/file", openPatientFile);
router.post("/:id/file-entries", addPatientFileEntry);
router.post("/attendance", markAttendance);
router.post("/recharge", rechargePatient);

router.get("/:id/report/download", downloadPatientReport);
router.get("/:id/share/whatsapp", sharePatientIdWhatsApp);




export default router;
