import express from "express";
import authMiddleware, { authorizeRoles } from "../middlewares/auth.middleware.js";
import {
    createTimeTableEntry,
    listTimeTable,
    downloadReport,
    createNewQuery,
    listManagerQueries,
    updateTimeTableEntry,
    deleteTimeTableEntry,
    updateManagerQuery,
    updateManagerQueryStatus,
    deleteManagerQuery
} from "../controllers/manager.controller.js";

const router = express.Router();

router.use(authMiddleware, authorizeRoles("CLINIC"));

router.get("/time-table", listTimeTable);
router.post("/time-table", createTimeTableEntry);
router.put("/time-table/:id", updateTimeTableEntry);
router.delete("/time-table/:id", deleteTimeTableEntry);
router.get("/report", downloadReport);
router.post("/queries", createNewQuery);
router.get("/queries", listManagerQueries);
router.put("/queries/:id", updateManagerQuery);
router.patch("/queries/:id/status", updateManagerQueryStatus);
router.delete("/queries/:id", deleteManagerQuery);

export default router;
