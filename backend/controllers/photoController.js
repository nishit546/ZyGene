const db = require("../config/db");


// ========================================
// CREATE PHOTO
// ========================================

const createPhoto = (req, res) => {
  const user_id = req.user.id;

  const {
    lifecycle_record_id,
    image_url,
    caption,
    captured_at,
  } = req.body;

  if (!lifecycle_record_id || !image_url) {
    return res.status(400).json({
      message:
        "Lifecycle record ID and image URL are required",
    });
  }

  const checkQuery = `
    select lifecycle_records.id
    from lifecycle_records
    inner join crops
      on lifecycle_records.crop_id = crops.id
    inner join fields
      on crops.field_id = fields.id
    where lifecycle_records.id = ?
      and fields.user_id = ?
  `;

  db.query(
    checkQuery,
    [lifecycle_record_id, user_id],
    (error, results) => {
      if (error) {
        console.error(
          "Check photo error:",
          error
        );

        return res.status(500).json({
          message: "Database error",
        });
      }

      if (results.length === 0) {
        return res.status(404).json({
          message:
            "Lifecycle record not found or unauthorized",
        });
      }

      const insertQuery = `
        insert into crop_photos (
          lifecycle_record_id,
          image_url,
          caption,
          captured_at
        )
        values (?, ?, ?, ?)
      `;

      db.query(
        insertQuery,
        [
          lifecycle_record_id,
          image_url,
          caption || null,
          captured_at || null,
        ],
        (error, result) => {
          if (error) {
            console.error(
              "Create photo error:",
              error
            );

            return res.status(500).json({
              message: "Failed to create photo",
            });
          }

          res.status(201).json({
            message:
              "Photo added successfully",

            photo: {
              id: result.insertId,
              lifecycle_record_id,
              image_url,
              caption,
              captured_at,
            },
          });
        }
      );
    }
  );
};


// ========================================
// GET PHOTOS
// ========================================

const getPhotos = (req, res) => {
  const user_id = req.user.id;

  const lifecycle_record_id =
    req.params.lifecycleRecordId;

  const query = `
    select crop_photos.*
    from crop_photos

    inner join lifecycle_records
      on crop_photos.lifecycle_record_id =
         lifecycle_records.id

    inner join crops
      on lifecycle_records.crop_id =
         crops.id

    inner join fields
      on crops.field_id =
         fields.id

    where crop_photos.lifecycle_record_id = ?
      and fields.user_id = ?

    order by crop_photos.created_at asc
  `;

  db.query(
    query,
    [
      lifecycle_record_id,
      user_id,
    ],
    (error, results) => {
      if (error) {
        console.error(
          "Get photos error:",
          error
        );

        return res.status(500).json({
          message:
            "Failed to fetch photos",
        });
      }

      res.status(200).json({
        message:
          "Photos fetched successfully",

        photos: results,
      });
    }
  );
};


// ========================================
// EXPORT
// ========================================

module.exports = {
  createPhoto,
  getPhotos,
};