import { db } from "../config/db.js";
import { getManagerBranchId } from "../utils/patient.helpers.js";


// ======================================================
// ADD WEEKLY SCHEDULE
// ======================================================
export const addWeeklySchedule = async (req, res) => {
    try {
        const {
            dayOfWeek,
            isEnabled,
            morningEnabled,
            morningStartTime,
            morningEndTime,
            eveningEnabled,
            eveningStartTime,
            eveningEndTime
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
        // Required field
        // ------------------------------------------
        if (!dayOfWeek) {
            return res.status(400).json({
                success: false,
                message: "Day of week is required."
            });
        }

        const validDays = [
            "MONDAY",
            "TUESDAY",
            "WEDNESDAY",
            "THURSDAY",
            "FRIDAY",
            "SATURDAY",
            "SUNDAY"
        ];

        const day = dayOfWeek.toUpperCase();

        if (!validDays.includes(day)) {
            return res.status(400).json({
                success: false,
                message: "Invalid day of week."
            });
        }

        // ------------------------------------------
        // Check existing day
        // ------------------------------------------
        const [exist] = await db.query(
            `SELECT id
             FROM weekly_schedules
             WHERE branch_id = ?
             AND day_of_week = ?`,
            [
                branchId,
                day
            ]
        );

        if (exist.length > 0) {
            return res.status(409).json({
                success: false,
                message: `${day} schedule already exists.`
            });
        }

        // ------------------------------------------
        // Validate morning session
        // ------------------------------------------
        if (morningEnabled) {

            if (!morningStartTime || !morningEndTime) {
                return res.status(400).json({
                    success: false,
                    message: "Morning start and end time are required."
                });
            }

            if (morningStartTime >= morningEndTime) {
                return res.status(400).json({
                    success: false,
                    message: "Morning start time must be earlier than end time."
                });
            }
        }

        // ------------------------------------------
        // Validate evening session
        // ------------------------------------------
        if (eveningEnabled) {

            if (!eveningStartTime || !eveningEndTime) {
                return res.status(400).json({
                    success: false,
                    message: "Evening start and end time are required."
                });
            }

            if (eveningStartTime >= eveningEndTime) {
                return res.status(400).json({
                    success: false,
                    message: "Evening start time must be earlier than end time."
                });
            }
        }

        // ------------------------------------------
        // Insert
        // ------------------------------------------
        const [result] = await db.query(
            `INSERT INTO weekly_schedules
            (
                branch_id,
                day_of_week,
                is_enabled,
                morning_enabled,
                morning_start_time,
                morning_end_time,
                evening_enabled,
                evening_start_time,
                evening_end_time,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                branchId,
                day,
                isEnabled !== undefined ? isEnabled : 1,

                morningEnabled !== undefined
                    ? morningEnabled
                    : 0,

                morningEnabled
                    ? morningStartTime
                    : null,

                morningEnabled
                    ? morningEndTime
                    : null,

                eveningEnabled !== undefined
                    ? eveningEnabled
                    : 0,

                eveningEnabled
                    ? eveningStartTime
                    : null,

                eveningEnabled
                    ? eveningEndTime
                    : null
            ]
        );

        // ------------------------------------------
        // Get inserted schedule
        // ------------------------------------------
        const [schedule] = await db.query(
            `SELECT
                id,
                branch_id,
                day_of_week,
                is_enabled,
                morning_enabled,
                morning_start_time,
                morning_end_time,
                evening_enabled,
                evening_start_time,
                evening_end_time,
                created_at,
                updated_at
             FROM weekly_schedules
             WHERE id = ?
             AND branch_id = ?`,
            [
                result.insertId,
                branchId
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Weekly schedule added successfully.",
            data: schedule[0]
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
// GET WEEKLY SCHEDULE
// ======================================================
export const getWeeklySchedule = async (req, res) => {
    try {
        const managerId = req.user.id;
        const branchId = await getManagerBranchId(managerId);

        if (!branchId) {
            return res.status(400).json({
                success: false,
                message: "Branch not assigned."
            });
        }

        const [schedule] = await db.query(
            `SELECT
                id,
                branch_id,
                day_of_week,
                is_enabled,
                morning_enabled,
                morning_start_time,
                morning_end_time,
                evening_enabled,
                evening_start_time,
                evening_end_time,
                created_at,
                updated_at
             FROM weekly_schedules
             WHERE branch_id = ?
             ORDER BY
                FIELD(
                    day_of_week,
                    'MONDAY',
                    'TUESDAY',
                    'WEDNESDAY',
                    'THURSDAY',
                    'FRIDAY',
                    'SATURDAY',
                    'SUNDAY'
                )`,
            [branchId]
        );

        return res.status(200).json({
            success: true,
            count: schedule.length,
            data: schedule
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
// GET WEEKLY SCHEDULE BY DAY
// ======================================================
export const getWeeklyScheduleByDay = async (req, res) => {
    try {
        const { day } = req.params;

        const managerId = req.user.id;
        const branchId = await getManagerBranchId(managerId);

        if (!branchId) {
            return res.status(400).json({
                success: false,
                message: "Branch not assigned."
            });
        }

        const validDays = [
            "MONDAY",
            "TUESDAY",
            "WEDNESDAY",
            "THURSDAY",
            "FRIDAY",
            "SATURDAY",
            "SUNDAY"
        ];

        const dayName = day.toUpperCase();

        if (!validDays.includes(dayName)) {
            return res.status(400).json({
                success: false,
                message: "Invalid day of week."
            });
        }

        const [schedule] = await db.query(
            `SELECT
                id,
                branch_id,
                day_of_week,
                is_enabled,
                morning_enabled,
                morning_start_time,
                morning_end_time,
                evening_enabled,
                evening_start_time,
                evening_end_time,
                created_at,
                updated_at
             FROM weekly_schedules
             WHERE branch_id = ?
             AND day_of_week = ?`,
            [
                branchId,
                dayName
            ]
        );

        if (schedule.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Schedule not found for this day."
            });
        }

        return res.status(200).json({
            success: true,
            data: schedule[0]
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
// UPDATE WEEKLY SCHEDULE
// ======================================================
export const updateWeeklySchedule = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            dayOfWeek,
            isEnabled,
            morningEnabled,
            morningStartTime,
            morningEndTime,
            eveningEnabled,
            eveningStartTime,
            eveningEndTime
        } = req.body;

        const managerId = req.user.id;
        const branchId = await getManagerBranchId(managerId);

        if (!branchId) {
            return res.status(400).json({
                success: false,
                message: "Branch not assigned."
            });
        }

        // ------------------------------------------
        // Check schedule
        // ------------------------------------------
        const [schedule] = await db.query(
            `SELECT id
             FROM weekly_schedules
             WHERE id = ?
             AND branch_id = ?`,
            [
                id,
                branchId
            ]
        );

        if (schedule.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Weekly schedule not found."
            });
        }

        // ------------------------------------------
        // Validate day
        // ------------------------------------------
        const validDays = [
            "MONDAY",
            "TUESDAY",
            "WEDNESDAY",
            "THURSDAY",
            "FRIDAY",
            "SATURDAY",
            "SUNDAY"
        ];

        const day = dayOfWeek
            ? dayOfWeek.toUpperCase()
            : null;

        if (day && !validDays.includes(day)) {
            return res.status(400).json({
                success: false,
                message: "Invalid day of week."
            });
        }

        // ------------------------------------------
        // Check duplicate day
        // ------------------------------------------
        if (day) {

            const [exist] = await db.query(
                `SELECT id
                 FROM weekly_schedules
                 WHERE branch_id = ?
                 AND day_of_week = ?
                 AND id <> ?`,
                [
                    branchId,
                    day,
                    id
                ]
            );

            if (exist.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: `${day} schedule already exists.`
                });
            }
        }

        // ------------------------------------------
        // Validate morning session
        // ------------------------------------------
        if (morningEnabled) {

            if (!morningStartTime || !morningEndTime) {
                return res.status(400).json({
                    success: false,
                    message: "Morning start and end time are required."
                });
            }

            if (morningStartTime >= morningEndTime) {
                return res.status(400).json({
                    success: false,
                    message: "Morning start time must be earlier than end time."
                });
            }
        }

        // ------------------------------------------
        // Validate evening session
        // ------------------------------------------
        if (eveningEnabled) {

            if (!eveningStartTime || !eveningEndTime) {
                return res.status(400).json({
                    success: false,
                    message: "Evening start and end time are required."
                });
            }

            if (eveningStartTime >= eveningEndTime) {
                return res.status(400).json({
                    success: false,
                    message: "Evening start time must be earlier than end time."
                });
            }
        }

        // ------------------------------------------
        // Update
        // ------------------------------------------
        await db.query(
            `UPDATE weekly_schedules
             SET
                day_of_week = ?,
                is_enabled = ?,
                morning_enabled = ?,
                morning_start_time = ?,
                morning_end_time = ?,
                evening_enabled = ?,
                evening_start_time = ?,
                evening_end_time = ?,
                updated_at = NOW()
             WHERE id = ?
             AND branch_id = ?`,
            [
                day,

                isEnabled !== undefined
                    ? isEnabled
                    : 1,

                morningEnabled !== undefined
                    ? morningEnabled
                    : 0,

                morningEnabled
                    ? morningStartTime
                    : null,

                morningEnabled
                    ? morningEndTime
                    : null,

                eveningEnabled !== undefined
                    ? eveningEnabled
                    : 0,

                eveningEnabled
                    ? eveningStartTime
                    : null,

                eveningEnabled
                    ? eveningEndTime
                    : null,

                id,
                branchId
            ]
        );

        // ------------------------------------------
        // Get updated schedule
        // ------------------------------------------
        const [updatedSchedule] = await db.query(
            `SELECT
                id,
                branch_id,
                day_of_week,
                is_enabled,
                morning_enabled,
                morning_start_time,
                morning_end_time,
                evening_enabled,
                evening_start_time,
                evening_end_time,
                created_at,
                updated_at
             FROM weekly_schedules
             WHERE id = ?
             AND branch_id = ?`,
            [
                id,
                branchId
            ]
        );

        return res.status(200).json({
            success: true,
            message: "Weekly schedule updated successfully.",
            data: updatedSchedule[0]
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
// DELETE WEEKLY SCHEDULE
// ======================================================
export const deleteWeeklySchedule = async (req, res) => {
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

        const [schedule] = await db.query(
            `SELECT id
             FROM weekly_schedules
             WHERE id = ?
             AND branch_id = ?`,
            [
                id,
                branchId
            ]
        );

        if (schedule.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Weekly schedule not found."
            });
        }

        await db.query(
            `DELETE FROM weekly_schedules
             WHERE id = ?
             AND branch_id = ?`,
            [
                id,
                branchId
            ]
        );

        return res.status(200).json({
            success: true,
            message: "Weekly schedule deleted successfully."
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};