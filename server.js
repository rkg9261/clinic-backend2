import express from "express"
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.routes.js"
import clinicRoutes from "./routes/clinic.routes.js"
import clinicOperationsRoutes from "./routes/manager.routes.js"
import adminRoutes from "./routes/admin.routes.js"
import patientRoutes from "./routes/patient.routes.js"
import patientPortalRoutes from "./routes/patientPortal.routes.js"
import appointmentRoutes from "./routes/appointment.routes.js"
import serviceCategoryRoutes from "./routes/serviceCategory.routes.js"
import serviceSubCategoryRoutes from "./routes/serviceSubCategory.routes.js"
import serviceRoutes from "./routes/service.routes.js"
import prescriptionRoutes from "./routes/prescription.routes.js"
import prescriptionMasterRoutes from "./routes/prescriptionMaster.routes.js"
import doctorRoutes from "./routes/doctor.routes.js"


const app = express();

app.use(helmet());
app.use(cors({
    origin: ["https://clinic-website-blond-five.vercel.app", "http://localhost:5173"],
    credentials: true
}));
app.use(express.json());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/uploads/reports", express.static(path.join(process.cwd(), "uploads", "reports")));

// DB connect
await connectDB();

app.get("/", (req, res)=>{
    res.send("api is running");
})

app.use("/api/auth", authRoutes)
app.use("/api/clinics", clinicRoutes)
app.use("/api/clinicManage", clinicOperationsRoutes)
app.use("/api/admin", adminRoutes)
app.use("/api/clinic/patients", patientRoutes)
app.use("/api/patient", patientPortalRoutes)
app.use("/api/appointment", appointmentRoutes)
app.use("/api/service-categories", serviceCategoryRoutes)
app.use("/api/service-sub-categories", serviceSubCategoryRoutes)
app.use("/api/services", serviceRoutes)
app.use("/api/prescriptions", prescriptionRoutes)
app.use("/api/prescription-master", prescriptionMasterRoutes)
app.use("/api/doctor", doctorRoutes)

const PORT = 5000;
app.listen(PORT, ()=>console.log("server is running on", PORT));


