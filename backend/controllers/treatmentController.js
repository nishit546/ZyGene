const db = require("../config/db");

// ========================================
// CREATE TREATMENT RECORD
// ========================================

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

  // Required fields

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

  // ========================================
  // CHECK OWNERSHIP
  // ========================================

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
          "Check treatment error:",
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

      // ========================================
      // INSERT TREATMENT
      // ========================================

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
              message:
                "Failed to create treatment record",
            });
          }

          res.status(201).json({
            message:
              "Treatment record created successfully",

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


// ========================================
// GET TREATMENT RECORDS
// ========================================

const getTreatmentsByLifecycle = (
  req,
  res
) => {
  const user_id = req.user.id;

  const lifecycle_record_id =
    req.params.lifecycleRecordId;

  const query = `
    select treatment_records.*
    from treatment_records

    inner join lifecycle_records
      on treatment_records.lifecycle_record_id =
         lifecycle_records.id

    inner join crops
      on lifecycle_records.crop_id =
         crops.id

    inner join fields
      on crops.field_id =
         fields.id

    where treatment_records.lifecycle_record_id = ?
      and fields.user_id = ?

    order by treatment_records.application_date asc,
             treatment_records.created_at asc
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
          "Get treatments error:",
          error
        );

        return res.status(500).json({
          message:
            "Failed to fetch treatment records",
        });
      }

      res.status(200).json({
        message:
          "Treatment records fetched successfully",

        treatments: results,
      });
    }
  );
};


// ========================================
// EXPORT
// ========================================

module.exports = {
  createTreatment,
  getTreatmentsByLifecycle,
};