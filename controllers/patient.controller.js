import bcrypt from "bcryptjs";
import { db } from "../config/db.js";
import {
    generateFileNumber,
    generatePatientCode,
    computePatientStats,
    fetchPatientByFile,
    getManagerBranchId
} from "../utils/patient.helpers.js";
import { generatePatientPdfReport } from "../utils/pdfReport.service.js";
import {
    buildWhatsAppShareUrl,
    buildPatientIdShareMessage
} from "../utils/whatsapp.helpers.js";

const normalize = (v) => (v ? String(v).trim() : null);

export const searchByFileNumber = async (req, res) => {
    try {
        const fileNumber = req.params.fileNumber || req.body?.fileNumber;
        const branchId = await getManagerBranchId(req.user.id);

        if (!branchId) {
            return res.status(400).json({ success: false, message: "Branch not assigned" });
        }

        const patient = await fetchPatientByFile(fileNumber, branchId);
        if (!patient) {
            return res.status(404).json({ success: false, message: "Patient not found" });
        }

        const stats = await computePatientStats(patient.id);
        return res.status(200).json({
            success: true,
            data: { patient, stats, card: stats }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const addNewPatient = async (req, res) => {
    let connection;
    try {
        const {
            name,
            age,
            gender,
            mobileNumber,
            address,
            problem,
            appointmentType,
            availableDate,
            availableTimeSlot,
            cash,
            upi,
            total
        } = req.body;

        const managerId = req.user.id;
        const branchId = await getManagerBranchId(managerId);

        const patientName = normalize(name);
        const patientMobile = normalize(mobileNumber);
        const patientAge = age ? Number(age) : null;
        const patientGender = normalize(gender);
        const patientAddress = normalize(address);
        const patientProblem = normalize(problem);
        const patientAppointmentType = normalize(appointmentType) || "STANDARD";
        const patientAvailableDate = normalize(availableDate);
        const patientAvailableTimeSlot = normalize(availableTimeSlot);
        const patientCashAmount = Number(cash) || 0;
        const patientUpiAmount = Number(upi) || 0;
        const patientTotalAmount = Number(total) || patientCashAmount + patientUpiAmount;

        if (!patientName || !patientMobile || !patientGender || !patientAddress || !patientProblem) {
            return res.status(400).json({
                success: false,
                message: "name, age, gender, mobileNumber, address, problem are required"
            });
        }

        if (
            patientAppointmentType.toUpperCase() === "STANDARD"
            ) {
                if (!patientAvailableDate || !patientAvailableTimeSlot) {
                    return res.status(400).json({
                        success: false,
                        message: "availableDate and availableTimeSlot are required for STANDARD appointment"
                    });
                }
            }

        if (!patientAppointmentType || !["STANDARD", "INSTANT"].includes(patientAppointmentType.toUpperCase())) {
            return res.status(400).json({
                success: false,
                message: "appointmentType must be STANDARD or INSTANT"
            });
        }

        if (!patientMobile || patientMobile.length < 6) {
            return res.status(400).json({
                success: false,
                message: "mobileNumber must contain at least 6 digits"
            });
        }

        if (!branchId) {
            return res.status(400).json({ success: false, message: "Branch not assigned" });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        const patientEmail = `${patientMobile}@patient.clinic.local`;
        const [existingUser] = await connection.query(
            "SELECT id FROM users WHERE mobile = ? OR email = ? LIMIT 1",
            [patientMobile, patientEmail]
        );

        if (existingUser[0]) {
            await connection.rollback();
            return res.status(409).json({
                success: false,
                message: "Patient login already exists for this mobile number"
            });
        }

        const fileNumber = await generateFileNumber(branchId);
        const patientCode = await generatePatientCode();

        const [patientResult] = await connection.query(
            `INSERT INTO patients (
                file_number, patient_code, full_name, mobile_number, age, gender,
                disease_problem, address, appointment_type, available_date, available_time_slot,
                cash_amount, upi_amount, total_amount, start_date, branch_id,
                created_by_manager_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                fileNumber,
                patientCode,
                patientName,
                patientMobile,
                patientAge,
                patientGender,
                patientProblem,
                patientAddress,
                patientAppointmentType.toUpperCase(),
                patientAppointmentType.toUpperCase() === "STANDARD"
        ? patientAvailableDate
        : null,
                patientAppointmentType.toUpperCase() === "STANDARD"
        ? patientAvailableTimeSlot
        : null,
                patientCashAmount,
                patientUpiAmount,
                patientTotalAmount,
                new Date().toISOString().slice(0, 10),
                branchId,
                managerId
            ]
        );

        const patientId = patientResult.insertId;
        const plainPassword = patientMobile.slice(0, 6);
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        const [userResult] = await connection.query(
            `INSERT INTO users (
                name, email, mobile, password, role, branch_id, patient_id,
                email_verified, created_at, updated_at
            ) VALUES (?, ?, ?, ?, 'PATIENT', ?, ?, 1, NOW(), NOW())`,
            [patientName, patientEmail, patientMobile, hashedPassword, branchId, patientId]
        );

        await connection.query(
            "UPDATE patients SET user_id = ? WHERE id = ?",
            [userResult.insertId, patientId]
        );

        await connection.commit();

        const [patientRows] = await db.query("SELECT * FROM patients WHERE id = ?", [patientId]);
        const stats = await computePatientStats(patientId);

        return res.status(201).json({
            success: true,
            message: "Patient added successfully and patient login created",
            data: {
                patient: patientRows[0],
                stats,
                fileNumber,
                patientCode,
                loginCredentials: {
                    email: patientEmail,
                    mobile: patientMobile,
                    password: plainPassword,
                    note: "Patient can login with this email/mobile and password. Change password after first login."
                }
            }
        });
    } catch (error) {
        if (connection) await connection.rollback();
        return res.status(500).json({ success: false, message: error.message });
    } finally {
        if (connection) connection.release();
    }
};

export const listPatients = async (req, res) => {
    try {
        const branchId = await getManagerBranchId(req.user.id);
        const search = req.query.search?.trim();

        let query = "SELECT * FROM patients WHERE branch_id = ?";
        const params = [branchId];

        if (search) {
            query += " AND (file_number LIKE ? OR full_name LIKE ? OR mobile_number LIKE ?)";
            const term = `%${search}%`;
            params.push(term, term, term);
        }

        query += " ORDER BY created_at DESC";
        const [rows] = await db.query(query, params);

        const withStats = await Promise.all(
            rows.map(async (p) => ({
                ...p,
                stats: await computePatientStats(p.id)
            }))
        );

        return res.status(200).json({ success: true, data: withStats });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const openPatientFile = async (req, res) => {
    try {
        const { id } = req.params;
        const branchId = await getManagerBranchId(req.user.id);

        const [patientRows] = await db.query(
            "SELECT * FROM patients WHERE id = ? AND branch_id = ?",
            [id, branchId]
        );
        if (!patientRows[0]) {
            return res.status(404).json({ success: false, message: "Patient not found" });
        }

        const patient = patientRows[0];
        const [attendance] = await db.query(
            `SELECT * FROM attendance_records WHERE patient_id = ? ORDER BY attendance_date DESC`,
            [id]
        );
        const [recharges] = await db.query(
            `SELECT * FROM recharge_transactions WHERE patient_id = ? ORDER BY created_at DESC`,
            [id]
        );
        const [entries] = await db.query(
            `SELECT * FROM patient_file_entries WHERE patient_id = ? ORDER BY created_at DESC`,
            [id]
        );
        const stats = await computePatientStats(id);

        return res.status(200).json({
            success: true,
            data: {
                patient,
                stats,
                medicalHistory: entries.filter((e) => e.entry_type === "NOTE"),
                prescriptions: entries.filter((e) => e.entry_type === "PRESCRIPTION"),
                progress: entries.filter((e) => e.entry_type === "PROGRESS"),
                payments: [...recharges, ...entries.filter((e) => e.entry_type === "PAYMENT")],
                attendanceLogs: attendance,
                sessions: entries.filter((e) => e.entry_type === "SESSION"),
                allEntries: entries
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const addPatientFileEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const { entryType, title, content } = req.body;
        const branchId = await getManagerBranchId(req.user.id);

        const [p] = await db.query(
            "SELECT id FROM patients WHERE id = ? AND branch_id = ?",
            [id, branchId]
        );
        if (!p[0]) {
            return res.status(404).json({ success: false, message: "Patient not found" });
        }

        const [result] = await db.query(
            `INSERT INTO patient_file_entries
             (patient_id, branch_id, entry_type, title, content, created_by_manager_id)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                id,
                branchId,
                (entryType || "NOTE").toUpperCase(),
                title || "Note",
                content || "",
                req.user.id
            ]
        );

        const [rows] = await db.query(
            "SELECT * FROM patient_file_entries WHERE id = ?",
            [result.insertId]
        );

        return res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const markAttendance = async (req, res) => {
    try {
        const { patientId, status, attendanceDate, scheduledTime, actualTime, notes } = req.body;
        const branchId = await getManagerBranchId(req.user.id);
        const normalizedStatus = (status || "PRESENT").toUpperCase();

        if (!["PRESENT", "ABSENT", "LATE"].includes(normalizedStatus)) {
            return res.status(400).json({
                success: false,
                message: "status must be PRESENT, ABSENT, or LATE"
            });
        }

        const [patientRows] = await db.query(
            "SELECT * FROM patients WHERE id = ? AND branch_id = ?",
            [patientId, branchId]
        );
        if (!patientRows[0]) {
            return res.status(404).json({ success: false, message: "Patient not found" });
        }

        const patient = patientRows[0];
        const date = attendanceDate || new Date().toISOString().slice(0, 10);

        const [existing] = await db.query(
            "SELECT id FROM attendance_records WHERE patient_id = ? AND attendance_date = ?",
            [patientId, date]
        );
        if (existing[0]) {
            return res.status(409).json({
                success: false,
                message: "Attendance already marked for this date"
            });
        }

        let sessionDeducted = 0;
        if (normalizedStatus === "PRESENT" || normalizedStatus === "LATE") {
            if (patient.sessions_remaining <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "No sessions remaining. Please recharge first."
                });
            }
            sessionDeducted = 1;
            await db.query(
                "UPDATE patients SET sessions_remaining = sessions_remaining - 1, last_attendance_date = ? WHERE id = ?",
                [date, patientId]
            );
        }

        const [result] = await db.query(
            `INSERT INTO attendance_records
             (patient_id, branch_id, attendance_date, status, scheduled_time, actual_time,
              session_deducted, notes, marked_by_manager_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                patientId,
                branchId,
                date,
                normalizedStatus,
                scheduledTime || null,
                actualTime || null,
                sessionDeducted,
                notes || null,
                req.user.id
            ]
        );

        const stats = await computePatientStats(patientId);
        const [attendance] = await db.query(
            "SELECT * FROM attendance_records WHERE id = ?",
            [result.insertId]
        );

        return res.status(201).json({
            success: true,
            message: "Attendance marked",
            data: { attendance: attendance[0], stats }
        });
    } catch (error) {
        // console.log("error", error)
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const rechargePatient = async (req, res) => {
    try {
        const { patientId, sessionsAdded, amount, paymentMethod, packageName, notes } = req.body;
        const branchId = await getManagerBranchId(req.user.id);
        const sessions = Number(sessionsAdded);

        if (!patientId || !sessions || sessions < 1) {
            return res.status(400).json({
                success: false,
                message: "patientId and sessionsAdded (>=1) are required"
            });
        }

        const [patientRows] = await db.query(
            "SELECT * FROM patients WHERE id = ? AND branch_id = ?",
            [patientId, branchId]
        );
        if (!patientRows[0]) {
            return res.status(404).json({ success: false, message: "Patient not found" });
        }

        await db.query(
            `UPDATE patients
             SET sessions_remaining = sessions_remaining + ?,
                 total_sessions = total_sessions + ?,
                 package_name = COALESCE(?, package_name)
             WHERE id = ?`,
            [sessions, sessions, packageName || null, patientId]
        );

        const [rechargeResult] = await db.query(
            `INSERT INTO recharge_transactions
             (patient_id, branch_id, sessions_added, amount, payment_method, package_name, notes, created_by_manager_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                patientId,
                branchId,
                sessions,
                Number(amount) || 0,
                paymentMethod || "CASH",
                packageName || null,
                notes || null,
                req.user.id
            ]
        );

        await db.query(
            `INSERT INTO patient_file_entries
             (patient_id, branch_id, entry_type, title, content, created_by_manager_id)
             VALUES (?, ?, 'PAYMENT', 'Session recharge', ?, ?)`,
            [
                patientId,
                branchId,
                `Added ${sessions} sessions. Amount: ${amount || 0}. ${notes || ""}`,
                req.user.id
            ]
        );

        const stats = await computePatientStats(patientId);
        const [recharge] = await db.query(
            "SELECT * FROM recharge_transactions WHERE id = ?",
            [rechargeResult.insertId]
        );

        return res.status(201).json({
            success: true,
            message: "Sessions recharged successfully",
            data: { recharge: recharge[0], stats }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const downloadPatientReport = async (req, res) => {
    try {
        const { id } = req.params;
        const branchId = await getManagerBranchId(req.user.id);

        const [patientRows] = await db.query(
            "SELECT * FROM patients WHERE id = ? AND branch_id = ?",
            [id, branchId]
        );
        if (!patientRows[0]) {
            return res.status(404).json({ success: false, message: "Patient not found" });
        }

        const patient = patientRows[0];
        const [branchRows] = await db.query("SELECT * FROM branches WHERE id = ?", [branchId]);
        const [entries] = await db.query(
            "SELECT * FROM patient_file_entries WHERE patient_id = ? ORDER BY created_at DESC LIMIT 20",
            [id]
        );
        const stats = await computePatientStats(id);

        const pdf = await generatePatientPdfReport({
            patient,
            stats,
            branch: branchRows[0],
            entries
        });

        return res.status(200).json({
            success: true,
            message: "Report generated",
            data: {
                downloadUrl: pdf.publicPath,
                stats,
                filename: pdf.filename
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const sharePatientIdWhatsApp = async (req, res) => {
    try {
        const { id } = req.params;
        const { phone } = req.query;
        const branchId = await getManagerBranchId(req.user.id);

        const [patientRows] = await db.query(
            "SELECT * FROM patients WHERE id = ? AND branch_id = ?",
            [id, branchId]
        );
        if (!patientRows[0]) {
            return res.status(404).json({ success: false, message: "Patient not found" });
        }

        const patient = patientRows[0];
        const message = buildPatientIdShareMessage(patient);
        const targetPhone = phone || patient.mobile_number;
        const whatsappUrl = buildWhatsAppShareUrl({ phone: targetPhone, message });

        return res.status(200).json({
            success: true,
            data: { whatsappUrl, message, patientCode: patient.patient_code }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const getBranchOperationsReport = async (req, res) => {
    try {
        const branchId = await getManagerBranchId(req.user.id);

        const [patientAgg] = await db.query(
            "SELECT COUNT(*) AS total FROM patients WHERE branch_id = ?",
            [branchId]
        );
        const [sessionAgg] = await db.query(
            `SELECT SUM(sessions_remaining) AS remaining, SUM(total_sessions) AS total
             FROM patients WHERE branch_id = ?`,
            [branchId]
        );
        const [revenueAgg] = await db.query(
            `SELECT SUM(amount) AS revenue, COUNT(*) AS recharges
             FROM recharge_transactions WHERE branch_id = ?`,
            [branchId]
        );
        const [attendanceToday] = await db.query(
            `SELECT COUNT(*) AS today FROM attendance_records
             WHERE branch_id = ? AND attendance_date = CURDATE()`,
            [branchId]
        );

        return res.status(200).json({
            success: true,
            data: {
                totalPatients: Number(patientAgg[0]?.total || 0),
                sessionsRemaining: Number(sessionAgg[0]?.remaining || 0),
                totalSessionsSold: Number(sessionAgg[0]?.total || 0),
                rechargeRevenue: Number(revenueAgg[0]?.revenue || 0),
                rechargeCount: Number(revenueAgg[0]?.recharges || 0),
                attendanceMarkedToday: Number(attendanceToday[0]?.today || 0)
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};


