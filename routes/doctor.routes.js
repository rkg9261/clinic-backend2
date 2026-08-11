import  experss from "express";

import authMiddleware, { authorizeRoles } from "../middlewares/auth.middleware.js";

import {addDoctor,
    getDoctors,
    getDoctorById,
    updateDoctor,
    deleteDoctor,
    searchDoctor} from "../controllers/doctor.controller.js"

const router  = experss.Router()

router.use(authMiddleware, authorizeRoles("CLINIC"));

router.post("/", addDoctor);
router.get("/",  getDoctors);
router.get("/search",  searchDoctor);
router.get("/:id",  getDoctorById);
router.put("/:id",  updateDoctor);
router.delete("/:id",  deleteDoctor);


export default router;