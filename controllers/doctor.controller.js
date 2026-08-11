// Add Doctor
import { db } from "../config/db.js";
import {
    generateFileNumber,
    generatePatientCode,
    computePatientStats,
    fetchPatientByFile,
    getManagerBranchId
} from "../utils/patient.helpers.js";


export const addDoctor = async (req, res) => {
    try {
        const {
            doctorName,
            mobile,
            hospitalName,
            address
        } = req.body;

        const managerId = req.user.id;
        const branchId = await getManagerBranchId(managerId);

        if (!doctorName || !mobile || !hospitalName || !address) {
            return res.status(400).json({
                success: false,
                message: "All fields are required."
            });
        }

        if (!branchId) {
            return res.status(400).json({
                success: false,
                message: "Branch not assigned."
            });
        }

        // Check doctor already exists in the same branch
        const [exist] = await db.query(
            `SELECT id
             FROM doctors
             WHERE mobile = ? AND branch_id = ?`,
            [mobile, branchId]
        );

        if (exist.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Doctor already exists with this mobile number."
            });
        }

        const [result] = await db.query(
            `INSERT INTO doctors
            (
                doctor_name,
                mobile,
                hospital_name,
                address,
                branch_id,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                doctorName,
                mobile,
                hospitalName,
                address,
                branchId
            ]
        );

        // Fetch newly created doctor
const [doctor] = await db.query(
    `SELECT
        id,
        doctor_name,
        mobile,
        hospital_name,
        address,
        branch_id,
        created_at,
        updated_at
     FROM doctors
     WHERE id = ?`,
    [result.insertId]
);

        return res.status(201).json({
            success: true,
            message: "Doctor added successfully.",
            data: doctor[0]
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const getDoctors = async (req, res) => {
    try {
        const managerId = req.user.id;
        const branchId = await getManagerBranchId(managerId);

        if (!branchId) {
            return res.status(400).json({
                success: false,
                message: "Branch not assigned."
            });
        }

        const [doctors] = await db.query(
            `SELECT
                id,
                doctor_name,
                mobile,
                hospital_name,
                address,
                branch_id,
                created_at,
                updated_at
            FROM doctors
            WHERE branch_id = ?
            ORDER BY created_at DESC`,
            [branchId]
        );

        return res.status(200).json({
            success: true,
            count: doctors.length,
            data: doctors
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


export const getDoctorById = async (req, res) => {
    try {
        const { id } = req.params;

        const managerId = req.user.id;
        const branchId = await getManagerBranchId(managerId);

        const [doctor] = await db.query(
            `SELECT
                id,
                doctor_name,
                mobile,
                hospital_name,
                address,
                branch_id,
                created_at,
                updated_at
            FROM doctors
            WHERE id = ? AND branch_id = ?`,
            [id, branchId]
        );

        if (doctor.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Doctor not found."
            });
        }

        return res.status(200).json({
            success: true,
            data: doctor[0]
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


export const updateDoctor = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            doctorName,
            mobile,
            hospitalName,
            address
        } = req.body;

        const managerId = req.user.id;
        const branchId = await getManagerBranchId(managerId);

        if (!doctorName || !mobile || !hospitalName || !address) {
            return res.status(400).json({
                success: false,
                message: "All fields are required."
            });
        }

        const [doctor] = await db.query(
            `SELECT id
            FROM doctors
            WHERE id = ? AND branch_id = ?`,
            [id, branchId]
        );

        if (doctor.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Doctor not found."
            });
        }

        const [exist] = await db.query(
            `SELECT id
            FROM doctors
            WHERE mobile = ?
            AND branch_id = ?
            AND id <> ?`,
            [mobile, branchId, id]
        );

        if (exist.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Doctor already exists with this mobile number."
            });
        }

        await db.query(
            `UPDATE doctors
            SET
                doctor_name = ?,
                mobile = ?,
                hospital_name = ?,
                address = ?,
                updated_at = NOW()
            WHERE id = ? AND branch_id = ?`,
            [
                doctorName,
                mobile,
                hospitalName,
                address,
                id,
                branchId
            ]
        );

        const [updatedDoctor] = await db.query(
            `SELECT
                id,
                doctor_name,
                mobile,
                hospital_name,
                address,
                branch_id,
                created_at,
                updated_at
            FROM doctors
            WHERE id = ?`,
            [id]
        );

        return res.status(200).json({
            success: true,
            message: "Doctor updated successfully.",
            data: updatedDoctor[0]
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


export const deleteDoctor = async (req, res) => {
    try {
        const { id } = req.params;

        const managerId = req.user.id;
        const branchId = await getManagerBranchId(managerId);

        const [doctor] = await db.query(
            `SELECT id
            FROM doctors
            WHERE id = ? AND branch_id = ?`,
            [id, branchId]
        );

        if (doctor.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Doctor not found."
            });
        }

        await db.query(
            `DELETE FROM doctors
            WHERE id = ? AND branch_id = ?`,
            [id, branchId]
        );

        return res.status(200).json({
            success: true,
            message: "Doctor deleted successfully."
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


export const searchDoctor = async (req, res) => {
    try {
        const { keyword = "" } = req.query;

        const managerId = req.user.id;
        const branchId = await getManagerBranchId(managerId);

        const [doctors] = await db.query(
            `SELECT
                id,
                doctor_name,
                mobile,
                hospital_name,
                address,
                branch_id,
                created_at,
                updated_at
            FROM doctors
            WHERE branch_id = ?
            AND (
                doctor_name LIKE ?
                OR mobile LIKE ?
                OR hospital_name LIKE ?
            )
            ORDER BY doctor_name ASC`,
            [
                branchId,
                `%${keyword}%`,
                `%${keyword}%`,
                `%${keyword}%`
            ]
        );

        return res.status(200).json({
            success: true,
            count: doctors.length,
            data: doctors
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};