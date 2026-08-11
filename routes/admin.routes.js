import express from "express";
import authMiddleware, { authorizeRoles } from "../middlewares/auth.middleware.js";
import {
    createSubscriptionPackage,
    listSubscriptionPackages,
    updateSubscriptionPackage,
    assignBranchSubscription,
    viewFinancialReport,
    listAllClinicsAdmin
} from "../controllers/admin.controller.js";

const router = express.Router();

router.use(authMiddleware, authorizeRoles("ADMIN"));

router.get("/clinics", listAllClinicsAdmin);

router.get("/packages", listSubscriptionPackages);
router.post("/packages", createSubscriptionPackage);
router.put("/packages/:id", updateSubscriptionPackage);
router.post("/subscriptions/assign", assignBranchSubscription);

router.get("/financial-report", viewFinancialReport);

export default router;
