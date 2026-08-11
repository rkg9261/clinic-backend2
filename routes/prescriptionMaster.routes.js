import express from "express";
import {
  getInvestigationCategories,
  createInvestigationCategory,
  updateInvestigationCategory,
  deleteInvestigationCategory,
  getInvestigations,
  createInvestigation,
  updateInvestigation,
  deleteInvestigation,
  getPathologyTests,
  createPathologyTest,
  updatePathologyTest,
  deletePathologyTest,
  getTreatmentModalities,
  createTreatmentModality,
  updateTreatmentModality,
  deleteTreatmentModality,
  getFormOptions,
} from "../controllers/prescriptionMaster.controller.js";
import authMiddleware, { authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware, authorizeRoles("CLINIC", "ADMIN"));

router.get("/form-options", getFormOptions);

router.get("/investigation-categories", getInvestigationCategories);
router.post("/investigation-categories", createInvestigationCategory);
router.put("/investigation-categories/:id", updateInvestigationCategory);
router.delete("/investigation-categories/:id", deleteInvestigationCategory);

router.get("/investigations", getInvestigations);
router.post("/investigations", createInvestigation);
router.put("/investigations/:id", updateInvestigation);
router.delete("/investigations/:id", deleteInvestigation);

router.get("/pathology-tests", getPathologyTests);
router.post("/pathology-tests", createPathologyTest);
router.put("/pathology-tests/:id", updatePathologyTest);
router.delete("/pathology-tests/:id", deletePathologyTest);

router.get("/treatment-modalities", getTreatmentModalities);
router.post("/treatment-modalities", createTreatmentModality);
router.put("/treatment-modalities/:id", updateTreatmentModality);
router.delete("/treatment-modalities/:id", deleteTreatmentModality);

export default router;
