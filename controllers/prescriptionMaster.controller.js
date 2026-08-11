import { db } from "../config/db.js";

const masterResponse = (rows) => ({
  success: true,
  count: rows.length,
  data: rows,
});

const DEFAULT_DISCOUNT_ROWS = [
  { noOfSessions: 5, essentialCharge: null, advancedCharge: null },
  { noOfSessions: 20, essentialCharge: null, advancedCharge: null },
];

const MODALITY_CATEGORY_KEYS = {
  STANDARD: "standardModalities",
  ADVANCED: "advancedModalities",
  THERAPEUTIC: "therapeuticServices",
  ADDON: "addOnServices",
};

// ─── Investigation Categories ─────────────────────────────────────────────────

export const getInvestigationCategories = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, name, created_at, updated_at
       FROM investigation_categories
       ORDER BY name ASC`
    );
    return res.status(200).json(masterResponse(rows));
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createInvestigationCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }

    const [existing] = await db.query(
      "SELECT id FROM investigation_categories WHERE LOWER(name) = LOWER(?) LIMIT 1",
      [name.trim()]
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: "Category already exists" });
    }

    const [result] = await db.query(
      "INSERT INTO investigation_categories (name) VALUES (?)",
      [name.trim()]
    );
    const [rows] = await db.query(
      "SELECT * FROM investigation_categories WHERE id = ?",
      [result.insertId]
    );
    return res.status(201).json({
      success: true,
      message: "Investigation category created",
      data: rows[0],
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateInvestigationCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const [result] = await db.query(
      "UPDATE investigation_categories SET name = COALESCE(?, name) WHERE id = ?",
      [name?.trim() || null, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }
    return res.status(200).json({ success: true, message: "Category updated" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteInvestigationCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const [linked] = await db.query(
      "SELECT id FROM investigations_master WHERE category_id = ? LIMIT 1",
      [id]
    );
    if (linked.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Cannot delete category with linked investigations",
      });
    }

    const [result] = await db.query(
      "DELETE FROM investigation_categories WHERE id = ?",
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }
    return res.status(200).json({ success: true, message: "Category deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Investigations Master ──────────────────────────────────────────────────

export const getInvestigations = async (req, res) => {
  try {
    const activeOnly = req.query.active !== "false";
    const { categoryId } = req.query;

    let sql = `
      SELECT im.id, im.category_id, ic.name AS category_name,
             im.name, im.is_active, im.created_at, im.updated_at
      FROM investigations_master im
      INNER JOIN investigation_categories ic ON ic.id = im.category_id
    `;
    const params = [];
    const conditions = [];

    if (activeOnly) conditions.push("im.is_active = 1");
    if (categoryId) {
      conditions.push("im.category_id = ?");
      params.push(categoryId);
    }
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(" AND ")}`;
    }
    sql += " ORDER BY ic.name ASC, im.name ASC";

    const [rows] = await db.query(sql, params);
    return res.status(200).json(masterResponse(rows));
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createInvestigation = async (req, res) => {
  try {
    const categoryId = req.body.categoryId ?? req.body.category_id;
    const { name } = req.body;

    if (!categoryId) {
      return res.status(400).json({ success: false, message: "categoryId is required" });
    }
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }

    const [category] = await db.query(
      "SELECT id FROM investigation_categories WHERE id = ? LIMIT 1",
      [categoryId]
    );
    if (category.length === 0) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    const [existing] = await db.query(
      `SELECT id FROM investigations_master
       WHERE category_id = ? AND LOWER(name) = LOWER(?) LIMIT 1`,
      [categoryId, name.trim()]
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: "Investigation already exists" });
    }

    const [result] = await db.query(
      "INSERT INTO investigations_master (category_id, name) VALUES (?, ?)",
      [categoryId, name.trim()]
    );
    const [rows] = await db.query(
      `SELECT im.*, ic.name AS category_name
       FROM investigations_master im
       INNER JOIN investigation_categories ic ON ic.id = im.category_id
       WHERE im.id = ?`,
      [result.insertId]
    );
    return res.status(201).json({
      success: true,
      message: "Investigation created",
      data: rows[0],
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateInvestigation = async (req, res) => {
  try {
    const { id } = req.params;
    const categoryId = req.body.categoryId ?? req.body.category_id ?? null;
    const { name, is_active } = req.body;
    const isActive = is_active ?? req.body.isActive ?? null;

    const [result] = await db.query(
      `UPDATE investigations_master
       SET category_id = COALESCE(?, category_id),
           name = COALESCE(?, name),
           is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [categoryId, name?.trim() || null, isActive, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Investigation not found" });
    }
    return res.status(200).json({ success: true, message: "Investigation updated" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteInvestigation = async (req, res) => {
  try {
    const [result] = await db.query(
      "DELETE FROM investigations_master WHERE id = ?",
      [req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Investigation not found" });
    }
    return res.status(200).json({ success: true, message: "Investigation deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Pathology Master ─────────────────────────────────────────────────────────

export const getPathologyTests = async (req, res) => {
  try {
    const activeOnly = req.query.active !== "false";
    const [rows] = await db.query(
      `SELECT id, name, is_active, created_at, updated_at
       FROM pathology_master
       ${activeOnly ? "WHERE is_active = 1" : ""}
       ORDER BY name ASC`
    );
    return res.status(200).json(masterResponse(rows));
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createPathologyTest = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }

    const [existing] = await db.query(
      "SELECT id FROM pathology_master WHERE LOWER(name) = LOWER(?) LIMIT 1",
      [name.trim()]
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: "Pathology test already exists" });
    }

    const [result] = await db.query(
      "INSERT INTO pathology_master (name) VALUES (?)",
      [name.trim()]
    );
    const [rows] = await db.query("SELECT * FROM pathology_master WHERE id = ?", [
      result.insertId,
    ]);
    return res.status(201).json({
      success: true,
      message: "Pathology test created",
      data: rows[0],
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePathologyTest = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, is_active } = req.body;
    const isActive = is_active ?? req.body.isActive ?? null;

    const [result] = await db.query(
      `UPDATE pathology_master
       SET name = COALESCE(?, name),
           is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [name?.trim() || null, isActive, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Pathology test not found" });
    }
    return res.status(200).json({ success: true, message: "Pathology test updated" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deletePathologyTest = async (req, res) => {
  try {
    const [result] = await db.query("DELETE FROM pathology_master WHERE id = ?", [
      req.params.id,
    ]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Pathology test not found" });
    }
    return res.status(200).json({ success: true, message: "Pathology test deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Treatment Modalities Master ──────────────────────────────────────────────

export const getTreatmentModalities = async (req, res) => {
  try {
    const activeOnly = req.query.active !== "false";
    const { category } = req.query;

    let sql = `SELECT id, category, name, is_active, created_at, updated_at
               FROM treatment_modalities_master`;
    const params = [];
    const conditions = [];

    if (activeOnly) conditions.push("is_active = 1");
    if (category) {
      conditions.push("category = ?");
      params.push(category.toUpperCase());
    }
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(" AND ")}`;
    }
    sql += " ORDER BY category ASC, name ASC";

    const [rows] = await db.query(sql, params);
    return res.status(200).json(masterResponse(rows));
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createTreatmentModality = async (req, res) => {
  try {
    const { name, category } = req.body;
    const validCategories = ["STANDARD","ADVANCED","THERAPEUTIC","ADDON"];

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }
    if (!validCategories.includes(category?.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: "Category must be STANDARD, ADVANCED, THERAPEUTIC, or ADDON",
      });
    }

    const cat = category.toUpperCase();
    const [existing] = await db.query(
      `SELECT id FROM treatment_modalities_master
       WHERE category = ? AND LOWER(name) = LOWER(?) LIMIT 1`,
      [cat, name.trim()]
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: "Treatment modality already exists" });
    }

    const [result] = await db.query(
      "INSERT INTO treatment_modalities_master (category, name) VALUES (?, ?)",
      [cat, name.trim()]
    );
    const [rows] = await db.query(
      "SELECT * FROM treatment_modalities_master WHERE id = ?",
      [result.insertId]
    );
    return res.status(201).json({
      success: true,
      message: "Treatment modality created",
      data: rows[0],
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTreatmentModality = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, is_active } = req.body;
    const isActive = is_active ?? req.body.isActive ?? null;

    const [result] = await db.query(
      `UPDATE treatment_modalities_master
       SET name = COALESCE(?, name),
           category = COALESCE(?, category),
           is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [name?.trim() || null, category?.toUpperCase() || null, isActive, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Treatment modality not found" });
    }
    return res.status(200).json({ success: true, message: "Treatment modality updated" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteTreatmentModality = async (req, res) => {
  try {
    const [result] = await db.query(
      "DELETE FROM treatment_modalities_master WHERE id = ?",
      [req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Treatment modality not found" });
    }
    return res.status(200).json({ success: true, message: "Treatment modality deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Combined Form Options ────────────────────────────────────────────────────

export const getFormOptions = async (req, res) => {
  try {
    const [categories] = await db.query(
      `SELECT id, name FROM investigation_categories ORDER BY name ASC`
    );

    const [investigations] = await db.query(
      `SELECT im.id, im.category_id, ic.name AS category_name, im.name
       FROM investigations_master im
       INNER JOIN investigation_categories ic ON ic.id = im.category_id
       WHERE im.is_active = 1
       ORDER BY ic.name ASC, im.name ASC`
    );

    const investigationsByCategory = categories.map((cat) => ({
      categoryId: cat.id,
      categoryName: cat.name,
      items: investigations
        .filter((row) => row.category_id === cat.id)
        .map((row) => ({ id: row.id, name: row.name })),
    }));

    const [pathology] = await db.query(
      `SELECT id, name FROM pathology_master WHERE is_active = 1 ORDER BY name ASC`
    );

    const [modalities] = await db.query(
      `SELECT id, category, name
       FROM treatment_modalities_master
       WHERE is_active = 1
       ORDER BY category ASC, name ASC`
    );

    const treatments = {
      standardModalities: [],
      advancedModalities: [],
      therapeuticServices: [],
      addOnServices: [],
    };

    for (const row of modalities) {
      const key = MODALITY_CATEGORY_KEYS[row.category];
      if (key) {
        treatments[key].push({
          id: row.id,
          name: row.name,
          category: row.category,
          charge: 0,
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        investigationCategories: investigationsByCategory,
        pathology: pathology.map((row) => ({ id: row.id, name: row.name })),
        treatments,
        defaultDiscounts: DEFAULT_DISCOUNT_ROWS,
        defaults: {
          frequency: "5-6 times/week",
          duration: "4 weeks",
          durationNote:
            "Treatment duration mentioned above is approximate & subject to change.",
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
