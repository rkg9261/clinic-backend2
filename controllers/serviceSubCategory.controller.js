import { db } from "../config/db.js";

export const createServiceSubCategory = async (req, res) => {
    try {

        const {
            category_id,
            sub_category_name,
            sub_category_fee
        } = req.body;

        const addedBy = req.user.id;
        const clinicId = req.user.branchId || req.user.branch_id;

        if (!category_id) {
            return res.status(400).json({
                success: false,
                message: "Category is required"
            });
        }

        if (!sub_category_name?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Sub category name is required"
            });
        }

        const [category] = await db.query(
            `SELECT id
             FROM service_categories
             WHERE id = ?
             AND clinic_id = ?
             LIMIT 1`,
            [category_id, clinicId]
        );

        if (category.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Category not found"
            });
        }

        const [existing] = await db.query(
            `SELECT id
             FROM service_sub_categories
             WHERE clinic_id = ?
             AND category_id = ?
             AND LOWER(sub_category_name) = LOWER(?)
             LIMIT 1`,
            [
                clinicId,
                category_id,
                sub_category_name.trim()
            ]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Sub category already exists"
            });
        }

        const [result] = await db.query(
            `INSERT INTO service_sub_categories
            (
                category_id,
                sub_category_name,
                sub_category_fee,
                added_by,
                clinic_id
            )
            VALUES (?, ?, ?, ?, ?)`,
            [
                category_id,
                sub_category_name.trim(),
                Number(sub_category_fee || 0),
                addedBy,
                clinicId
            ]
        );

        const [rows] = await db.query(
            `SELECT *
             FROM service_sub_categories
             WHERE id = ?`,
            [result.insertId]
        );

        return res.status(201).json({
            success: true,
            message: "Sub category created successfully",
            data: rows[0]
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

export const getServiceSubCategories = async (req, res) => {
    try {

        const clinicId = req.user.branchId || req.user.branch_id;

        const [rows] = await db.query(
            `SELECT
                ssc.id,
                ssc.sub_category_name,
                ssc.sub_category_fee,
                ssc.is_active,
                ssc.created_date,

                sc.id AS category_id,
                sc.cat_name AS category_name

            FROM service_sub_categories ssc

            INNER JOIN service_categories sc
                ON ssc.category_id = sc.id

            WHERE ssc.clinic_id = ?

            ORDER BY ssc.id DESC`,
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

export const getServiceSubCategoryById = async (req, res) => {
    try {

        const { id } = req.params;
        const clinicId = req.user.branchId || req.user.branch_id;

        const [rows] = await db.query(
            `SELECT
                ssc.*,
                sc.cat_name AS category_name

            FROM service_sub_categories ssc

            INNER JOIN service_categories sc
                ON ssc.category_id = sc.id

            WHERE ssc.id = ?
            AND ssc.clinic_id = ?`,
            [id, clinicId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Sub category not found"
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

export const updateServiceSubCategory = async (req, res) => {
    try {

        const { id } = req.params;

        const {
            category_id,
            sub_category_name,
            sub_category_fee
        } = req.body;

        const clinicId = req.user.branchId || req.user.branch_id;

        const [result] = await db.query(
            `UPDATE service_sub_categories
             SET
                category_id = ?,
                sub_category_name = ?,
                sub_category_fee = ?
             WHERE id = ?
             AND clinic_id = ?`,
            [
                category_id,
                sub_category_name.trim(),
                Number(sub_category_fee),
                id,
                clinicId
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Sub category not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Sub category updated successfully"
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

export const changeSubCategoryStatus = async (req, res) => {
    try {

        const { id } = req.params;
        const { is_active } = req.body;

        const clinicId = req.user.branchId || req.user.branch_id;

        const [result] = await db.query(
            `UPDATE service_sub_categories
             SET is_active = ?
             WHERE id = ?
             AND clinic_id = ?`,
            [
                is_active,
                id,
                clinicId
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Sub category not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Status updated successfully"
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

export const deleteServiceSubCategory = async (req, res) => {
    try {

        const { id } = req.params;
        const clinicId = req.user.branchId || req.user.branch_id;

        const [result] = await db.query(
            `DELETE FROM service_sub_categories
             WHERE id = ?
             AND clinic_id = ?`,
            [id, clinicId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Sub category not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Sub category deleted successfully"
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};