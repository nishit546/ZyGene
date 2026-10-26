const { pool } = require("../config/db");

const createHarvest = async (req, res) => {
  try {
    const user_id = req.user.id;

    const {
      lifecycle_record_id,
      harvest_date,
      total_yield,
      yield_unit,
      area_harvested,
      area_unit,
      yield_per_area,
      number_of_plants,
      average_weight,
      quality_grade,
      notes,
    } = req.body;

    if (!lifecycle_record_id || !harvest_date) {
      return res.status(400).json({
        message:
          "Lifecycle record ID and harvest date are required",
      });
    }

    // Check ownership
    const checkQuery = `
      SELECT lifecycle_records.id
      FROM lifecycle_records
      INNER JOIN crops
        ON lifecycle_records.crop_id = crops.id
      INNER JOIN fields
        ON crops.field_id = fields.id
      WHERE lifecycle_records.id = $1
        AND fields.user_id = $2
    `;

    const checkResult = await pool.query(checkQuery, [lifecycle_record_id, user_id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        message:
          "Lifecycle record not found or unauthorized",
      });
    }

    const insertQuery = `
      INSERT INTO harvest_records (
        lifecycle_record_id,
        harvest_date,
        total_yield,
        yield_unit,
        area_harvested,
        area_unit,
        yield_per_area,
        number_of_plants,
        average_weight,
        quality_grade,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      lifecycle_record_id,
      harvest_date,
      total_yield || null,
      yield_unit || null,
      area_harvested || null,
      area_unit || null,
      yield_per_area || null,
      number_of_plants || null,
      average_weight || null,
      quality_grade || null,
      notes || null,
    ]);

    return res.status(201).json({
      message: "Harvest record created successfully",
      harvest: result.rows[0],
    });
  } catch (error) {
    console.error("Create harvest error:", error.message);
    return res.status(500).json({
      message: "Failed to create harvest record",
    });
  }
};

const getHarvestByLifecycle = async (req, res) => {
  try {
    const user_id = req.user.id;
    const lifecycle_record_id = req.params.lifecycleRecordId;

    const query = `
      SELECT harvest_records.*
      FROM harvest_records
      INNER JOIN lifecycle_records
        ON harvest_records.lifecycle_record_id = lifecycle_records.id
      INNER JOIN crops
        ON lifecycle_records.crop_id = crops.id
      INNER JOIN fields
        ON crops.field_id = fields.id
      WHERE harvest_records.lifecycle_record_id = $1
        AND fields.user_id = $2
      ORDER BY
        harvest_records.harvest_date ASC,
        harvest_records.created_at ASC
    `;

    const result = await pool.query(query, [lifecycle_record_id, user_id]);

    return res.status(200).json({
      message: "Harvest records fetched successfully",
      harvest: result.rows,
    });
  } catch (error) {
    console.error("Get harvest error:", error.message);
    return res.status(500).json({
      message: "Failed to fetch harvest records",
    });
  }
};

module.exports = {
  createHarvest,
  getHarvestByLifecycle,
};