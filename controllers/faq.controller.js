import { db } from "../config/db.js";
import { getManagerBranchId } from "../utils/patient.helpers.js";


// ======================================================
// ADD FAQ
// ======================================================
export const addFaq = async (req, res) => {
    try {

        const {
            question,
            answer,
            isActive = true
        } = req.body;

        const managerId = req.user.id;

        const branchId =
            await getManagerBranchId(managerId);


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
        // Required fields
        // ------------------------------------------
        if (!question || !answer) {
            return res.status(400).json({
                success: false,
                message: "Question and answer are required."
            });
        }


        // ------------------------------------------
        // Check duplicate question
        // ------------------------------------------
        const [existing] = await db.query(
            `SELECT id
             FROM faqs
             WHERE branch_id = ?
             AND question = ?`,
            [
                branchId,
                question.trim()
            ]
        );


        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: "FAQ with this question already exists."
            });
        }


        // ------------------------------------------
        // Insert FAQ
        // ------------------------------------------
        const [result] = await db.query(
            `INSERT INTO faqs
            (
                branch_id,
                question,
                answer,
                is_active,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, NOW(), NOW())`,
            [
                branchId,
                question.trim(),
                answer.trim(),
                isActive ? 1 : 0
            ]
        );


        // ------------------------------------------
        // Get created FAQ
        // ------------------------------------------
        const [faq] = await db.query(
            `SELECT
                id,
                branch_id,
                question,
                answer,
                is_active,
                created_at,
                updated_at
             FROM faqs
             WHERE id = ?
             AND branch_id = ?`,
            [
                result.insertId,
                branchId
            ]
        );


        return res.status(201).json({
            success: true,
            message: "FAQ added successfully.",
            data: faq[0]
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
// GET ALL FAQS
// ======================================================
export const getFaqs = async (req, res) => {
    try {

        const managerId = req.user.id;

        const branchId =
            await getManagerBranchId(managerId);


        if (!branchId) {
            return res.status(400).json({
                success: false,
                message: "Branch not assigned."
            });
        }


        const [faqs] = await db.query(
            `SELECT
                id,
                branch_id,
                question,
                answer,
                is_active,
                created_at,
                updated_at
             FROM faqs
             WHERE branch_id = ?
             ORDER BY created_at DESC`,
            [
                branchId
            ]
        );


        return res.status(200).json({
            success: true,
            count: faqs.length,
            data: faqs
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
// GET FAQ BY ID
// ======================================================
export const getFaqById = async (req, res) => {
    try {

        const { id } = req.params;

        const managerId = req.user.id;

        const branchId =
            await getManagerBranchId(managerId);


        if (!branchId) {
            return res.status(400).json({
                success: false,
                message: "Branch not assigned."
            });
        }


        const [faq] = await db.query(
            `SELECT
                id,
                branch_id,
                question,
                answer,
                is_active,
                created_at,
                updated_at
             FROM faqs
             WHERE id = ?
             AND branch_id = ?`,
            [
                id,
                branchId
            ]
        );


        if (faq.length === 0) {
            return res.status(404).json({
                success: false,
                message: "FAQ not found."
            });
        }


        return res.status(200).json({
            success: true,
            data: faq[0]
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
// UPDATE FAQ
// ======================================================
export const updateFaq = async (req, res) => {
    try {

        const { id } = req.params;

        const {
            question,
            answer,
            isActive
        } = req.body;


        const managerId = req.user.id;

        const branchId =
            await getManagerBranchId(managerId);


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
        // Required fields
        // ------------------------------------------
        if (!question || !answer) {
            return res.status(400).json({
                success: false,
                message: "Question and answer are required."
            });
        }


        // ------------------------------------------
        // Check FAQ
        // ------------------------------------------
        const [faq] = await db.query(
            `SELECT id
             FROM faqs
             WHERE id = ?
             AND branch_id = ?`,
            [
                id,
                branchId
            ]
        );


        if (faq.length === 0) {
            return res.status(404).json({
                success: false,
                message: "FAQ not found."
            });
        }


        // ------------------------------------------
        // Check duplicate question
        // ------------------------------------------
        const [existing] = await db.query(
            `SELECT id
             FROM faqs
             WHERE branch_id = ?
             AND question = ?
             AND id <> ?`,
            [
                branchId,
                question.trim(),
                id
            ]
        );


        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: "FAQ with this question already exists."
            });
        }


        // ------------------------------------------
        // Update
        // ------------------------------------------
        await db.query(
            `UPDATE faqs
             SET
                question = ?,
                answer = ?,
                is_active = ?,
                updated_at = NOW()
             WHERE id = ?
             AND branch_id = ?`,
            [
                question.trim(),
                answer.trim(),
                isActive ? 1 : 0,
                id,
                branchId
            ]
        );


        // ------------------------------------------
        // Get updated FAQ
        // ------------------------------------------
        const [updatedFaq] = await db.query(
            `SELECT
                id,
                branch_id,
                question,
                answer,
                is_active,
                created_at,
                updated_at
             FROM faqs
             WHERE id = ?
             AND branch_id = ?`,
            [
                id,
                branchId
            ]
        );


        return res.status(200).json({
            success: true,
            message: "FAQ updated successfully.",
            data: updatedFaq[0]
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
// DELETE FAQ
// ======================================================
export const deleteFaq = async (req, res) => {
    try {

        const { id } = req.params;

        const managerId = req.user.id;

        const branchId =
            await getManagerBranchId(managerId);


        if (!branchId) {
            return res.status(400).json({
                success: false,
                message: "Branch not assigned."
            });
        }


        // ------------------------------------------
        // Check FAQ
        // ------------------------------------------
        const [faq] = await db.query(
            `SELECT id
             FROM faqs
             WHERE id = ?
             AND branch_id = ?`,
            [
                id,
                branchId
            ]
        );


        if (faq.length === 0) {
            return res.status(404).json({
                success: false,
                message: "FAQ not found."
            });
        }


        // ------------------------------------------
        // Delete
        // ------------------------------------------
        await db.query(
            `DELETE FROM faqs
             WHERE id = ?
             AND branch_id = ?`,
            [
                id,
                branchId
            ]
        );


        return res.status(200).json({
            success: true,
            message: "FAQ deleted successfully."
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
// SEARCH FAQ
// ======================================================
export const searchFaq = async (req, res) => {
    try {

        const {
            keyword = ""
        } = req.query;


        const managerId = req.user.id;

        const branchId =
            await getManagerBranchId(managerId);


        if (!branchId) {
            return res.status(400).json({
                success: false,
                message: "Branch not assigned."
            });
        }


        const search = `%${keyword}%`;


        const [faqs] = await db.query(
            `SELECT
                id,
                branch_id,
                question,
                answer,
                is_active,
                created_at,
                updated_at
             FROM faqs
             WHERE branch_id = ?
             AND (
                question LIKE ?
                OR answer LIKE ?
             )
             ORDER BY created_at DESC`,
            [
                branchId,
                search,
                search
            ]
        );


        return res.status(200).json({
            success: true,
            count: faqs.length,
            data: faqs
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};