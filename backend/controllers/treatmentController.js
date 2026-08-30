const db = require("../config/db");

const createTreatment = (req, res) => {
  const user_id = req.user.id;

  const {
    lifecycle_record_id,
    treatment_type,
    product_name,
    quantity,
    quantity_unit,
    application_method,
    application_date,
    notes,
  } = req.body;

  if (
    !lifecycle_record_id ||
    !treatment_type ||
    !application_date
  ) {
    return res.status(400).json({
      message:
        "Lifecycle record ID, treatment type and application date are required",
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
        console.error("Check treatment error:", error);

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
       insert into treatment_records (
          lifecycle_record_id,
          treatment_type,
          product_name,
          quantity,
          quantity_unit,
          application_method,
          application_date,
          notes
        )
        values (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.query(
        insertQuery,
        [
          lifecycle_record_id,
          treatment_type,
          product_name || null,
          quantity || null,
          quantity_unit || null,
          application_method || null,
          application_date,
          notes || null,
        ],
        (error, result) => {
          if (error) {
            console.error(
              "Create treatment error:",
              error
            );

            return res.status(500).json({
              message: "Failed to create treatment",
            });
          }

          res.status(201).json({
            message: "Treatment created successfully",
            treatment: {
              id: result.insertId,
              lifecycle_record_id,
              treatment_type,
              product_name,
              quantity,
              quantity_unit,
              application_method,
              application_date,
              notes,
            },
          });
        }
      );
    }
  );
};

module.exports = {
  createTreatment,
};