const { pool } = require("../config/db");

// ========================================
// CREATE PHOTO
// ========================================
const createPhoto = async (req, res) => {
  try {
    const user_id = req.user.id;

    const {
      lifecycle_record_id,
      image_url,
      caption,
      captured_at,
    } = req.body;

    if (!lifecycle_record_id || !image_url) {
      return res.status(400).json({
        message: "Lifecycle record ID and image URL are required",
      });
    }

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
        message: "Lifecycle record not found or unauthorized",
      });
    }

    const insertQuery = `
      INSERT INTO crop_photos (
        lifecycle_record_id,
        image_url,
        caption,
        captured_at
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      lifecycle_record_id,
      image_url,
      caption || null,
      captured_at || null,
    ]);

    return res.status(201).json({
      message: "Photo added successfully",
      photo: result.rows[0],
    });
  } catch (error) {
    console.error("Create photo error:", error.message);
    return res.status(500).json({
      message: "Failed to create photo",
    });
  }
};

// ========================================
// GET PHOTOS
// ========================================
const getPhotos = async (req, res) => {
  try {
    const user_id = req.user.id;
    const lifecycle_record_id = req.params.lifecycleRecordId;

    const query = `
      SELECT crop_photos.*
      FROM crop_photos
      INNER JOIN lifecycle_records
        ON crop_photos.lifecycle_record_id = lifecycle_records.id
      INNER JOIN crops
        ON lifecycle_records.crop_id = crops.id
      INNER JOIN fields
        ON crops.field_id = fields.id
      WHERE crop_photos.lifecycle_record_id = $1
        AND fields.user_id = $2
      ORDER BY crop_photos.created_at ASC
    `;

    const result = await pool.query(query, [lifecycle_record_id, user_id]);

    return res.status(200).json({
      message: "Photos fetched successfully",
      photos: result.rows,
    });
  } catch (error) {
    console.error("Get photos error:", error.message);
    return res.status(500).json({
      message: "Failed to fetch photos",
    });
  }
};

module.exports = {
  createPhoto,
  getPhotos,
};