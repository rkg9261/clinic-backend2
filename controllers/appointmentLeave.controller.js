import { db } from "../config/db.js";
import { getManagerBranchId } from "../utils/patient.helpers.js";


// ======================================================
// ADD LEAVE
// ======================================================
export const addAppointmentLeave = async (req, res) => {
    try {
        const {
            fromDate,
            toDate,
            reason,
            repeatType
        } = req.body;

        const managerId = req.user.id;
        const branchId = await getManagerBranchId(managerId);

        // ------------------------------------------
        // Check branch
        // ------------------------------------------
        if (!branchId) {
            return res.status(400).json({
                success: false,
                message: "Branch not assigned."
            });
        }

        // ------------------------------------------
        // Required fields
        // ------------------------------------------
        if (!fromDate || !toDate || !reason) {
            return res.status(400).json({
                success: false,
                message: "From date, to date and reason are required."
            });
        }

        // ------------------------------------------
        // Validate reason length
        // ------------------------------------------
        if (reason.trim().length > 200) {
            return res.status(400).json({
                success: false,
                message: "Reason cannot exceed 200 characters."
            });
        }

        // ------------------------------------------
        // Validate dates
        // ------------------------------------------
        if (fromDate > toDate) {
            return res.status(400).json({
                success: false,
                message: "From date cannot be greater than to date."
            });
        }

        // ------------------------------------------
        // Validate repeat type
        // ------------------------------------------
        const validRepeatTypes = [
            "NONE",
            "DAILY",
            "WEEKLY",
            "MONTHLY"
        ];

        const selectedRepeatType =
            repeatType
                ? repeatType.toUpperCase()
                : "NONE";

        if (!validRepeatTypes.includes(selectedRepeatType)) {
            return res.status(400).json({
                success: false,
                message: "Invalid repeat type."
            });
        }

        // ------------------------------------------
        // Check overlapping leave
        // ------------------------------------------
        const [existingLeave] = await db.query(
            `SELECT
                id,
                from_date,
                to_date,
                reason
             FROM appointment_leaves
             WHERE branch_id = ?
             AND from_date <= ?
             AND to_date >= ?`,
            [
                branchId,
                toDate,
                fromDate
            ]
        );

        if (existingLeave.length > 0) {
            return res.status(409).json({
                success: false,
                message: "A leave already exists for the selected date period.",
                data: existingLeave[0]
            });
        }

        // ------------------------------------------
        // Insert leave
        // ------------------------------------------
        const [result] = await db.query(
            `INSERT INTO appointment_leaves
            (
                branch_id,
                from_date,
                to_date,
                reason,
                repeat_type,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                branchId,
                fromDate,
                toDate,
                reason.trim(),
                selectedRepeatType
            ]
        );

        // ------------------------------------------
        // Get created leave
        // ------------------------------------------
        const [leave] = await db.query(
            `SELECT
                id,
                branch_id,
                from_date,
                to_date,
                reason,
                repeat_type,
                created_at,
                updated_at
             FROM appointment_leaves
             WHERE id = ?
             AND branch_id = ?`,
            [
                result.insertId,
                branchId
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Appointment leave added successfully.",
            data: leave[0]
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// ======================================================
// GET ALL LEAVES
// ======================================================
export const getAppointmentLeaves = async (req, res) => {
    try {
        const managerId = req.user.id;
        const branchId = await getManagerBranchId(managerId);

        // ------------------------------------------
        // Check branch
        // ------------------------------------------
        if (!branchId) {
            return res.status(400).json({
                success: false,
                message: "Branch not assigned."
            });
        }

        const [leaves] = await db.query(
            `SELECT
                id,
                branch_id,
                from_date,
                to_date,
                reason,
                repeat_type,
                created_at,
                updated_at
             FROM appointment_leaves
             WHERE branch_id = ?
             ORDER BY from_date ASC`,
            [branchId]
        );

        return res.status(200).json({
            success: true,
            count: leaves.length,
            data: leaves
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// ======================================================
// GET LEAVE BY ID
// ======================================================
export const getAppointmentLeaveById = async (req, res) => {
    try {
        const { id } = req.params;

        const managerId = req.user.id;
        const branchId = await getManagerBranchId(managerId);

        if (!branchId) {
            return res.status(400).json({
                success: false,
                message: "Branch not assigned."
            });
        }

        const [leave] = await db.query(
            `SELECT
                id,
                branch_id,
                from_date,
                to_date,
                reason,
                repeat_type,
                created_at,
                updated_at
             FROM appointment_leaves
             WHERE id = ?
             AND branch_id = ?`,
            [
                id,
                branchId
            ]
        );

        if (leave.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Appointment leave not found."
            });
        }

        return res.status(200).json({
            success: true,
            data: leave[0]
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// ======================================================
// UPDATE LEAVE
// ======================================================
export const updateAppointmentLeave = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            fromDate,
            toDate,
            reason,
            repeatType
        } = req.body;

        const managerId = req.user.id;
        const branchId = await getManagerBranchId(managerId);

        // ------------------------------------------
        // Check branch
        // ------------------------------------------
        if (!branchId) {
            return res.status(400).json({
                success: false,
                message: "Branch not assigned."
            });
        }

        // ------------------------------------------
        // Required fields
        // ------------------------------------------
        if (!fromDate || !toDate || !reason) {
            return res.status(400).json({
                success: false,
                message: "From date, to date and reason are required."
            });
        }

        // ------------------------------------------
        // Reason validation
        // ------------------------------------------
        if (reason.trim().length > 200) {
            return res.status(400).json({
                success: false,
                message: "Reason cannot exceed 200 characters."
            });
        }

        // ------------------------------------------
        // Date validation
        // ------------------------------------------
        if (fromDate > toDate) {
            return res.status(400).json({
                success: false,
                message: "From date cannot be greater than to date."
            });
        }

        // ------------------------------------------
        // Repeat validation
        // ------------------------------------------
        const validRepeatTypes = [
            "NONE",
            "DAILY",
            "WEEKLY",
            "MONTHLY"
        ];

        const selectedRepeatType =
            repeatType
                ? repeatType.toUpperCase()
                : "NONE";

        if (!validRepeatTypes.includes(selectedRepeatType)) {
            return res.status(400).json({
                success: false,
                message: "Invalid repeat type."
            });
        }

        // ------------------------------------------
        // Check existing leave
        // ------------------------------------------
        const [leave] = await db.query(
            `SELECT id
             FROM appointment_leaves
             WHERE id = ?
             AND branch_id = ?`,
            [
                id,
                branchId
            ]
        );

        if (leave.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Appointment leave not found."
            });
        }

        // ------------------------------------------
        // Check overlapping leave
        // ------------------------------------------
        const [existingLeave] = await db.query(
            `SELECT id
             FROM appointment_leaves
             WHERE branch_id = ?
             AND id <> ?
             AND from_date <= ?
             AND to_date >= ?`,
            [
                branchId,
                id,
                toDate,
                fromDate
            ]
        );

        if (existingLeave.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Another leave already exists for the selected date period."
            });
        }

        // ------------------------------------------
        // Update
        // ------------------------------------------
        await db.query(
            `UPDATE appointment_leaves
             SET
                from_date = ?,
                to_date = ?,
                reason = ?,
                repeat_type = ?,
                updated_at = NOW()
             WHERE id = ?
             AND branch_id = ?`,
            [
                fromDate,
                toDate,
                reason.trim(),
                selectedRepeatType,
                id,
                branchId
            ]
        );

        // ------------------------------------------
        // Get updated leave
        // ------------------------------------------
        const [updatedLeave] = await db.query(
            `SELECT
                id,
                branch_id,
                from_date,
                to_date,
                reason,
                repeat_type,
                created_at,
                updated_at
             FROM appointment_leaves
             WHERE id = ?
             AND branch_id = ?`,
            [
                id,
                branchId
            ]
        );

        return res.status(200).json({
            success: true,
            message: "Appointment leave updated successfully.",
            data: updatedLeave[0]
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// ======================================================
// DELETE LEAVE
// ======================================================
export const deleteAppointmentLeave = async (req, res) => {
    try {
        const { id } = req.params;

        const managerId = req.user.id;
        const branchId = await getManagerBranchId(managerId);

        // ------------------------------------------
        // Check branch
        // ------------------------------------------
        if (!branchId) {
            return res.status(400).json({
                success: false,
                message: "Branch not assigned."
            });
        }

        // ------------------------------------------
        // Check leave
        // ------------------------------------------
        const [leave] = await db.query(
            `SELECT id
             FROM appointment_leaves
             WHERE id = ?
             AND branch_id = ?`,
            [
                id,
                branchId
            ]
        );

        if (leave.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Appointment leave not found."
            });
        }

        // ------------------------------------------
        // Delete
        // ------------------------------------------
        await db.query(
            `DELETE FROM appointment_leaves
             WHERE id = ?
             AND branch_id = ?`,
            [
                id,
                branchId
            ]
        );

        return res.status(200).json({
            success: true,
            message: "Appointment leave deleted successfully."
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// ======================================================
// CHECK WHETHER A DATE IS ON LEAVE
// ======================================================
export const checkAppointmentLeave = async (req, res) => {
    try {
        const { date } = req.params;

        const managerId = req.user.id;
        const branchId = await getManagerBranchId(managerId);

        // ------------------------------------------
        // Check branch
        // ------------------------------------------
        if (!branchId) {
            return res.status(400).json({
                success: false,
                message: "Branch not assigned."
            });
        }

        if (!date) {
            return res.status(400).json({
                success: false,
                message: "Date is required."
            });
        }

        // ------------------------------------------
        // Check date inside leave period
        // ------------------------------------------
        const [leave] = await db.query(
            `SELECT
                id,
                from_date,
                to_date,
                reason,
                repeat_type
             FROM appointment_leaves
             WHERE branch_id = ?
             AND from_date <= ?
             AND to_date >= ?
             LIMIT 1`,
            [
                branchId,
                date,
                date
            ]
        );

        if (leave.length > 0) {
            return res.status(200).json({
                success: true,
                available: false,
                onLeave: true,
                message: "Appointments are not available on this date.",
                data: leave[0]
            });
        }

        return res.status(200).json({
            success: true,
            available: true,
            onLeave: false,
            message: "Appointments are available on this date."
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};