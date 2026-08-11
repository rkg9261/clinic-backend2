import { db } from "../config/db.js";
import { getFormOptions } from "./prescriptionMaster.controller.js";

const toNumber = (value, fallback = null) => {
  if (value === null || value === undefined || value === "") return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const getBranchId = (req) => req.user.branchId || req.user.branch_id;

const pick = (body, ...keys) => {
  for (const key of keys) {
    if (body[key] !== undefined && body[key] !== null) return body[key];
  }
  return undefined;
};

const verifyPatientInBranch = async (connection, patientId, branchId) => {
  const [rows] = await connection.query(
    `SELECT id, full_name, file_number, age, gender, address
     FROM patients WHERE id = ? AND branch_id = ? LIMIT 1`,
    [patientId, branchId]
  );
  return rows[0] ?? null;
};

const verifyDoctorInBranch = async (connection, doctorId, branchId) => {
  const [rows] = await connection.query(
    "SELECT id, doctor_name FROM doctors WHERE id = ? AND branch_id = ? LIMIT 1",
    [doctorId, branchId]
  );
  return rows[0] ?? null;
};

// const generatePrescriptionNo = async (connection, branchId, prescriptionDate) => {
//   const dateObj = new Date(prescriptionDate);
//   const datePart = dateObj.toISOString().slice(0, 10).replace(/-/g, "");

//   const [branchRows] = await connection.query(
//     "SELECT clinic_code FROM branches WHERE id = ? LIMIT 1",
//     [branchId]
//   );
//   const branchCode = (branchRows[0]?.clinic_code ?? "BR").replace(/\s+/g, "").toUpperCase();

//   const [countRows] = await connection.query(
//     `SELECT COUNT(*) AS cnt FROM prescriptions
//      WHERE branch_id = ? AND DATE(prescription_date) = DATE(?)
//      FOR UPDATE`,
//     [branchId, prescriptionDate]
//   );
//   const seq = String(Number(countRows[0].cnt) + 1).padStart(3, "0");
//   return `RX-${branchCode}-${datePart}-${seq}`;
// };


const generatePrescriptionNo = async (connection, branchId, prescriptionDate) => {
  const dateObj = new Date(prescriptionDate);
  const datePart = dateObj.toISOString().slice(0, 10).replace(/-/g, "");

  const [branchRows] = await connection.query(
    "SELECT clinic_code FROM branches WHERE id = ? LIMIT 1",
    [branchId]
  );

  const branchCode = (branchRows[0]?.clinic_code ?? "BR")
    .replace(/\s+/g, "")
    .toUpperCase();

  const prefix = `RX-${branchCode}-${datePart}-`;

  const [rows] = await connection.query(
    `
    SELECT prescription_no
    FROM prescriptions
    WHERE prescription_no LIKE ?
    ORDER BY prescription_no DESC
    LIMIT 1
    FOR UPDATE
    `,
    [`${prefix}%`]
  );

  let nextSeq = 1;

  if (rows.length > 0) {
    const lastNo = rows[0].prescription_no;
    const lastSeq = parseInt(lastNo.split("-").pop(), 10);
    nextSeq = lastSeq + 1;
  }

  return `${prefix}${String(nextSeq).padStart(3, "0")}`;
};


const normalizeGender = (value) => {
  if (!value) return null;
  const normalized = String(value).trim();
  if (["Male", "Female", "Other"].includes(normalized)) return normalized;
  const lower = normalized.toLowerCase();
  if (lower === "male" || lower === "m") return "Male";
  if (lower === "female" || lower === "f") return "Female";
  return "Other";
};

const formatMySQLDateTime = (value) => {
  if (!value) return null;

  const date = new Date(value);

  if (isNaN(date.getTime())) {
    return null;
  }

  const pad = (num) => String(num).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const normalizePrescriptionPayload = (body) => {
  const snapshot = body.patientSnapshot ?? body.patient_snapshot ?? {};

  const header = {
    appointmentId: pick(body, "appointmentId", "appointment_id") ?? null,
    patientId: pick(body, "patientId", "patient_id"),
    doctorId: pick(body, "doctorId", "doctor_id"),
    prescriptionDate: formatMySQLDateTime(
  pick(body, "prescriptionDate", "prescription_date") ?? new Date()
),
    chiefComplaint: pick(body, "chiefComplaint", "chief_complaint") ?? null,
    otherDetails: pick(body, "otherDetails", "other_details") ?? null,
    examination: body.examination ?? null,
    diagnosis: body.diagnosis ?? null,
    investigationNotes: pick(body, "investigationNotes", "investigation_notes") ?? null,
    advancedXrayLab: pick(body, "advancedXrayLab", "advanced_xray_lab") ?? null,
    otherInvestigation: pick(body, "otherInvestigation", "other_investigation") ?? null,
    homeRehab: pick(body, "homeRehab", "home_rehab") ?? null,
    homeRecoveryProgram: pick(body, "homeRecoveryProgram", "home_recovery_program") ?? null,
    acceleratedRecoveryPackage:
      pick(body, "acceleratedRecoveryPackage", "accelerated_recovery_package") ?? null,
    frequency: body.frequency ?? null,
    duration: body.duration ?? null,
    remarks: body.remarks ?? null,
  };

  const patientSnapshot = {
    patientName:
      pick(snapshot, "patientName", "patient_name") ??
      pick(body, "patientName", "patient_name") ??
      null,
    age: toNumber(pick(snapshot, "age") ?? pick(body, "age"), null),
    gender: normalizeGender(pick(snapshot, "gender") ?? pick(body, "gender")),
    address: pick(snapshot, "address") ?? pick(body, "address") ?? null,
    referredBy: pick(snapshot, "referredBy", "referred_by") ?? null,
    visitDatetime: formatMySQLDateTime(
  pick(snapshot, "visitDatetime", "visit_datetime") ??
  pick(body, "visitDatetime", "visit_datetime") ??
  header.prescriptionDate
),
  };

  const investigations = (body.investigations ?? [])
    .map((row, index) => ({
      investigationId: row.investigationId ?? row.investigation_id ?? row.id,
      sortOrder: toNumber(row.sortOrder ?? row.sort_order, index + 1),
    }))
    .filter((row) => row.investigationId);

  const pathology = (body.pathology ?? [])
    .map((row, index) => ({
      pathologyId: row.pathologyId ?? row.pathology_id ?? row.id,
      sortOrder: toNumber(row.sortOrder ?? row.sort_order, index + 1),
    }))
    .filter((row) => row.pathologyId);

  const modalities = (body.modalities ?? [])
    .map((row, index) => ({
      modalityId: row.modalityId ?? row.modality_id ?? row.id,
      charge: toNumber(row.charge ?? row.charges, 0),
      sortOrder: toNumber(row.sortOrder ?? row.sort_order, index + 1),
    }))
    .filter((row) => row.modalityId);

  const discounts = (body.discounts ?? [])
    .map((row) => ({
      noOfSessions: toNumber(row.noOfSessions ?? row.no_of_sessions ?? row.sessions),
      essentialCharge: toNumber(
        row.essentialCharge ?? row.essential_charge ?? row.standardCharge ?? row.standard_charge
      ),
      advancedCharge: toNumber(
        row.advancedCharge ?? row.advanced_charge ?? row.advanceCharge ?? row.advance_charge
      ),
    }))
    .filter((row) => row.noOfSessions);

  return { header, patientSnapshot, investigations, pathology, modalities, discounts };
};

const fetchPrescriptionDetails = async (connection, prescriptionId, branchId) => {
  const [prescriptions] = await connection.query(
    `SELECT p.*,
            d.doctor_name,
            pt.full_name AS linked_patient_name,
            pt.file_number AS patient_file_number
     FROM prescriptions p
     INNER JOIN patients pt ON pt.id = p.patient_id
     LEFT JOIN doctors d ON d.id = p.doctor_id
     WHERE p.id = ? AND p.branch_id = ?
     LIMIT 1`,
    [prescriptionId, branchId]
  );

  if (prescriptions.length === 0) return null;
  const prescription = prescriptions[0];

  const [snapshots] = await connection.query(
    `SELECT patient_name, age, gender, address, referred_by, visit_datetime
     FROM prescription_patient_snapshot
     WHERE prescription_id = ?
     LIMIT 1`,
    [prescriptionId]
  );

  const [investigations] = await connection.query(
    `SELECT pi.id, pi.investigation_id, pi.sort_order,
            im.name, ic.id AS category_id, ic.name AS category_name
     FROM prescription_investigations pi
     INNER JOIN investigations_master im ON im.id = pi.investigation_id
     INNER JOIN investigation_categories ic ON ic.id = im.category_id
     WHERE pi.prescription_id = ?
     ORDER BY pi.sort_order ASC, pi.id ASC`,
    [prescriptionId]
  );

  const [pathology] = await connection.query(
    `SELECT pp.id, pp.pathology_id, pp.sort_order, pm.name
     FROM prescription_pathology pp
     INNER JOIN pathology_master pm ON pm.id = pp.pathology_id
     WHERE pp.prescription_id = ?
     ORDER BY pp.sort_order ASC, pp.id ASC`,
    [prescriptionId]
  );

  const [modalities] = await connection.query(
    `SELECT pm.id, pm.modality_id, pm.charge, pm.sort_order,
            tm.name, tm.category
     FROM prescription_modalities pm
     INNER JOIN treatment_modalities_master tm ON tm.id = pm.modality_id
     WHERE pm.prescription_id = ?
     ORDER BY pm.sort_order ASC, pm.id ASC`,
    [prescriptionId]
  );

  const [discounts] = await connection.query(
    `SELECT id, no_of_sessions, essential_charge, advanced_charge
     FROM prescription_discounts
     WHERE prescription_id = ?
     ORDER BY no_of_sessions ASC`,
    [prescriptionId]
  );

  const snapshot = snapshots[0] ?? {};

  return {
    id: prescription.id,
    prescriptionNo: prescription.prescription_no,
    appointmentId: prescription.appointment_id,
    patientId: prescription.patient_id,
    doctorId: prescription.doctor_id,
    doctorName: prescription.doctor_name,
    branchId: prescription.branch_id,
    prescriptionDate: prescription.prescription_date,
    status: prescription.status,
    chiefComplaint: prescription.chief_complaint,
    otherDetails: prescription.other_details,
    examination: prescription.examination,
    diagnosis: prescription.diagnosis,
    investigationNotes: prescription.investigation_notes,
    advancedXrayLab: prescription.advanced_xray_lab,
    otherInvestigation: prescription.other_investigation,
    homeRehab: prescription.home_rehab,
    homeRecoveryProgram: prescription.home_recovery_program,
    acceleratedRecoveryPackage: prescription.accelerated_recovery_package,
    frequency: prescription.frequency,
    duration: prescription.duration,
    remarks: prescription.remarks,
    patientFileNumber: prescription.patient_file_number,
    linkedPatientName: prescription.linked_patient_name,
    patientSnapshot: {
      patientName: snapshot.patient_name,
      age: snapshot.age,
      gender: snapshot.gender,
      address: snapshot.address,
      referredBy: snapshot.referred_by,
      visitDatetime: snapshot.visit_datetime,
    },
    investigations: investigations.map((row) => ({
      id: row.id,
      investigationId: row.investigation_id,
      name: row.name,
      categoryId: row.category_id,
      categoryName: row.category_name,
      sortOrder: row.sort_order,
    })),
    pathology: pathology.map((row) => ({
      id: row.id,
      pathologyId: row.pathology_id,
      name: row.name,
      sortOrder: row.sort_order,
    })),
    modalities: modalities.map((row) => ({
      id: row.id,
      modalityId: row.modality_id,
      name: row.name,
      category: row.category,
      charge: row.charge,
      sortOrder: row.sort_order,
    })),
    discounts: discounts.map((row) => ({
      id: row.id,
      noOfSessions: row.no_of_sessions,
      essentialCharge: row.essential_charge,
      advancedCharge: row.advanced_charge,
    })),
    createdBy: prescription.created_by,
    updatedBy: prescription.updated_by,
    createdAt: prescription.created_at,
    updatedAt: prescription.updated_at,
  };
};

const insertChildRecords = async (
  connection,
  prescriptionId,
  { patientSnapshot, investigations, pathology, modalities, discounts }
) => {
  await connection.query(
    `INSERT INTO prescription_patient_snapshot
     (prescription_id, patient_name, age, gender, address, referred_by, visit_datetime)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      prescriptionId,
      patientSnapshot.patientName,
      patientSnapshot.age,
      patientSnapshot.gender,
      patientSnapshot.address,
      patientSnapshot.referredBy,
      patientSnapshot.visitDatetime,
    ]
  );

  if (investigations.length > 0) {
    await connection.query(
      `INSERT INTO prescription_investigations
       (prescription_id, investigation_id, sort_order)
       VALUES ?`,
      [
        investigations.map((row) => [
          prescriptionId,
          row.investigationId,
          row.sortOrder,
        ]),
      ]
    );
  }

  if (pathology.length > 0) {
    await connection.query(
      `INSERT INTO prescription_pathology
       (prescription_id, pathology_id, sort_order)
       VALUES ?`,
      [pathology.map((row) => [prescriptionId, row.pathologyId, row.sortOrder])]
    );
  }

  if (modalities.length > 0) {
    await connection.query(
      `INSERT INTO prescription_modalities
       (prescription_id, modality_id, charge, sort_order)
       VALUES ?`,
      [
        modalities.map((row) => [
          prescriptionId,
          row.modalityId,
          row.charge ?? 0,
          row.sortOrder,
        ]),
      ]
    );
  }

  if (discounts.length > 0) {
    await connection.query(
      `INSERT INTO prescription_discounts
       (prescription_id, no_of_sessions, essential_charge, advanced_charge)
       VALUES ?`,
      [
        discounts.map((row) => [
          prescriptionId,
          row.noOfSessions,
          row.essentialCharge,
          row.advancedCharge,
        ]),
      ]
    );
  }
};

const replaceChildRecords = async (connection, prescriptionId, payload) => {
  await connection.query(
    "DELETE FROM prescription_patient_snapshot WHERE prescription_id = ?",
    [prescriptionId]
  );
  await connection.query(
    "DELETE FROM prescription_investigations WHERE prescription_id = ?",
    [prescriptionId]
  );
  await connection.query(
    "DELETE FROM prescription_pathology WHERE prescription_id = ?",
    [prescriptionId]
  );
  await connection.query(
    "DELETE FROM prescription_modalities WHERE prescription_id = ?",
    [prescriptionId]
  );
  await connection.query(
    "DELETE FROM prescription_discounts WHERE prescription_id = ?",
    [prescriptionId]
  );
  await insertChildRecords(connection, prescriptionId, payload);
};

const validatePrescriptionPayload = async (connection, branchId, header) => {
  if (!header.patientId) {
    return { status: 400, message: "patientId is required." };
  }
  if (!header.doctorId) {
    return { status: 400, message: "doctorId is required." };
  }

  const patient = await verifyPatientInBranch(connection, header.patientId, branchId);
  if (!patient) {
    return { status: 404, message: "Patient not found in your clinic." };
  }

  const doctor = await verifyDoctorInBranch(connection, header.doctorId, branchId);
  if (!doctor) {
    return { status: 404, message: "Doctor not found in your clinic." };
  }

  if (header.appointmentId) {
    const [appointment] = await connection.query(
      "SELECT id FROM appointments WHERE id = ? LIMIT 1",
      [header.appointmentId]
    );
    if (appointment.length === 0) {
      return { status: 404, message: "Appointment not found." };
    }
  }

  return null;
};

export const getPrescriptionPrefill = async (req, res) => {
  try {
    const branchId = getBranchId(req);
    const patientId = req.query.patientId ?? req.query.patient_id;
    const appointmentId = req.query.appointmentId ?? req.query.appointment_id;

    if (!patientId) {
      return res.status(400).json({ success: false, message: "patientId is required" });
    }

    const patient = await verifyPatientInBranch(db, patientId, branchId);
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found in your clinic." });
    }

    let visitDatetime = new Date().toISOString();
    if (appointmentId) {
      const [appointments] = await db.query(
        `SELECT appointment_date, appointment_time
         FROM appointments WHERE id = ? LIMIT 1`,
        [appointmentId]
      );
      if (appointments.length > 0) {
        const appt = appointments[0];
        visitDatetime = `${appt.appointment_date}T${appt.appointment_time}`;
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        patientId: Number(patientId),
        appointmentId: appointmentId ? Number(appointmentId) : null,
        patientSnapshot: {
          patientName: patient.full_name,
          age: patient.age,
          gender: normalizeGender(patient.gender),
          address: patient.address,
          referredBy: null,
          visitDatetime,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createPrescription = async (req, res) => {
  let connection;

  try {
    const branchId = getBranchId(req);
    const userId = req.user.id;
    
    const payload = normalizePrescriptionPayload(req.body);
    console.log("Request Body:", req.body);
    console.log("Prescription Date:", req.body.prescriptionDate);

    connection = await db.getConnection();
    await connection.beginTransaction();

    const validationError = await validatePrescriptionPayload(
      connection,
      branchId,
      payload.header
    );
    if (validationError) {
      await connection.rollback();
      return res.status(validationError.status).json({
        success: false,
        message: validationError.message,
      });
    }

    const prescriptionNo = await generatePrescriptionNo(
      connection,
      branchId,
      payload.header.prescriptionDate
    );

    console.log("Prescription Date:", payload.header.prescriptionDate);

    const [prescriptionResult] = await connection.query(
      `INSERT INTO prescriptions
       (
         prescription_no, appointment_id, patient_id, doctor_id, branch_id,
         prescription_date, chief_complaint, other_details, examination, diagnosis,
         investigation_notes, advanced_xray_lab, other_investigation, home_rehab,
         home_recovery_program, accelerated_recovery_package, frequency, duration,
         remarks, status, created_by, updated_by
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)`,
      [
        prescriptionNo,
        payload.header.appointmentId,
        payload.header.patientId,
        payload.header.doctorId,
        branchId,
        payload.header.prescriptionDate,
        payload.header.chiefComplaint,
        payload.header.otherDetails,
        payload.header.examination,
        payload.header.diagnosis,
        payload.header.investigationNotes,
        payload.header.advancedXrayLab,
        payload.header.otherInvestigation,
        payload.header.homeRehab,
        payload.header.homeRecoveryProgram,
        payload.header.acceleratedRecoveryPackage,
        payload.header.frequency,
        payload.header.duration,
        payload.header.remarks,
        userId,
        userId,
      ]
    );

    const prescriptionId = prescriptionResult.insertId;
    await insertChildRecords(connection, prescriptionId, payload);

    await connection.commit();

    const data = await fetchPrescriptionDetails(connection, prescriptionId, branchId);

    return res.status(201).json({
      success: true,
      message: "Prescription created successfully.",
      prescriptionId,
      data,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Create Prescription Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

export const getPrescriptions = async (req, res) => {
  try {
    const branchId = getBranchId(req);
    const {
      patientId,
      appointmentId,
      status,
      fromDate,
      toDate,
      page = 1,
      limit = 20,
    } = req.query;

    let sql = `
      SELECT
        p.id,
        p.prescription_no,
        p.appointment_id,
        p.patient_id,
        p.doctor_id,
        p.prescription_date,
        p.status,
        p.frequency,
        p.duration,
        p.created_at,
        d.doctor_name,
        COALESCE(snap.patient_name, pt.full_name) AS patient_name,
        pt.file_number AS patient_file_number
      FROM prescriptions p
      INNER JOIN patients pt ON pt.id = p.patient_id
      LEFT JOIN doctors d ON d.id = p.doctor_id
      LEFT JOIN prescription_patient_snapshot snap ON snap.prescription_id = p.id
      WHERE p.branch_id = ?
    `;
    const params = [branchId];

    if (patientId) {
      sql += " AND p.patient_id = ?";
      params.push(patientId);
    }
    if (appointmentId) {
      sql += " AND p.appointment_id = ?";
      params.push(appointmentId);
    }
    if (status) {
      sql += " AND p.status = ?";
      params.push(status.toUpperCase());
    }
    if (fromDate) {
      sql += " AND DATE(p.prescription_date) >= ?";
      params.push(fromDate);
    }
    if (toDate) {
      sql += " AND DATE(p.prescription_date) <= ?";
      params.push(toDate);
    }

    sql += " ORDER BY p.prescription_date DESC, p.id DESC";

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const offset = (pageNum - 1) * limitNum;
    sql += " LIMIT ? OFFSET ?";
    params.push(limitNum, offset);

    const [rows] = await db.query(sql, params);

    return res.status(200).json({
      success: true,
      count: rows.length,
      page: pageNum,
      limit: limitNum,
      data: rows.map((row) => ({
        id: row.id,
        prescriptionNo: row.prescription_no,
        appointmentId: row.appointment_id,
        patientId: row.patient_id,
        doctorId: row.doctor_id,
        doctorName: row.doctor_name,
        patientName: row.patient_name,
        patientFileNumber: row.patient_file_number,
        prescriptionDate: row.prescription_date,
        status: row.status,
        frequency: row.frequency,
        duration: row.duration,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getPrescriptionById = async (req, res) => {
  try {
    const branchId = getBranchId(req);
    const data = await fetchPrescriptionDetails(db, req.params.id, branchId);

    if (!data) {
      return res.status(404).json({ success: false, message: "Prescription not found" });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePrescription = async (req, res) => {
  let connection;

  try {
    const branchId = getBranchId(req);
    const userId = req.user.id;
    const { id } = req.params;

    connection = await db.getConnection();
    await connection.beginTransaction();

    const existing = await fetchPrescriptionDetails(connection, id, branchId);
    if (!existing) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Prescription not found" });
    }

    if (existing.status === "CANCELLED") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Cancelled prescriptions cannot be updated.",
      });
    }

    const payload = normalizePrescriptionPayload(req.body);
    payload.header.patientId = payload.header.patientId ?? existing.patientId;
    payload.header.doctorId = payload.header.doctorId ?? existing.doctorId;
    payload.header.appointmentId =
      payload.header.appointmentId !== undefined
        ? payload.header.appointmentId
        : existing.appointmentId;
    payload.header.prescriptionDate =
      payload.header.prescriptionDate ?? existing.prescriptionDate;

    const validationError = await validatePrescriptionPayload(
      connection,
      branchId,
      payload.header
    );
    if (validationError) {
      await connection.rollback();
      return res.status(validationError.status).json({
        success: false,
        message: validationError.message,
      });
    }

    await connection.query(
      `UPDATE prescriptions
       SET appointment_id = ?,
           doctor_id = ?,
           prescription_date = ?,
           chief_complaint = ?,
           other_details = ?,
           examination = ?,
           diagnosis = ?,
           investigation_notes = ?,
           advanced_xray_lab = ?,
           other_investigation = ?,
           home_rehab = ?,
           home_recovery_program = ?,
           accelerated_recovery_package = ?,
           frequency = ?,
           duration = ?,
           remarks = ?,
           updated_by = ?
       WHERE id = ? AND branch_id = ?`,
      [
        payload.header.appointmentId,
        payload.header.doctorId,
        payload.header.prescriptionDate,
        payload.header.chiefComplaint,
        payload.header.otherDetails,
        payload.header.examination,
        payload.header.diagnosis,
        payload.header.investigationNotes,
        payload.header.advancedXrayLab,
        payload.header.otherInvestigation,
        payload.header.homeRehab,
        payload.header.homeRecoveryProgram,
        payload.header.acceleratedRecoveryPackage,
        payload.header.frequency,
        payload.header.duration,
        payload.header.remarks,
        userId,
        id,
        branchId,
      ]
    );

    await replaceChildRecords(connection, id, payload);

    await connection.commit();

    const data = await fetchPrescriptionDetails(connection, id, branchId);

    return res.status(200).json({
      success: true,
      message: "Prescription updated successfully.",
      data,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

export const cancelPrescription = async (req, res) => {
  try {
    const branchId = getBranchId(req);
    const userId = req.user.id;
    const { id } = req.params;

    const [result] = await db.query(
      `UPDATE prescriptions
       SET status = 'CANCELLED', updated_by = ?
       WHERE id = ? AND branch_id = ? AND status = 'ACTIVE'`,
      [userId, id, branchId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Active prescription not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Prescription cancelled successfully.",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deletePrescription = async (req, res) => {
  try {
    const branchId = getBranchId(req);
    const { id } = req.params;

    const [result] = await db.query(
      "DELETE FROM prescriptions WHERE id = ? AND branch_id = ?",
      [id, branchId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Prescription not found" });
    }

    return res.status(200).json({ success: true, message: "Prescription deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Backward-compatible alias for old frontend route
export const getPrescriptionFormTemplate = getFormOptions;
