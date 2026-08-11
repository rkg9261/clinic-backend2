import express from "express";

import {
    register,
    roleBasedLogin,
    refreshAccessToken,
    logout,
    verifyEmail,
    resendVerification
} from "../controllers/auth.controller.js";
import authMiddleware, {
    authorizeRoles,
    optionalAuth
} from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register", optionalAuth, register);
router.post("/login", roleBasedLogin);
router.post("/refresh", refreshAccessToken);
router.post("/logout", logout);
router.get("/verify-email", verifyEmail);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);

router.get("/me", authMiddleware, (req, res) => {
    return res.status(200).json({
        success: true,
        data: req.user
    });
});

router.get("/admin-only", authMiddleware, authorizeRoles("ADMIN"), (req, res) => {
    return res.status(200).json({
        success: true,
        message: "Welcome Admin"
    });
});

router.get(
    "/clinic-only",
    authMiddleware,
    authorizeRoles("CLINIC"),
    (req, res) => {
        return res.status(200).json({
            success: true,
            message: "Welcome Clinic"
        });
    }
);

router.get("/patient-only", authMiddleware, authorizeRoles("PATIENT"), (req, res) => {
    return res.status(200).json({
        success: true,
        message: "Welcome Patient"
    });
});

export default router;
