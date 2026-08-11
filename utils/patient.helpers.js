import { db } from "../config/db.js";

export const generateFileNumber = async (branchId) => {
    const year = new Date().getFullYear();
    const prefix = `BR${branchId}-${year}`;

    const [rows] = await db.query(
        `SELECT file_number FROM patients
         WHERE branch_id = ? AND file_number LIKE ?
         ORDER BY id DESC LIMIT 1`,
        [branchId, `${prefix}%`]
    );

    let seq = 1;
    if (rows[0]?.file_number) {
        const lastSeq = Number(rows[0].file_number.split("-").pop());
        if (!Number.isNaN(lastSeq)) seq = lastSeq + 1;
    }

    return `${prefix}${String(seq).padStart(4, "0")}`;
};

export const generatePatientCode = async () => {
    const [rows] = await db.query(
        "SELECT id FROM patients ORDER BY id DESC LIMIT 1"
    );
    const nextId = (rows[0]?.id ?? 0) + 1;
    return `PID-${String(nextId).padStart(6, "0")}`;
};

export const computePatientStats = async (patientId) => {
    const [attendanceRows] = await db.query(
        `SELECT
            COUNT(*) AS totalMarked,
            SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) AS presentCount,
            SUM(CASE WHEN status = 'LATE' THEN 1 ELSE 0 END) AS lateCount,
            SUM(CASE WHEN status = 'ABSENT' THEN 1 ELSE 0 END) AS absentCount,
            MAX(CASE WHEN status IN ('PRESENT','LATE') THEN attendance_date END) AS lastAttendance
         FROM attendance_records
         WHERE patient_id = ?`,
        [patientId]
    );

    const stats = attendanceRows[0] || {};
    const totalMarked = Number(stats.totalMarked || 0);
    const presentCount = Number(stats.presentCount || 0);
    const lateCount = Number(stats.lateCount || 0);
    const absentCount = Number(stats.absentCount || 0);

    const attended = presentCount + lateCount;
    const attendancePercent =
        totalMarked > 0 ? Math.round((attended / totalMarked) * 100) : 0;

    const punctualityPercent =
        attended > 0 ? Math.round((presentCount / attended) * 100) : 0;

    const [patientRows] = await db.query(
        `SELECT sessions_remaining, total_sessions, last_attendance_date, patient_code, file_number
         FROM patients WHERE id = ? LIMIT 1`,
        [patientId]
    );

    const patient = patientRows[0] || {};

    return {
        fileNumber: patient.file_number,
        patientCode: patient.patient_code,
        lastAttendanceDate: stats.lastAttendance || patient.last_attendance_date,
        attendancePercent,
        punctualityPercent,
        balanceSessions: Number(patient.sessions_remaining || 0),
        totalSessions: Number(patient.total_sessions || 0),
        presentCount,
        lateCount,
        absentCount
    };
};

export const fetchPatientByFile = async (fileNumber, branchId) => {
    const [rows] = await db.query(
        `SELECT * FROM patients WHERE file_number = ? AND branch_id = ? LIMIT 1`,
        [fileNumber, branchId]
    );
    return rows[0] ?? null;
};

export const getManagerBranchId = async (userId) => {
    const [rows] = await db.query(
        "SELECT branch_id FROM users WHERE id = ? LIMIT 1",
        [userId]
    );
    return rows[0]?.branch_id ?? null;
};
