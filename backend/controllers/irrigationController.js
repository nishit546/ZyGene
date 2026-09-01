const db = require("../config/db");

// ========================================
// CREATE IRRIGATION RECORD
// ========================================

const createIrrigation = (req, res) => {
  const user_id = req.user.id;

  const {
    lifecycle_record_id,
    irrigation_date,
    water_amount,
    water_unit,
    irrigation_method,
    notes,
  } = req.body;

  if (
    !lifecycle_record_id ||
    !irrigation_date
  ) {
    return res.status(400).json({
      message:
        "Lifecycle record ID and irrigation date are required",
    });
  }

  // Check that lifecycle record belongs
  // to the logged-in user

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
    [
      lifecycle_record_id,
      user_id,
    ],
    (error, results) => {
      if (error) {
        console.error(
          "Check irrigation error:",
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

      // Insert irrigation record

      const insertQuery = `
        insert into irrigation_records (
          lifecycle_record_id,
          irrigation_date,
          water_amount,
          water_unit,
          irrigation_method,
          notes
        )
        values (?, ?, ?, ?, ?, ?)
      `;

      db.query(
        insertQuery,
        [
          lifecycle_record_id,
          irrigation_date,
          water_amount || null,
          water_unit || null,
          irrigation_method || null,
          notes || null,
        ],
        (error, result) => {
          if (error) {
            console.error(
              "Create irrigation error:",
              error
            );

            return res.status(500).json({
              message:
                "Failed to create irrigation record",
            });
          }

          res.status(201).json({
            message:
              "Irrigation record created successfully",

            irrigation: {
              id: result.insertId,
              lifecycle_record_id,
              irrigation_date,
              water_amount,
              water_unit,
              irrigation_method,
              notes,
            },
          });
        }
      );
    }
  );
};


// ========================================
// GET IRRIGATION RECORDS
// ========================================

const getIrrigationByLifecycle =
  (req, res) => {
    const user_id = req.user.id;

    const lifecycle_record_id =
      req.params.lifecycleRecordId;

    const query = `
      select irrigation_records.*
      from irrigation_records

      inner join lifecycle_records
        on irrigation_records.lifecycle_record_id =
           lifecycle_records.id

      inner join crops
        on lifecycle_records.crop_id =
           crops.id

      inner join fields
        on crops.field_id =
           fields.id

      where irrigation_records.lifecycle_record_id = ?
        and fields.user_id = ?

      order by irrigation_records.irrigation_date asc,
               irrigation_records.created_at asc
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
            "Get irrigation error:",
            error
          );

          return res.status(500).json({
            message:
              "Failed to fetch irrigation records",
          });
        }

        res.status(200).json({
          message:
            "Irrigation records fetched successfully",

          irrigation: results,
        });
      }
    );
  };


// ========================================
// EXPORT
// ========================================

module.exports = {
  createIrrigation,
  getIrrigationByLifecycle,
};