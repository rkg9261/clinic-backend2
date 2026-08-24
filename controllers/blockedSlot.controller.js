import { db } from "../config/db.js";
import { getManagerBranchId } from "../utils/patient.helpers.js";


// ======================================================
// ADD BLOCKED SLOT
// ======================================================
export const addBlockedSlot = async (req, res) => {
    try {
        const {
            appointmentDate,
            startTime,
            endTime,
            reason
        } = req.body;

        const managerId = req.user.id;

        const branchId = await getManagerBranchId(managerId);

        // ------------------------------------------------
        // Check branch
        // ------------------------------------------------
        if (!branchId) {
            return res.status(400).json({
                success: false,
                message: "Branch not assigned."
            });
        }

        // ------------------------------------------------
        // Required fields
        // ------------------------------------------------
        if (!appointmentDate || !startTime || !endTime) {
            return res.status(400).json({
                success: false,
                message: "Date, start time and end time are required."
            });
        }

        // ------------------------------------------------
        // Validate reason
        // ------------------------------------------------
        if (reason && reason.trim().length > 200) {
            return res.status(400).json({
                success: false,
                message: "Reason cannot exceed 200 characters."
            });
        }

        // ------------------------------------------------
        // Validate time
        // ------------------------------------------------
        if (startTime >= endTime) {
            return res.status(400).json({
                success: false,
                message: "Start time must be earlier than end time."
            });
        }

        // ------------------------------------------------
        // Check overlapping blocked slot
        //
        // Existing:
        // 10:00 - 10:30
        //
        // New:
        // 10:15 - 10:45
        //
        // This must be rejected.
        // ------------------------------------------------
        const [existingSlot] = await db.query(
            `SELECT
                id,
                appointment_date,
                start_time,
                end_time,
                reason
             FROM blocked_appointment_slots
             WHERE branch_id = ?
             AND appointment_date = ?
             AND start_time < ?
             AND end_time > ?`,
            [
                branchId,
                appointmentDate,
                endTime,
                startTime
            ]
        );

        if (existingSlot.length > 0) {
            return res.status(409).json({
                success: false,
                message: "This time period is already blocked.",
                data: existingSlot[0]
            });
        }

        // ------------------------------------------------
        // Insert
        // ------------------------------------------------
        const [result] = await db.query(
            `INSERT INTO blocked_appointment_slots
            (
                branch_id,
                appointment_date,
                start_time,
                end_time,
                reason,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                branchId,
                appointmentDate,
                startTime,
                endTime,
                reason ? reason.trim() : null
            ]
        );

        // ------------------------------------------------
        // Get created record
        // ------------------------------------------------
        const [blockedSlot] = await db.query(
            `SELECT
                id,
                branch_id,
                appointment_date,
                start_time,
                end_time,
                reason,
                created_at,
                updated_at
             FROM blocked_appointment_slots
             WHERE id = ?
             AND branch_id = ?`,
            [
                result.insertId,
                branchId
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Appointment slot blocked successfully.",
            data: blockedSlot[0]
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
// GET ALL BLOCKED SLOTS
// ======================================================
export const getBlockedSlots = async (req, res) => {
    try {

        const managerId = req.user.id;

        const branchId = await getManagerBranchId(managerId);

        if (!branchId) {
            return res.status(400).json({
                success: false,
                message: "Branch not assigned."
            });
        }

        const [slots] = await db.query(
            `SELECT
                id,
                branch_id,
                appointment_date,
                start_time,
                end_time,
                reason,
                created_at,
                updated_at
             FROM blocked_appointment_slots
             WHERE branch_id = ?
             ORDER BY
                appointment_date ASC,
                start_time ASC`,
            [
                branchId
            ]
        );

        return res.status(200).json({
            success: true,
            count: slots.length,
            data: slots
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
// GET BLOCKED SLOTS BY DATE
// ======================================================
export const getBlockedSlotsByDate = async (req, res) => {
    try {

        const { date } = req.params;

        const managerId = req.user.id;

        const branchId = await getManagerBranchId(managerId);

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

        const [slots] = await db.query(
            `SELECT
                id,
                branch_id,
                appointment_date,
                start_time,
                end_time,
                reason,
                created_at,
                updated_at
             FROM blocked_appointment_slots
             WHERE branch_id = ?
             AND appointment_date = ?
             ORDER BY start_time ASC`,
            [
                branchId,
                date
            ]
        );

        return res.status(200).json({
            success: true,
            count: slots.length,
            data: slots
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
// GET BLOCKED SLOT BY ID
// ======================================================
export const getBlockedSlotById = async (req, res) => {
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

        const [slot] = await db.query(
            `SELECT
                id,
                branch_id,
                appointment_date,
                start_time,
                end_time,
                reason,
                created_at,
                updated_at
             FROM blocked_appointment_slots
             WHERE id = ?
             AND branch_id = ?`,
            [
                id,
                branchId
            ]
        );

        if (slot.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Blocked slot not found."
            });
        }

        return res.status(200).json({
            success: true,
            data: slot[0]
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
// UPDATE BLOCKED SLOT
// ======================================================
export const updateBlockedSlot = async (req, res) => {
    try {

        const { id } = req.params;

        const {
            appointmentDate,
            startTime,
            endTime,
            reason
        } = req.body;

        const managerId = req.user.id;

        const branchId = await getManagerBranchId(managerId);

        if (!branchId) {
            return res.status(400).json({
                success: false,
                message: "Branch not assigned."
            });
        }

        // ------------------------------------------------
        // Required fields
        // ------------------------------------------------
        if (!appointmentDate || !startTime || !endTime) {
            return res.status(400).json({
                success: false,
                message: "Date, start time and end time are required."
            });
        }

        // ------------------------------------------------
        // Validate reason
        // ------------------------------------------------
        if (reason && reason.trim().length > 200) {
            return res.status(400).json({
                success: false,
                message: "Reason cannot exceed 200 characters."
            });
        }

        // ------------------------------------------------
        // Validate time
        // ------------------------------------------------
        if (startTime >= endTime) {
            return res.status(400).json({
                success: false,
                message: "Start time must be earlier than end time."
            });
        }

        // ------------------------------------------------
        // Check existing record
        // ------------------------------------------------
        const [slot] = await db.query(
            `SELECT id
             FROM blocked_appointment_slots
             WHERE id = ?
             AND branch_id = ?`,
            [
                id,
                branchId
            ]
        );

        if (slot.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Blocked slot not found."
            });
        }

        // ------------------------------------------------
        // Check overlap with other blocked slots
        // ------------------------------------------------
        const [existingSlot] = await db.query(
            `SELECT id
             FROM blocked_appointment_slots
             WHERE branch_id = ?
             AND id <> ?
             AND appointment_date = ?
             AND start_time < ?
             AND end_time > ?`,
            [
                branchId,
                id,
                appointmentDate,
                endTime,
                startTime
            ]
        );

        if (existingSlot.length > 0) {
            return res.status(409).json({
                success: false,
                message: "This time period is already blocked."
            });
        }

        // ------------------------------------------------
        // Update
        // ------------------------------------------------
        await db.query(
            `UPDATE blocked_appointment_slots
             SET
                appointment_date = ?,
                start_time = ?,
                end_time = ?,
                reason = ?,
                updated_at = NOW()
             WHERE id = ?
             AND branch_id = ?`,
            [
                appointmentDate,
                startTime,
                endTime,
                reason ? reason.trim() : null,
                id,
                branchId
            ]
        );

        // ------------------------------------------------
        // Get updated record
        // ------------------------------------------------
        const [updatedSlot] = await db.query(
            `SELECT
                id,
                branch_id,
                appointment_date,
                start_time,
                end_time,
                reason,
                created_at,
                updated_at
             FROM blocked_appointment_slots
             WHERE id = ?
             AND branch_id = ?`,
            [
                id,
                branchId
            ]
        );

        return res.status(200).json({
            success: true,
            message: "Blocked slot updated successfully.",
            data: updatedSlot[0]
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
// DELETE / UNBLOCK SLOT
// ======================================================
export const deleteBlockedSlot = async (req, res) => {
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

        // ------------------------------------------------
        // Check record
        // ------------------------------------------------
        const [slot] = await db.query(
            `SELECT id
             FROM blocked_appointment_slots
             WHERE id = ?
             AND branch_id = ?`,
            [
                id,
                branchId
            ]
        );

        if (slot.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Blocked slot not found."
            });
        }

        // ------------------------------------------------
        // Delete
        // ------------------------------------------------
        await db.query(
            `DELETE FROM blocked_appointment_slots
             WHERE id = ?
             AND branch_id = ?`,
            [
                id,
                branchId
            ]
        );

        return res.status(200).json({
            success: true,
            message: "Appointment slot unblocked successfully."
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};