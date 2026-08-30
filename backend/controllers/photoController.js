const db = require("../config/db");

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

  // Check ownership of lifecycle record
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
        console.error("Check photo error:", error);

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
            message: "Photo added successfully",
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

module.exports = {
  createPhoto,
};