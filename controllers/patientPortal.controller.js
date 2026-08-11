import { db } from "../config/db.js";
import { computePatientStats } from "../utils/patient.helpers.js";
import {
    buildWhatsAppShareUrl,
    buildPatientIdShareMessage
} from "../utils/whatsapp.helpers.js";
import { generatePatientPdfReport } from "../utils/pdfReport.service.js";

const getLinkedPatient = async (userId) => {
    const [userRows] = await db.query(
        "SELECT patient_id, branch_id FROM users WHERE id = ?",
        [userId]
    );
    const user = userRows[0];
    if (!user?.patient_id) return null;

    const [patientRows] = await db.query(
        "SELECT * FROM patients WHERE id = ?",
        [user.patient_id]
    );
    return patientRows[0] ?? null;
};

export const linkPatientAccount = async (req, res) => {
    try {
        const { fileNumber, mobileNumber, branchId } = req.body;
        const userId = req.user.id;

        if (!fileNumber || !mobileNumber) {
            return res.status(400).json({
                success: false,
                message: "fileNumber and mobileNumber are required"
            });
        }

        let query = `SELECT id FROM patients WHERE file_number = ? AND mobile_number = ?`;
        const params = [fileNumber.trim(), mobileNumber.trim()];

        if (branchId) {
            query += " AND branch_id = ?";
            params.push(branchId);
        }

        query += " LIMIT 1";
        const [rows] = await db.query(query, params);

        if (!rows[0]) {
            return res.status(404).json({
                success: false,
                message: "Patient record not found. Check file number and mobile."
            });
        }

        await db.query(
            "UPDATE users SET patient_id = ?, branch_id = (SELECT branch_id FROM patients WHERE id = ?) WHERE id = ?",
            [rows[0].id, rows[0].id, userId]
        );
        await db.query("UPDATE patients SET user_id = ? WHERE id = ?", [userId, rows[0].id]);

        const [patient] = await db.query("SELECT * FROM patients WHERE id = ?", [rows[0].id]);
        const stats = await computePatientStats(rows[0].id);

        return res.status(200).json({
            success: true,
            message: "Patient account linked",
            data: { patient: patient[0], stats, card: stats }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const getMyPatientCard = async (req, res) => {
    try {
        const patient = await getLinkedPatient(req.user.id);

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Link your patient record first via /api/patient/link"
            });
        }

        const stats = await computePatientStats(patient.id);

        return res.status(200).json({
            success: true,
            data: {
                patient,
                card: {
                    attendancePercent: stats.attendancePercent,
                    punctualityPercent: stats.punctualityPercent,
                    balanceSessions: stats.balanceSessions,
                    lastAttendanceDate: stats.lastAttendanceDate,
                    fileNumber: stats.fileNumber,
                    patientCode: stats.patientCode
                }
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const getMyAttendance = async (req, res) => {
    try {
        const patient = await getLinkedPatient(req.user.id);
        if (!patient) {
            return res.status(404).json({ success: false, message: "Patient not linked" });
        }

        const [rows] = await db.query(
            `SELECT attendance_date, status, session_deducted, notes
             FROM attendance_records WHERE patient_id = ?
             ORDER BY attendance_date DESC LIMIT 50`,
            [patient.id]
        );

        return res.status(200).json({ success: true, data: rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const getMyReports = async (req, res) => {
    try {
        const patient = await getLinkedPatient(req.user.id);
        if (!patient) {
            return res.status(404).json({ success: false, message: "Patient not linked" });
        }

        const [branchRows] = await db.query("SELECT * FROM branches WHERE id = ?", [
            patient.branch_id
        ]);
        const [entries] = await db.query(
            `SELECT entry_type, title, content, created_at
             FROM patient_file_entries WHERE patient_id = ?
             ORDER BY created_at DESC`,
            [patient.id]
        );
        const stats = await computePatientStats(patient.id);

        const pdf = await generatePatientPdfReport({
            patient,
            stats,
            branch: branchRows[0],
            entries
        });

        return res.status(200).json({
            success: true,
            data: {
                stats,
                entries,
                downloadUrl: pdf.publicPath
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const shareMyIdOnWhatsApp = async (req, res) => {
    try {
        const patient = await getLinkedPatient(req.user.id);
        if (!patient) {
            return res.status(404).json({ success: false, message: "Patient not linked" });
        }

        const message = buildPatientIdShareMessage(patient);
        const whatsappUrl = buildWhatsAppShareUrl({
            phone: patient.mobile_number,
            message
        });

        return res.status(200).json({
            success: true,
            data: { whatsappUrl, message }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
