import { db } from "../config/db.js";
import { getManagerBranchId } from "../utils/patient.helpers.js";


// ======================================================
// ADD APPOINTMENT SETTINGS
// ======================================================
export const addAppointmentSettings = async (req, res) => {
    try {
        const {
            enableAppointment,
            slotDuration,
            maxAppointmentsPerSlot,
            bookingStartDays,
            sameDayBooking,
            appointmentStartTime,
            appointmentEndTime,
            futureAppointmentDays
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
        // Validation
        // ------------------------------------------
        if (
            slotDuration === undefined ||
            maxAppointmentsPerSlot === undefined ||
            bookingStartDays === undefined ||
            appointmentStartTime === undefined ||
            appointmentEndTime === undefined ||
            futureAppointmentDays === undefined
        ) {
            return res.status(400).json({
                success: false,
                message: "All appointment settings fields are required."
            });
        }

        // ------------------------------------------
        // Validate numeric values
        // ------------------------------------------
        if (
            Number(slotDuration) <= 0 ||
            Number(maxAppointmentsPerSlot) <= 0 ||
            Number(bookingStartDays) < 0 ||
            Number(futureAppointmentDays) < 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid appointment settings values."
            });
        }

        // ------------------------------------------
        // Validate time
        // ------------------------------------------
        if (appointmentStartTime >= appointmentEndTime) {
            return res.status(400).json({
                success: false,
                message: "Appointment start time must be earlier than end time."
            });
        }

        // ------------------------------------------
        // Check settings already exist
        // ------------------------------------------
        const [exist] = await db.query(
            `SELECT id
             FROM appointment_settings
             WHERE branch_id = ?`,
            [branchId]
        );

        if (exist.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Appointment settings already exist for this branch."
            });
        }

        // ------------------------------------------
        // Insert settings
        // ------------------------------------------
        const [result] = await db.query(
            `INSERT INTO appointment_settings
            (
                branch_id,
                enable_appointment,
                slot_duration,
                max_appointments_per_slot,
                booking_start_days,
                same_day_booking,
                appointment_start_time,
                appointment_end_time,
                future_appointment_days,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                branchId,
                enableAppointment !== undefined
                    ? enableAppointment
                    : 1,

                slotDuration,

                maxAppointmentsPerSlot,

                bookingStartDays,

                sameDayBooking !== undefined
                    ? sameDayBooking
                    : 1,

                appointmentStartTime,

                appointmentEndTime,

                futureAppointmentDays
            ]
        );

        // ------------------------------------------
        // Fetch created settings
        // ------------------------------------------
        const [settings] = await db.query(
            `SELECT
                id,
                branch_id,
                enable_appointment,
                slot_duration,
                max_appointments_per_slot,
                booking_start_days,
                same_day_booking,
                appointment_start_time,
                appointment_end_time,
                future_appointment_days,
                created_at,
                updated_at
             FROM appointment_settings
             WHERE id = ?
             AND branch_id = ?`,
            [
                result.insertId,
                branchId
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Appointment settings added successfully.",
            data: settings[0]
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
// GET APPOINTMENT SETTINGS
// ======================================================
export const getAppointmentSettings = async (req, res) => {
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

        // ------------------------------------------
        // Get settings
        // ------------------------------------------
        const [settings] = await db.query(
            `SELECT
                id,
                branch_id,
                enable_appointment,
                slot_duration,
                max_appointments_per_slot,
                booking_start_days,
                same_day_booking,
                appointment_start_time,
                appointment_end_time,
                future_appointment_days,
                created_at,
                updated_at
             FROM appointment_settings
             WHERE branch_id = ?`,
            [branchId]
        );

        // ------------------------------------------
        // Settings not found
        // ------------------------------------------
        if (settings.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Appointment settings not found."
            });
        }

        return res.status(200).json({
            success: true,
            data: settings[0]
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
// UPDATE APPOINTMENT SETTINGS
// ======================================================
export const updateAppointmentSettings = async (req, res) => {
    try {
        const {
            enableAppointment,
            slotDuration,
            maxAppointmentsPerSlot,
            bookingStartDays,
            sameDayBooking,
            appointmentStartTime,
            appointmentEndTime,
            futureAppointmentDays
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
        // Validation
        // ------------------------------------------
        if (
            slotDuration === undefined ||
            maxAppointmentsPerSlot === undefined ||
            bookingStartDays === undefined ||
            appointmentStartTime === undefined ||
            appointmentEndTime === undefined ||
            futureAppointmentDays === undefined
        ) {
            return res.status(400).json({
                success: false,
                message: "All appointment settings fields are required."
            });
        }

        // ------------------------------------------
        // Validate numeric values
        // ------------------------------------------
        if (
            Number(slotDuration) <= 0 ||
            Number(maxAppointmentsPerSlot) <= 0 ||
            Number(bookingStartDays) < 0 ||
            Number(futureAppointmentDays) < 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid appointment settings values."
            });
        }

        // ------------------------------------------
        // Validate time
        // ------------------------------------------
        if (appointmentStartTime >= appointmentEndTime) {
            return res.status(400).json({
                success: false,
                message: "Appointment start time must be earlier than end time."
            });
        }

        // ------------------------------------------
        // Check settings
        // ------------------------------------------
        const [settings] = await db.query(
            `SELECT id
             FROM appointment_settings
             WHERE branch_id = ?`,
            [branchId]
        );

        if (settings.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Appointment settings not found."
            });
        }

        // ------------------------------------------
        // Update
        // ------------------------------------------
        await db.query(
            `UPDATE appointment_settings
             SET
                enable_appointment = ?,
                slot_duration = ?,
                max_appointments_per_slot = ?,
                booking_start_days = ?,
                same_day_booking = ?,
                appointment_start_time = ?,
                appointment_end_time = ?,
                future_appointment_days = ?,
                updated_at = NOW()
             WHERE branch_id = ?`,
            [
                enableAppointment !== undefined
                    ? enableAppointment
                    : 1,

                slotDuration,

                maxAppointmentsPerSlot,

                bookingStartDays,

                sameDayBooking !== undefined
                    ? sameDayBooking
                    : 1,

                appointmentStartTime,

                appointmentEndTime,

                futureAppointmentDays,

                branchId
            ]
        );

        // ------------------------------------------
        // Fetch updated settings
        // ------------------------------------------
        const [updatedSettings] = await db.query(
            `SELECT
                id,
                branch_id,
                enable_appointment,
                slot_duration,
                max_appointments_per_slot,
                booking_start_days,
                same_day_booking,
                appointment_start_time,
                appointment_end_time,
                future_appointment_days,
                created_at,
                updated_at
             FROM appointment_settings
             WHERE branch_id = ?`,
            [branchId]
        );

        return res.status(200).json({
            success: true,
            message: "Appointment settings updated successfully.",
            data: updatedSettings[0]
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
// DELETE APPOINTMENT SETTINGS
// ======================================================
export const deleteAppointmentSettings = async (req, res) => {
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

        // ------------------------------------------
        // Check settings
        // ------------------------------------------
        const [settings] = await db.query(
            `SELECT id
             FROM appointment_settings
             WHERE branch_id = ?`,
            [branchId]
        );

        if (settings.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Appointment settings not found."
            });
        }

        // ------------------------------------------
        // Delete
        // ------------------------------------------
        await db.query(
            `DELETE FROM appointment_settings
             WHERE branch_id = ?`,
            [branchId]
        );

        return res.status(200).json({
            success: true,
            message: "Appointment settings deleted successfully."
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};