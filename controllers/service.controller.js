import { db } from "../config/db.js";

export const createService = async (req, res) => {
    try {

        const {
            cat_id,
            sub_cat_id,
            service_name,
            service_type,
            standard_price,
            advance_price,
            price_sub_cat_id
        } = req.body;

        const clinicId = req.user.branchId || req.user.branch_id;
        const addedBy = req.user.id;

        if (!cat_id) {
            return res.status(400).json({
                success: false,
                message: "Category is required"
            });
        }

        if (!sub_cat_id) {
            return res.status(400).json({
                success: false,
                message: "Sub category is required"
            });
        }

        if (!service_name?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Service name is required"
            });
        }

        if (!["M", "T"].includes(service_type)) {
            return res.status(400).json({
                success: false,
                message: "Service type must be M or T"
            });
        }

        const [existing] = await db.query(
            `SELECT id
             FROM services
             WHERE clinic_id = ?
             AND sub_cat_id = ?
             AND LOWER(service_name) = LOWER(?)
             LIMIT 1`,
            [
                clinicId,
                sub_cat_id,
                service_name.trim()
            ]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Service already exists"
            });
        }

        const [result] = await db.query(
            `INSERT INTO services
            (
                cat_id,
                sub_cat_id,
                service_name,
                service_type,
                standard_price,
                advance_price,
                price_sub_cat_id,
                clinic_id,
                added_by
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                cat_id,
                sub_cat_id,
                service_name.trim(),
                service_type,
                Number(standard_price || 0),
                Number(advance_price || 0),
                price_sub_cat_id || null,
                clinicId,
                addedBy
            ]
        );

        const [rows] = await db.query(
            `SELECT *
             FROM services
             WHERE id = ?`,
            [result.insertId]
        );

        return res.status(201).json({
            success: true,
            message: "Service created successfully",
            data: rows[0]
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

export const getServices = async (req, res) => {
    try {

        const clinicId = req.user.branchId || req.user.branch_id;

        const [rows] = await db.query(
            `SELECT
                s.*,
                sc.cat_name,
                ssc.sub_category_name

            FROM services s

            INNER JOIN service_categories sc
                ON s.cat_id = sc.id

            INNER JOIN service_sub_categories ssc
                ON s.sub_cat_id = ssc.id

            WHERE s.clinic_id = ?

            ORDER BY s.id DESC`,
            [clinicId]
        );

        return res.status(200).json({
            success: true,
            count: rows.length,
            data: rows
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

export const getServiceById = async (req, res) => {
    try {

        const { id } = req.params;

       const clinicId = req.user.branchId || req.user.branch_id;

        const [rows] = await db.query(
            `SELECT
                s.*,
                sc.cat_name,
                ssc.sub_category_name

            FROM services s

            INNER JOIN service_categories sc
                ON s.cat_id = sc.id

            INNER JOIN service_sub_categories ssc
                ON s.sub_cat_id = ssc.id

            WHERE s.id = ?
            AND s.clinic_id = ?`,
            [id, clinicId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Service not found"
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

export const updateService = async (req, res) => {
    try {

        const { id } = req.params;

        const {
            cat_id,
            sub_cat_id,
            service_name,
            service_type,
            standard_price,
            advance_price,
            price_sub_cat_id
        } = req.body;

        const clinicId = req.user.branchId || req.user.branch_id;

        const [result] = await db.query(
            `UPDATE services
             SET
                cat_id = ?,
                sub_cat_id = ?,
                service_name = ?,
                service_type = ?,
                standard_price = ?,
                advance_price = ?,
                price_sub_cat_id = ?
             WHERE id = ?
             AND clinic_id = ?`,
            [
                cat_id,
                sub_cat_id,
                service_name.trim(),
                service_type,
                Number(standard_price),
                Number(advance_price),
                price_sub_cat_id || null,
                id,
                clinicId
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Service not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Service updated successfully"
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

export const changeServiceStatus = async (req, res) => {
    try {

        const { id } = req.params;
        const { is_active } = req.body;

        const clinicId = req.user.branchId || req.user.branch_id;

        const [result] = await db.query(
            `UPDATE services
             SET is_active = ?
             WHERE id = ?
             AND clinic_id = ?`,
            [is_active, id, clinicId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Service not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Service status updated successfully"
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

export const deleteService = async (req, res) => {
    try {

        const { id } = req.params;
       const clinicId = req.user.branchId || req.user.branch_id;

        const [result] = await db.query(
            `DELETE FROM services
             WHERE id = ?
             AND clinic_id = ?`,
            [id, clinicId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Service not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Service deleted successfully"
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};