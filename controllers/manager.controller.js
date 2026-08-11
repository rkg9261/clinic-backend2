import { db } from "../config/db.js";

const normalizePhone = (value) => (value ? String(value).trim() : null);
const normalizeText = (value) => (value ? String(value).trim() : null);
const normalizeUpper = (value) => (value ? String(value).trim().toUpperCase() : null);

const fetchManagerBranchId = async (userId) => {
    const [rows] = await db.query(
        "SELECT branch_id FROM users WHERE id = ? LIMIT 1",
        [userId]
    );

    return rows[0]?.branch_id ?? null;
};

export const submitByFileNumber = async (req, res) => {
    try {
        const { fileNumber } = req.body;
        const managerId = req.user?.id;
        const managerBranchId = await fetchManagerBranchId(managerId);

        if (!fileNumber) {
            return res.status(400).json({
                success: false,
                message: "fileNumber is required"
            });
        }

        if (!managerBranchId) {
            return res.status(400).json({
                success: false,
                message: "Branch is not assigned to this manager"
            });
        }

        const [rows] = await db.query(
            `SELECT id, file_number, full_name, mobile_number, age, gender, address,
                    notes, branch_id, created_by_manager_id, created_at, updated_at
             FROM patients
             WHERE file_number = ? AND branch_id = ?
             LIMIT 1`,
            [String(fileNumber).trim(), managerBranchId]
        );

        if (!rows[0]) {
            return res.status(404).json({
                success: false,
                message: "Patient not found for this file number"
            });
        }

        return res.status(200).json({
            success: true,
            data: rows[0]
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const addNewPatient = async (req, res) => {
    try {
        const { fileNumber, fullName, mobileNumber, age, gender, address, notes } = req.body;
        const managerId = req.user?.id;
        const managerBranchId = await fetchManagerBranchId(managerId);

        if (!fileNumber || !fullName || !mobileNumber) {
            return res.status(400).json({
                success: false,
                message: "fileNumber, fullName and mobileNumber are required"
            });
        }

        if (!managerBranchId) {
            return res.status(400).json({
                success: false,
                message: "Branch is not assigned to this manager"
            });
        }

        const [existingRows] = await db.query(
            `SELECT id FROM patients
             WHERE file_number = ? AND branch_id = ?
             LIMIT 1`,
            [String(fileNumber).trim(), managerBranchId]
        );

        if (existingRows[0]) {
            return res.status(409).json({
                success: false,
                message: "This file number already exists in your branch"
            });
        }

        const [result] = await db.query(
            `INSERT INTO patients (
                file_number, full_name, mobile_number, age, gender, address, notes,
                branch_id, created_by_manager_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                String(fileNumber).trim(),
                normalizeText(fullName),
                normalizePhone(mobileNumber),
                age ?? null,
                normalizeText(gender),
                normalizeText(address),
                normalizeText(notes),
                managerBranchId,
                managerId
            ]
        );

        const [rows] = await db.query(
            `SELECT id, file_number, full_name, mobile_number, age, gender, address,
                    notes, branch_id, created_by_manager_id, created_at, updated_at
             FROM patients WHERE id = ?`,
            [result.insertId]
        );

        return res.status(201).json({
            success: true,
            message: "Patient added successfully",
            data: rows[0]
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const createTimeTableEntry = async (req, res) => {
    try {
        const { dayOfWeek, startTime, endTime, doctorName, roomNo, note } = req.body;
        const managerId = req.user?.id;
        const managerBranchId = await fetchManagerBranchId(managerId);

        if (!dayOfWeek || !startTime || !endTime) {
            return res.status(400).json({
                success: false,
                message: "dayOfWeek, startTime and endTime are required"
            });
        }

        if (!managerBranchId) {
            return res.status(400).json({
                success: false,
                message: "Branch is not assigned to this manager"
            });
        }

        const [result] = await db.query(
            `INSERT INTO manager_time_tables (
                branch_id, day_of_week, start_time, end_time, doctor_name, room_no, note, created_by_manager_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                managerBranchId,
                normalizeUpper(dayOfWeek),
                String(startTime).trim(),
                String(endTime).trim(),
                normalizeText(doctorName),
                normalizeText(roomNo),
                normalizeText(note),
                managerId
            ]
        );

        const [rows] = await db.query(
            `SELECT id, branch_id, day_of_week, start_time, end_time, doctor_name, room_no, note,
                    created_by_manager_id, created_at, updated_at
             FROM manager_time_tables WHERE id = ?`,
            [result.insertId]
        );

        return res.status(201).json({
            success: true,
            message: "Time table entry created",
            data: rows[0]
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const listTimeTable = async (req, res) => {
    try {
        const managerId = req.user?.id;
        const managerBranchId = await fetchManagerBranchId(managerId);

        if (!managerBranchId) {
            return res.status(400).json({
                success: false,
                message: "Branch is not assigned to this manager"
            });
        }

        const [rows] = await db.query(
            `SELECT id, branch_id, day_of_week, start_time, end_time, doctor_name, room_no, note,
                    created_by_manager_id, created_at, updated_at
             FROM manager_time_tables
             WHERE branch_id = ?
             ORDER BY FIELD(day_of_week, 'MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'),
                      start_time ASC`,
            [managerBranchId]
        );

        return res.status(200).json({
            success: true,
            data: rows
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const updateTimeTableEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const { dayOfWeek, startTime, endTime, doctorName, roomNo, note } = req.body;
        const managerId = req.user?.id;
        const managerBranchId = await fetchManagerBranchId(managerId);

        if (!managerBranchId) {
            return res.status(400).json({
                success: false,
                message: "Branch is not assigned to this manager"
            });
        }

        const [existingRows] = await db.query(
            `SELECT id, branch_id, day_of_week, start_time, end_time, doctor_name, room_no, note
             FROM manager_time_tables
             WHERE id = ? AND branch_id = ?
             LIMIT 1`,
            [id, managerBranchId]
        );

        if (!existingRows[0]) {
            return res.status(404).json({
                success: false,
                message: "Time table entry not found"
            });
        }

        const existing = existingRows[0];

        await db.query(
            `UPDATE manager_time_tables
             SET day_of_week = ?, start_time = ?, end_time = ?, doctor_name = ?, room_no = ?, note = ?
             WHERE id = ? AND branch_id = ?`,
            [
                normalizeUpper(dayOfWeek) || existing.day_of_week,
                normalizeText(startTime) || existing.start_time,
                normalizeText(endTime) || existing.end_time,
                normalizeText(doctorName) || existing.doctor_name,
                normalizeText(roomNo) || existing.room_no,
                normalizeText(note) || existing.note,
                id,
                managerBranchId
            ]
        );

        const [updatedRows] = await db.query(
            `SELECT id, branch_id, day_of_week, start_time, end_time, doctor_name, room_no, note,
                    created_by_manager_id, created_at, updated_at
             FROM manager_time_tables
             WHERE id = ? AND branch_id = ?`,
            [id, managerBranchId]
        );

        return res.status(200).json({
            success: true,
            message: "Time table entry updated successfully",
            data: updatedRows[0]
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const deleteTimeTableEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const managerId = req.user?.id;
        const managerBranchId = await fetchManagerBranchId(managerId);

        if (!managerBranchId) {
            return res.status(400).json({
                success: false,
                message: "Branch is not assigned to this manager"
            });
        }

        const [rows] = await db.query(
            `SELECT id FROM manager_time_tables
             WHERE id = ? AND branch_id = ?
             LIMIT 1`,
            [id, managerBranchId]
        );

        if (!rows[0]) {
            return res.status(404).json({
                success: false,
                message: "Time table entry not found"
            });
        }

        await db.query(
            `DELETE FROM manager_time_tables
             WHERE id = ? AND branch_id = ?`,
            [id, managerBranchId]
        );

        return res.status(200).json({
            success: true,
            message: "Time table entry deleted successfully"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const createNewQuery = async (req, res) => {
    try {
        const { patientFileNumber, subject, description, priority } = req.body;
        const managerId = req.user?.id;
        const managerBranchId = await fetchManagerBranchId(managerId);

        if (!subject || !description) {
            return res.status(400).json({
                success: false,
                message: "subject and description are required"
            });
        }

        if (!managerBranchId) {
            return res.status(400).json({
                success: false,
                message: "Branch is not assigned to this manager"
            });
        }

        const [result] = await db.query(
            `INSERT INTO manager_queries (
                branch_id, created_by_manager_id, patient_file_number, subject, description, priority
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [
                managerBranchId,
                managerId,
                normalizeText(patientFileNumber),
                normalizeText(subject),
                normalizeText(description),
                normalizeUpper(priority) || "MEDIUM"
            ]
        );

        const [rows] = await db.query(
            `SELECT id, branch_id, created_by_manager_id, patient_file_number, subject, description,
                    priority, status, created_at, updated_at
             FROM manager_queries WHERE id = ?`,
            [result.insertId]
        );

        return res.status(201).json({
            success: true,
            message: "Query submitted successfully",
            data: rows[0]
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const listManagerQueries = async (req, res) => {
    try {
        const managerId = req.user?.id;
        const managerBranchId = await fetchManagerBranchId(managerId);
        const statusFilter = normalizeUpper(req.query.status);

        if (!managerBranchId) {
            return res.status(400).json({
                success: false,
                message: "Branch is not assigned to this manager"
            });
        }

        if (
            statusFilter &&
            statusFilter !== "OPEN" &&
            statusFilter !== "IN_PROGRESS" &&
            statusFilter !== "CLOSED"
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid status filter. Use OPEN, IN_PROGRESS or CLOSED"
            });
        }

        let query = `SELECT id, branch_id, created_by_manager_id, patient_file_number, subject, description,
                            priority, status, created_at, updated_at
                     FROM manager_queries
                     WHERE branch_id = ?`;
        const params = [managerBranchId];

        if (statusFilter) {
            query += " AND status = ?";
            params.push(statusFilter);
        }

        query += " ORDER BY created_at DESC";

        const [rows] = await db.query(query, params);

        return res.status(200).json({
            success: true,
            data: rows
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const updateManagerQuery = async (req, res) => {
    try {
        const { id } = req.params;
        const { subject, description, priority, status } = req.body;
        const managerId = req.user?.id;
        const managerBranchId = await fetchManagerBranchId(managerId);

        if (!managerBranchId) {
            return res.status(400).json({
                success: false,
                message: "Branch is not assigned to this manager"
            });
        }

        const [existingRows] = await db.query(
            `SELECT id, branch_id, subject, description, priority, status
             FROM manager_queries
             WHERE id = ? AND branch_id = ?
             LIMIT 1`,
            [id, managerBranchId]
        );

        if (!existingRows[0]) {
            return res.status(404).json({
                success: false,
                message: "Query not found"
            });
        }

        const existing = existingRows[0];
        const normalizedStatus = normalizeUpper(status);

        if (
            normalizedStatus &&
            normalizedStatus !== "OPEN" &&
            normalizedStatus !== "IN_PROGRESS" &&
            normalizedStatus !== "CLOSED"
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid status. Use OPEN, IN_PROGRESS or CLOSED"
            });
        }

        await db.query(
            `UPDATE manager_queries
             SET subject = ?, description = ?, priority = ?, status = ?
             WHERE id = ? AND branch_id = ?`,
            [
                normalizeText(subject) || existing.subject,
                normalizeText(description) || existing.description,
                normalizeUpper(priority) || existing.priority,
                normalizedStatus || existing.status,
                id,
                managerBranchId
            ]
        );

        const [updatedRows] = await db.query(
            `SELECT id, branch_id, created_by_manager_id, patient_file_number, subject, description,
                    priority, status, created_at, updated_at
             FROM manager_queries
             WHERE id = ? AND branch_id = ?`,
            [id, managerBranchId]
        );

        return res.status(200).json({
            success: true,
            message: "Query updated successfully",
            data: updatedRows[0]
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const updateManagerQueryStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const managerId = req.user?.id;
        const managerBranchId = await fetchManagerBranchId(managerId);
        const normalizedStatus = normalizeUpper(status);

        if (!managerBranchId) {
            return res.status(400).json({
                success: false,
                message: "Branch is not assigned to this manager"
            });
        }

        if (!normalizedStatus || !["IN_PROGRESS", "CLOSED"].includes(normalizedStatus)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status. Use IN_PROGRESS or CLOSED"
            });
        }

        const [rows] = await db.query(
            `SELECT id FROM manager_queries
             WHERE id = ? AND branch_id = ?
             LIMIT 1`,
            [id, managerBranchId]
        );

        if (!rows[0]) {
            return res.status(404).json({
                success: false,
                message: "Query not found"
            });
        }

        await db.query(
            `UPDATE manager_queries
             SET status = ?
             WHERE id = ? AND branch_id = ?`,
            [normalizedStatus, id, managerBranchId]
        );

        const [updatedRows] = await db.query(
            `SELECT id, branch_id, created_by_manager_id, patient_file_number, subject, description,
                    priority, status, created_at, updated_at
             FROM manager_queries
             WHERE id = ? AND branch_id = ?`,
            [id, managerBranchId]
        );

        return res.status(200).json({
            success: true,
            message: "Query status updated successfully",
            data: updatedRows[0]
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const deleteManagerQuery = async (req, res) => {
    try {
        const { id } = req.params;
        const managerId = req.user?.id;
        const managerBranchId = await fetchManagerBranchId(managerId);

        if (!managerBranchId) {
            return res.status(400).json({
                success: false,
                message: "Branch is not assigned to this manager"
            });
        }

        const [rows] = await db.query(
            `SELECT id FROM manager_queries
             WHERE id = ? AND branch_id = ?
             LIMIT 1`,
            [id, managerBranchId]
        );

        if (!rows[0]) {
            return res.status(404).json({
                success: false,
                message: "Query not found"
            });
        }

        await db.query(
            `DELETE FROM manager_queries
             WHERE id = ? AND branch_id = ?`,
            [id, managerBranchId]
        );

        return res.status(200).json({
            success: true,
            message: "Query deleted successfully"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const downloadReport = async (req, res) => {
    try {
        const managerId = req.user?.id;
        const managerBranchId = await fetchManagerBranchId(managerId);

        if (!managerBranchId) {
            return res.status(400).json({
                success: false,
                message: "Branch is not assigned to this manager"
            });
        }

        const [patientAggRows] = await db.query(
            `SELECT COUNT(*) AS totalPatients
             FROM patients
             WHERE branch_id = ?`,
            [managerBranchId]
        );

        const [queryAggRows] = await db.query(
            `SELECT
                COUNT(*) AS totalQueries,
                SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) AS openQueries,
                SUM(CASE WHEN status = 'CLOSED' THEN 1 ELSE 0 END) AS closedQueries
             FROM manager_queries
             WHERE branch_id = ?`,
            [managerBranchId]
        );

        const [latestPatients] = await db.query(
            `SELECT id, file_number, full_name, mobile_number, created_at
             FROM patients
             WHERE branch_id = ?
             ORDER BY created_at DESC
             LIMIT 10`,
            [managerBranchId]
        );

        return res.status(200).json({
            success: true,
            message: "Report generated successfully",
            data: {
                generatedAt: new Date().toISOString(),
                branchId: managerBranchId,
                summary: {
                    totalPatients: Number(patientAggRows[0]?.totalPatients || 0),
                    totalQueries: Number(queryAggRows[0]?.totalQueries || 0),
                    openQueries: Number(queryAggRows[0]?.openQueries || 0),
                    closedQueries: Number(queryAggRows[0]?.closedQueries || 0)
                },
                latestPatients
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
