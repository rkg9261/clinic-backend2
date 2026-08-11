import db from "../config/db.js";

const getBranchId = (req) => req.user.branchId || req.user.branch_id;

const fetchTemplateSettingDetails = async (
  connection,
  templateId,
  branchId
) => {
  // Fetch Parent
  const [templates] = await connection.query(
    `
    SELECT
        ts.id,
        ts.branch_id,
        ts.name,
        ts.description,
        ts.is_active,
        ts.created_by,
        ts.updated_by,
        ts.created_at,
        ts.updated_at
    FROM template_settings ts
    WHERE ts.id = ?
      AND ts.branch_id = ?
    LIMIT 1
    `,
    [templateId, branchId]
  );

  if (templates.length === 0) {
    return null;
  }

  const template = templates[0];

  // Fetch Child Items
  const [items] = await connection.query(
    `
    SELECT
        id,
        template_id,
        title,
        description,
        sort_order,
        created_at,
        updated_at
    FROM template_setting_items
    WHERE template_id = ?
    ORDER BY sort_order ASC, id ASC
    `,
    [templateId]
  );

  template.items = items;

  return template;
};


const replaceTemplateSettingItems = async (
  connection,
  templateId,
  items = []
) => {
  // Delete existing child records
  await connection.query(
    `
    DELETE FROM template_setting_items
    WHERE template_id = ?
    `,
    [templateId]
  );

  // Nothing to insert
  if (!items.length) {
    return;
  }

  // Prepare bulk insert values
  const values = items.map((item, index) => [
    templateId,
    item.title?.trim(),
    item.description?.trim() || null,
    Number(item.sortOrder ?? index + 1),
  ]);

  // Bulk insert
  await connection.query(
    `
    INSERT INTO template_setting_items
    (
        template_id,
        title,
        description,
        sort_order
    )
    VALUES ?
    `,
    [values]
  );
};

export const createTemplateSetting = async (req, res) => {
  let connection;

  try {
    const branchId = getBranchId(req);
    const userId = req.user.id;

    const {
      name,
      description = null,
      isActive = 1,
      items = [],
    } = req.body;

    // Validation
    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Template name is required.",
      });
    }

    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: "Items must be an array.",
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    // Check duplicate template name within the branch
    const [existing] = await connection.query(
      `
      SELECT id
      FROM template_settings
      WHERE LOWER(name) = LOWER(?)
        AND branch_id = ?
      LIMIT 1
      `,
      [name.trim(), branchId]
    );

    if (existing.length > 0) {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message: "Template setting already exists.",
      });
    }

    // Create parent record
    const [result] = await connection.query(
      `
      INSERT INTO template_settings
      (
        branch_id,
        name,
        description,
        is_active,
        created_by,
        updated_by
      )
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        branchId,
        name.trim(),
        description,
        Number(isActive),
        userId,
        userId,
      ]
    );

    const templateId = result.insertId;

    // Save child items
    await replaceTemplateSettingItems(
      connection,
      templateId,
      items
    );

    await connection.commit();

    // Return complete object
    const data = await fetchTemplateSettingDetails(
      connection,
      templateId,
      branchId
    );

    return res.status(201).json({
      success: true,
      message: "Template setting created successfully.",
      data,
    });

  } catch (error) {

    if (connection) {
      await connection.rollback();
    }

    console.error("Create Template Setting Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });

  } finally {

    if (connection) {
      connection.release();
    }

  }
};

export const getTemplateSettingById = async (req, res) => {
  try {
    const branchId = getBranchId(req);
    const { id } = req.params;

    const data = await fetchTemplateSettingDetails(
      db,
      id,
      branchId
    );

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Template setting not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Template setting fetched successfully.",
      data,
    });

  } catch (error) {

    console.error("Get Template Setting By Id Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

export const updateTemplateSetting = async (req, res) => {
  let connection;

  try {
    const branchId = getBranchId(req);
    const userId = req.user.id;
    const { id } = req.params;

    const {
      name,
      description = null,
      isActive = 1,
      items = [],
    } = req.body;

    // Validation
    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Template name is required.",
      });
    }

    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: "Items must be an array.",
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    // Check Template Exists
    const existing = await fetchTemplateSettingDetails(
      connection,
      id,
      branchId
    );

    if (!existing) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Template setting not found.",
      });
    }

    // Duplicate Name Check
    const [duplicate] = await connection.query(
      `
      SELECT id
      FROM template_settings
      WHERE LOWER(name) = LOWER(?)
        AND branch_id = ?
        AND id <> ?
      LIMIT 1
      `,
      [name.trim(), branchId, id]
    );

    if (duplicate.length > 0) {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message: "Template setting already exists.",
      });
    }

    // Update Parent
    await connection.query(
      `
      UPDATE template_settings
      SET
          name = ?,
          description = ?,
          is_active = ?,
          updated_by = ?
      WHERE id = ?
        AND branch_id = ?
      `,
      [
        name.trim(),
        description,
        Number(isActive),
        userId,
        id,
        branchId,
      ]
    );

    // Replace Child Items
    await replaceTemplateSettingItems(
      connection,
      id,
      items
    );

    await connection.commit();

    // Return Updated Data
    const data = await fetchTemplateSettingDetails(
      connection,
      id,
      branchId
    );

    return res.status(200).json({
      success: true,
      message: "Template setting updated successfully.",
      data,
    });

  } catch (error) {

    if (connection) {
      await connection.rollback();
    }

    console.error("Update Template Setting Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });

  } finally {

    if (connection) {
      connection.release();
    }

  }
};