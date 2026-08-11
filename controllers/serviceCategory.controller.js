import { db } from "../config/db.js";

export const createServiceCategory = async (req, res) => {
    try {
        const { cat_name, category_fee } = req.body;

        const addedBy = req.user.id;
        const clinicId = req.user.branchId || req.user.branch_id;

        if (!cat_name?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Category name is required"
            });
        }

        if (
            category_fee !== undefined &&
            (isNaN(category_fee) || Number(category_fee) < 0)
        ) {
            return res.status(400).json({
                success: false,
                message: "Category fee must be greater than or equal to 0"
            });
        }

        const [existing] = await db.query(
            `SELECT id
             FROM service_categories
             WHERE clinic_id = ?
             AND LOWER(cat_name) = LOWER(?)
             LIMIT 1`,
            [
                clinicId,
                cat_name.trim()
            ]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Category already exists"
            });
        }

        const [result] = await db.query(
            `INSERT INTO service_categories
            (
                cat_name,
                category_fee,
                added_by,
                clinic_id
            )
            VALUES (?, ?, ?, ?)`,
            [
                cat_name.trim(),
                Number(category_fee || 0),
                addedBy,
                clinicId
            ]
        );

        const [rows] = await db.query(
            `SELECT *
             FROM service_categories
             WHERE id = ?`,
            [result.insertId]
        );

        return res.status(201).json({
            success: true,
            message: "Service category created successfully",
            data: rows[0]
        });

    } catch (error) {

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "Category already exists"
            });
        }

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const getServiceCategories = async (req, res) => {
    try {

        const clinicId = req.user.branchId || req.user.branch_id;

        const [rows] = await db.query(
            `SELECT
                sc.id,
                sc.cat_name,
                sc.category_fee,
                sc.is_active,
                sc.created_date,
                u.name AS added_by_name
            FROM service_categories sc
            LEFT JOIN users u
                ON sc.added_by = u.id
            WHERE sc.clinic_id = ?
            ORDER BY sc.id DESC`,
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

export const getServiceCategoryById = async (req, res) => {
    try {

        const { id } = req.params;
        const clinicId = req.user.branchId || req.user.branch_id;

        if (!id || isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: "Valid category id is required"
            });
        }

        const [rows] = await db.query(
            `SELECT
                sc.id,
                sc.cat_name,
                sc.category_fee,
                sc.is_active,
                sc.created_date,
                sc.updated_date,
                sc.clinic_id,
                sc.added_by,
                u.name AS added_by_name
            FROM service_categories sc
            LEFT JOIN users u
                ON sc.added_by = u.id
            WHERE sc.id = ?
            AND sc.clinic_id = ?
            LIMIT 1`,
            [id, clinicId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Service category not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: rows[0]
        });

    } catch (error) {

        console.error("Get Service Category By Id Error:", error);

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

export const updateServiceCategory = async (req, res) => {
    try {

        const { id } = req.params;
        const { cat_name, category_fee } = req.body;

        const clinicId = req.user.branchId || req.user.branch_id;

        const [result] = await db.query(
            `UPDATE service_categories
             SET
                cat_name = ?,
                category_fee = ?
             WHERE id = ?
             AND clinic_id = ?`,
            [
                cat_name.trim(),
                Number(category_fee),
                id,
                clinicId
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Category not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Category updated successfully"
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const changeCategoryStatus = async (req, res) => {
    try {

        const { id } = req.params;
        const { is_active } = req.body;

        const clinicId = req.user.branchId || req.user.branch_id;

        const [result] = await db.query(
            `UPDATE service_categories
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
                message: "Category not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Category status updated successfully"
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const deleteServiceCategory = async (req, res) => {
    try {

        const { id } = req.params;
        const clinicId = req.user.branchId || req.user.branch_id;

        const [existing] = await db.query(
            `SELECT id
             FROM service_categories
             WHERE id = ?
             AND clinic_id = ?`,
            [id, clinicId]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Category not found"
            });
        }

        const [result] = await db.query(
            `DELETE FROM service_categories
             WHERE id = ?
             AND clinic_id = ?`,
            [id, clinicId]
        );

        return res.status(200).json({
            success: true,
            message: "Category deleted successfully"
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};