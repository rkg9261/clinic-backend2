import { db } from "../config/db.js";
import { getManagerBranchId } from "../utils/patient.helpers.js";


// ======================================================
// ADD BLOG
// ======================================================
export const addBlog = async (req, res) => {
    try {

        const {
            title,
            slug,
            shortDescription,
            content,
            featuredImage,
            isActive = true,
            publishedAt
        } = req.body;

        const managerId = req.user.id;
        const branchId = await getManagerBranchId(managerId);

        if (!branchId) {
            return res.status(400).json({
                success: false,
                message: "Branch not assigned."
            });
        }

        if (!title || !content) {
            return res.status(400).json({
                success: false,
                message: "Title and content are required."
            });
        }

        // Generate slug if not provided
        const blogSlug = slug
            ? slug.trim().toLowerCase()
            : title
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "");

        // Check duplicate slug
        const [exist] = await db.query(
            `SELECT id
             FROM blogs
             WHERE branch_id = ?
             AND slug = ?`,
            [branchId, blogSlug]
        );

        if (exist.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Blog with this slug already exists."
            });
        }

        const [result] = await db.query(
            `INSERT INTO blogs
            (
                branch_id,
                title,
                slug,
                short_description,
                content,
                featured_image,
                is_active,
                published_at,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                branchId,
                title.trim(),
                blogSlug,
                shortDescription?.trim() || null,
                content.trim(),
                featuredImage || null,
                isActive ? 1 : 0,
                publishedAt || null
            ]
        );

        const [blog] = await db.query(
            `SELECT
                id,
                branch_id,
                title,
                slug,
                short_description,
                content,
                featured_image,
                is_active,
                published_at,
                created_at,
                updated_at
             FROM blogs
             WHERE id = ?
             AND branch_id = ?`,
            [result.insertId, branchId]
        );

        return res.status(201).json({
            success: true,
            message: "Blog added successfully.",
            data: blog[0]
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
// GET ALL BLOGS
// ======================================================
export const getBlogs = async (req, res) => {
    try {

        const managerId = req.user.id;
        const branchId = await getManagerBranchId(managerId);

        if (!branchId) {
            return res.status(400).json({
                success: false,
                message: "Branch not assigned."
            });
        }

        const [blogs] = await db.query(
            `SELECT
                id,
                branch_id,
                title,
                slug,
                short_description,
                content,
                featured_image,
                is_active,
                published_at,
                created_at,
                updated_at
             FROM blogs
             WHERE branch_id = ?
             ORDER BY created_at DESC`,
            [branchId]
        );

        return res.status(200).json({
            success: true,
            count: blogs.length,
            data: blogs
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
// GET BLOG BY ID
// ======================================================
export const getBlogById = async (req, res) => {
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

        const [blog] = await db.query(
            `SELECT
                id,
                branch_id,
                title,
                slug,
                short_description,
                content,
                featured_image,
                is_active,
                published_at,
                created_at,
                updated_at
             FROM blogs
             WHERE id = ?
             AND branch_id = ?`,
            [id, branchId]
        );

        if (blog.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Blog not found."
            });
        }

        return res.status(200).json({
            success: true,
            data: blog[0]
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
// UPDATE BLOG
// ======================================================
export const updateBlog = async (req, res) => {
    try {

        const { id } = req.params;

        const {
            title,
            slug,
            shortDescription,
            content,
            featuredImage,
            isActive,
            publishedAt
        } = req.body;

        const managerId = req.user.id;
        const branchId = await getManagerBranchId(managerId);

        if (!branchId) {
            return res.status(400).json({
                success: false,
                message: "Branch not assigned."
            });
        }

        if (!title || !content) {
            return res.status(400).json({
                success: false,
                message: "Title and content are required."
            });
        }

        // Check blog
        const [blog] = await db.query(
            `SELECT id
             FROM blogs
             WHERE id = ?
             AND branch_id = ?`,
            [id, branchId]
        );

        if (blog.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Blog not found."
            });
        }

        const blogSlug = slug
            ? slug.trim().toLowerCase()
            : title
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "");

        // Check duplicate slug
        const [exist] = await db.query(
            `SELECT id
             FROM blogs
             WHERE branch_id = ?
             AND slug = ?
             AND id <> ?`,
            [branchId, blogSlug, id]
        );

        if (exist.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Blog with this slug already exists."
            });
        }

        await db.query(
            `UPDATE blogs
             SET
                title = ?,
                slug = ?,
                short_description = ?,
                content = ?,
                featured_image = ?,
                is_active = ?,
                published_at = ?,
                updated_at = NOW()
             WHERE id = ?
             AND branch_id = ?`,
            [
                title.trim(),
                blogSlug,
                shortDescription?.trim() || null,
                content.trim(),
                featuredImage || null,
                isActive ? 1 : 0,
                publishedAt || null,
                id,
                branchId
            ]
        );

        const [updatedBlog] = await db.query(
            `SELECT
                id,
                branch_id,
                title,
                slug,
                short_description,
                content,
                featured_image,
                is_active,
                published_at,
                created_at,
                updated_at
             FROM blogs
             WHERE id = ?
             AND branch_id = ?`,
            [id, branchId]
        );

        return res.status(200).json({
            success: true,
            message: "Blog updated successfully.",
            data: updatedBlog[0]
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
// DELETE BLOG
// ======================================================
export const deleteBlog = async (req, res) => {
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

        const [blog] = await db.query(
            `SELECT id
             FROM blogs
             WHERE id = ?
             AND branch_id = ?`,
            [id, branchId]
        );

        if (blog.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Blog not found."
            });
        }

        await db.query(
            `DELETE FROM blogs
             WHERE id = ?
             AND branch_id = ?`,
            [id, branchId]
        );

        return res.status(200).json({
            success: true,
            message: "Blog deleted successfully."
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
// SEARCH BLOG
// ======================================================
export const searchBlog = async (req, res) => {
    try {

        const {
            keyword = ""
        } = req.query;

        const managerId = req.user.id;
        const branchId = await getManagerBranchId(managerId);

        if (!branchId) {
            return res.status(400).json({
                success: false,
                message: "Branch not assigned."
            });
        }

        const search = `%${keyword}%`;

        const [blogs] = await db.query(
            `SELECT
                id,
                branch_id,
                title,
                slug,
                short_description,
                content,
                featured_image,
                is_active,
                published_at,
                created_at,
                updated_at
             FROM blogs
             WHERE branch_id = ?
             AND (
                title LIKE ?
                OR short_description LIKE ?
                OR content LIKE ?
             )
             ORDER BY created_at DESC`,
            [
                branchId,
                search,
                search,
                search
            ]
        );

        return res.status(200).json({
            success: true,
            count: blogs.length,
            data: blogs
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};