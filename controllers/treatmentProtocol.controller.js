import db from "../config/db.js";

const getBranchId = (req) => req.user.branchId || req.user.branch_id;

const fetchTreatmentProtocolDetails = async (
  connection,
  protocolId,
  branchId
) => {
  // Fetch Parent
  const [protocols] = await connection.query(
    `
    SELECT
        tp.id,
        tp.branch_id,
        tp.name,
        tp.description,
        tp.is_active,
        tp.created_by,
        tp.updated_by,
        tp.created_at,
        tp.updated_at
    FROM treatment_protocols tp
    WHERE tp.id = ?
      AND tp.branch_id = ?
    LIMIT 1
    `,
    [protocolId, branchId]
  );

  if (protocols.length === 0) {
    return null;
  }

  const protocol = protocols[0];

  // Fetch Child Items
  const [items] = await connection.query(
    `
    SELECT
        id,
        protocol_id,
        title,
        description,
        sort_order,
        created_at,
        updated_at
    FROM treatment_protocol_items
    WHERE protocol_id = ?
    ORDER BY sort_order ASC
    `,
    [protocolId]
  );

  protocol.items = items;

  return protocol;
};


const replaceTreatmentProtocolItems = async (
  connection,
  protocolId,
  items = []
) => {
  // Delete existing items
  await connection.query(
    `DELETE FROM treatment_protocol_items WHERE protocol_id = ?`,
    [protocolId]
  );

  if (!items.length) return;

  const values = items.map((item) => [
    protocolId,
    item.title.trim(),
    item.description ?? null,
    item.sortOrder ?? 1,
  ]);

  await connection.query(
    `
    INSERT INTO treatment_protocol_items
    (
      protocol_id,
      title,
      description,
      sort_order
    )
    VALUES ?
    `,
    [values]
  );
};


export const createTreatmentProtocol = async (req, res) => {
  let connection;

  try {
    const branchId = getBranchId(req);
    const userId = req.user.id;

    const {
      name,
      description = null,
      items = [],
    } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Protocol name is required."
      });
    }

    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: "Items must be an array."
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    // Duplicate check
    const [existing] = await connection.query(
      `
      SELECT id
      FROM treatment_protocols
      WHERE LOWER(name)=LOWER(?)
      AND branch_id=?
      LIMIT 1
      `,
      [name.trim(), branchId]
    );

    if (existing.length > 0) {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message: "Treatment protocol already exists."
      });
    }

    // Insert parent
    const [protocolResult] = await connection.query(
      `
      INSERT INTO treatment_protocols
      (
        branch_id,
        name,
        description,
        created_by,
        updated_by
      )
      VALUES (?,?,?,?,?)
      `,
      [
        branchId,
        name.trim(),
        description,
        userId,
        userId
      ]
    );

    const protocolId = protocolResult.insertId;

    // Insert child items
    if (items.length > 0) {

      const values = items.map(item => ([
        protocolId,
        item.title?.trim(),
        item.description ?? null,
        item.sortOrder ?? 1
      ]));

      await connection.query(
        `
        INSERT INTO treatment_protocol_items
        (
          protocol_id,
          title,
          description,
          sort_order
        )
        VALUES ?
        `,
        [values]
      );
    }

    await connection.commit();

    // Return created protocol
    const data = await fetchTreatmentProtocolDetails(
    connection,
    protocolId,
    branchId
);

return res.status(201).json({
    success: true,
    message: "Treatment protocol created successfully.",
    data
});

  } catch (error) {

    if (connection) {
      await connection.rollback();
    }

    console.error("Create Treatment Protocol:", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });

  } finally {

    if (connection) {
      connection.release();
    }

  }
};


export const getTreatmentProtocols = async (req, res) => {
  try {
    const branchId = getBranchId(req);

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const search = req.query.search?.trim() || "";
    const isActive = req.query.isActive;

    let whereClause = "WHERE tp.branch_id = ?";
    const params = [branchId];

    if (search) {
      whereClause += " AND tp.name LIKE ?";
      params.push(`%${search}%`);
    }

    if (isActive !== undefined) {
      whereClause += " AND tp.is_active = ?";
      params.push(Number(isActive));
    }

    // Total Records
    const [countResult] = await db.query(
      `
      SELECT COUNT(*) AS total
      FROM treatment_protocols tp
      ${whereClause}
      `,
      params
    );

    const total = countResult[0].total;

    // Protocol List
    const [protocols] = await db.query(
      `
      SELECT
          tp.id,
          tp.name,
          tp.description,
          tp.is_active,
          tp.created_at,
          tp.updated_at
      FROM treatment_protocols tp
      ${whereClause}
      ORDER BY tp.id DESC
      LIMIT ? OFFSET ?
      `,
      [...params, limit, offset]
    );

    // Fetch Child Items
    for (const protocol of protocols) {
      const [items] = await db.query(
        `
        SELECT
            id,
            title,
            description,
            sort_order
        FROM treatment_protocol_items
        WHERE protocol_id = ?
        ORDER BY sort_order ASC
        `,
        [protocol.id]
      );

      protocol.items = items;
    }

    return res.status(200).json({
      success: true,
      message: "Treatment protocols fetched successfully.",
      data: protocols,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get Treatment Protocols Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getTreatmentProtocolById = async (req, res) => {
  try {
    const branchId = getBranchId(req);
    const { id } = req.params;

    const data = await fetchTreatmentProtocolDetails(
      db,
      id,
      branchId
    );

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Treatment protocol not found."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Treatment protocol fetched successfully.",
      data
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }
};

export const updateTreatmentProtocol = async (req, res) => {
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

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Protocol name is required.",
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

    // Check protocol exists
    const existing = await fetchTreatmentProtocolDetails(
      connection,
      id,
      branchId
    );

    if (!existing) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Treatment protocol not found.",
      });
    }

    // Duplicate name validation
    const [duplicate] = await connection.query(
      `
      SELECT id
      FROM treatment_protocols
      WHERE LOWER(name)=LOWER(?)
        AND branch_id=?
        AND id<>?
      LIMIT 1
      `,
      [name.trim(), branchId, id]
    );

    if (duplicate.length > 0) {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message: "Treatment protocol already exists.",
      });
    }

    // Update parent
    await connection.query(
      `
      UPDATE treatment_protocols
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

    // Replace child items
    await replaceTreatmentProtocolItems(
      connection,
      id,
      items
    );

    await connection.commit();

    // Fetch updated data
    const data = await fetchTreatmentProtocolDetails(
      connection,
      id,
      branchId
    );

    return res.status(200).json({
      success: true,
      message: "Treatment protocol updated successfully.",
      data,
    });

  } catch (error) {

    if (connection) {
      await connection.rollback();
    }

    console.error("Update Treatment Protocol:", error);

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

export const deleteTreatmentProtocol = async (req, res) => {
  let connection;

  try {
    const branchId = getBranchId(req);
    const { id } = req.params;

    connection = await db.getConnection();
    await connection.beginTransaction();

    const existing = await fetchTreatmentProtocolDetails(
      connection,
      id,
      branchId
    );

    if (!existing) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Treatment protocol not found.",
      });
    }

    // Delete child records first
    await connection.query(
      `
      DELETE FROM treatment_protocol_items
      WHERE protocol_id = ?
      `,
      [id]
    );

    // Delete parent record
    await connection.query(
      `
      DELETE FROM treatment_protocols
      WHERE id = ?
        AND branch_id = ?
      `,
      [id, branchId]
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Treatment protocol deleted successfully.",
    });

  } catch (error) {

    if (connection) {
      await connection.rollback();
    }

    console.error("Delete Treatment Protocol:", error);

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