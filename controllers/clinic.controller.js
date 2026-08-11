import bcrypt from "bcryptjs";
import { db } from "../config/db.js";
import { generateClinicCode } from "../utils/clinic.helpers.js";
import { uploadToCloudinary } from "../utils/cloudinaryUpload.js";

const SALT_ROUNDS = 10;

const normalize = (value) => (value ? String(value).trim() : null);
const digitsOnly = (value) => String(value || "").replace(/\D/g, "");



export const createClinic = async (req, res) => {
    let connection;
    try {
        const files = req.files || {};

        // console.log("req.files =", req.files);

        // const getUploadedPath = (key) => {
        //     const file = files[key]?.[0];
        //     return file?.path ? file.path.replace(/\\/g, "/") : null;
        // };

        const logoUpload = files.logoFile?.[0]
  ? await uploadToCloudinary(
      files.logoFile[0],
      "clinics/logo"
    )
  : null;

const headerUpload = files.headerFile?.[0]
  ? await uploadToCloudinary(
      files.headerFile[0],
      "clinics/header"
    )
  : null;

const footerUpload = files.footerFile?.[0]
  ? await uploadToCloudinary(
      files.footerFile[0],
      "clinics/footer"
    )
  : null;

const idCardUpload = files.idCardFile?.[0]
  ? await uploadToCloudinary(
      files.idCardFile[0],
      "clinics/id-card"
    )
  : null;

        const {
            clinicName,
            clinicAddress,
            phoneNo,
            email,
            doctorName,
            doctorDegree,
            registrationNo,
             regCouncilName,
            gstin,
            password
        } = req.body;

        // console.log("request body", req.body)

        const createdByAdminId = req.user?.id ?? null;

        const clinicNameValue =  normalize(clinicName);
        // const clinicEmail = normalize(email)?.toLowerCase() || null;
        //const phoneNo = normalize(phoneNo);   // Only using phone now

        if (!clinicNameValue) {
            return res.status(400).json({
                success: false,
                message: "Clinic name is required"
            });
        }

        if (!email && !phoneNo) {
    return res.status(400).json({
        success: false,
        message: "Email or contact number is required for login"
    });
}

        if (!password) {
    return res.status(400).json({
        success: false,
        message: "Password is required"
    });
}

if (password.length < 6) {
    return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long"
    });
}

        const clinicCode = await generateClinicCode();
        

        const hashedPassword = await bcrypt.hash(
    password,
    SALT_ROUNDS
);
        const clinicEmail = normalize(email)?.toLowerCase() || null;

        const loginEmail = clinicEmail || `${phoneNo}@clinic.local`;

        connection = await db.getConnection();
        await connection.beginTransaction();

        const [existingUser] = await connection.query(
            "SELECT id FROM users WHERE email = ? OR (mobile IS NOT NULL AND mobile = ?) LIMIT 1",
            [loginEmail, phoneNo || null]
        );

        if (existingUser[0]) {
            await connection.rollback();
            return res.status(409).json({
                success: false,
                message: "Clinic login email or mobile already exists"
            });
        }

        const [result] = await connection.query(
            `INSERT INTO branches (
                clinic_code,
                name,
                address,
                phone,
                email,
                doctor_name,
                doctor_degree,
                
                state_council_registration_no,
                registration_council_name,
                gstin,
                logo_file,
                letterhead_header_file,
                letterhead_footer_file,
                id_card_background_file,
                approval_status,
                created_by_admin_id
             )
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?, ?, ?, 'APPROVED', ?)`,
            [
                clinicCode,
                clinicNameValue,
                normalize(clinicAddress),
                normalize(phoneNo),
                clinicEmail,
                normalize(doctorName),
                normalize(doctorDegree),
                 normalize(registrationNo),
                 normalize(regCouncilName),
                normalize(gstin),
                // getUploadedPath("logoFile") || getUploadedPath("logo"),
                // getUploadedPath("headerFile") || getUploadedPath("header"),
                // getUploadedPath("footerFile") || getUploadedPath("footer"),
                // getUploadedPath("idCardFile") || getUploadedPath("idCard"),
                logoUpload?.secure_url || null,
                headerUpload?.secure_url || null,
                footerUpload?.secure_url || null,
                idCardUpload?.secure_url || null,
                createdByAdminId
            ]
        );

        const branchId = result.insertId;

        const [userResult] = await connection.query(
            `INSERT INTO users (name, email, mobile, password, role, branch_id, email_verified)
             VALUES (?, ?, ?, ?, 'CLINIC', ?, 1)`,
            [clinicNameValue, loginEmail, phoneNo || null, hashedPassword, branchId]
        );

        const [rows] = await connection.query(
            `SELECT * FROM branches WHERE id = ?`,
            [branchId]
        );

        await connection.commit();

        return res.status(201).json({
            success: true,
            message: "Clinic created successfully with login credentials",
            data: {
                clinic: rows[0],
                login: {
                    id: userResult.insertId,
                    email: loginEmail,
                    mobile: phoneNo || null,
                    role: "CLINIC"
                }
            }
        });
    } catch (error) {
        if (connection) await connection.rollback();

        console.error("Create Clinic Error:", error);

        if (error.message?.includes("Only PNG") || error.message?.includes("Only PNG, JPG, or PDF")) {
            return res.status(400).json({
                success: false,
                message: "Only PNG, JPG, or PDF files are allowed for clinic uploads"
            });
        }

        return res.status(500).json({
            success: false,
            message: error.message
        });
    } finally {
        if (connection) connection.release();
    }
};



export const listClinics = async (req, res) => {
    try {
        const activeOnly = req.query.active !== "false";

        const [rows] = await db.query(
            `SELECT id, clinic_code, name, address, phone, email, doctor_name,
                state_council_registration_no, gstin, logo_file,
                letterhead_header_file, letterhead_footer_file, 
                id_card_background_file, approval_status, created_by_admin_id, is_active, created_at, updated_at
             FROM branches
             ${activeOnly ? "WHERE is_active = 1" : ""}
             ORDER BY created_at DESC`
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

export const getClinicById = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await db.query(
            `SELECT id, clinic_code, name, address, phone, email, doctor_name,
                state_council_registration_no, gstin, logo_file,
                letterhead_header_file, letterhead_footer_file, 
                id_card_background_file,
                     approval_status, created_by_admin_id, is_active, created_at, updated_at
             FROM branches WHERE id = ? LIMIT 1`,
            [id]
        );

        if (!rows[0]) {
            return res.status(404).json({
                success: false,
                message: "Clinic not found"
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

export const updateClinic = async (req, res) => {
  try {
    const { id } = req.params;
    const files = req.files || {};
    const { clinicName, clinicAddress, phoneNo, is_active } = req.body;


    const [existingRows] = await db.query(
      `SELECT * FROM branches WHERE id = ?`,
      [id]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Clinic not found",
      });
    }

    const existingBranch = existingRows[0];

    // Upload new files only if provided
    const logoUpload = files.logoFile?.[0]
      ? await uploadToCloudinary(
          files.logoFile[0],
          "clinics/logo"
        )
      : null;

    const headerUpload = files.headerFile?.[0]
      ? await uploadToCloudinary(
          files.headerFile[0],
          "clinics/header"
        )
      : null;

    const footerUpload = files.footerFile?.[0]
      ? await uploadToCloudinary(
          files.footerFile[0],
          "clinics/footer"
        )
      : null;

    const idCardUpload = files.idCardFile?.[0]
      ? await uploadToCloudinary(
          files.idCardFile[0],
          "clinics/id-card"
        )
      : null;


    await db.query(
      `UPDATE branches
       SET
        name = ?,
        address = ?,
        phone = ?,
        is_active = ?,
        logo_file = ?,
        letterhead_header_file = ?,
        letterhead_footer_file = ?,
        id_card_background_file = ?
       WHERE id = ?`,
      [
        clinicName?.trim() || existingBranch.name,
        clinicAddress?.trim() || existingBranch.address,
        phoneNo?.trim() || existingBranch.phone,
        is_active ?? existingBranch.is_active,
        logoUpload?.secure_url ||
          existingBranch.logo_file,

        headerUpload?.secure_url ||
          existingBranch.letterhead_header_file,

        footerUpload?.secure_url ||
          existingBranch.letterhead_footer_file,

        idCardUpload?.secure_url ||
          existingBranch.id_card_background_file,
        id,
      ]
    );

    const [updatedRows] = await db.query(
      `SELECT 
        id,
        name,
        address,
        phone,
        logo_file,
        letterhead_header_file,
        letterhead_footer_file,
        id_card_background_file,
        created_by_admin_id,
        is_active,
        created_at,
        updated_at
       FROM branches
       WHERE id = ?`,
      [id]
    );

    return res.status(200).json({
      success: true,
      message: "Clinic updated successfully",
      data: updatedRows[0],
    });
  } catch (error) {
    console.error("Update Branch Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


// DELETE BRANCH
export const deleteClinic = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      `SELECT id FROM branches WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Clinic not found",
      });
    }

    await db.query(`DELETE FROM branches WHERE id = ?`, [id]);

    return res.status(200).json({
      success: true,
      message: "Clinic deleted successfully",
    });
  } catch (error) {
    console.error("Delete Branch Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const listMyCreatedClinics = async (req, res) => {
    try {
        const activeOnly = req.query.active !== "false";
        const adminId = req.user?.id;

        const [rows] = await db.query(
            `SELECT id, clinic_code, name, address, phone, email, doctor_name,
                state_council_registration_no, gstin, logo_file,
                letterhead_header_file, letterhead_footer_file, 
                id_card_background_file,
                     approval_status, created_by_admin_id, is_active, created_at, updated_at
             FROM branches
             WHERE created_by_admin_id = ?
             ${activeOnly ? "AND is_active = 1" : ""}
             ORDER BY created_at DESC`,
            [adminId]
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

