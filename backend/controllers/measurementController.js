const db = require("../config/db");

const createMeasurement = (req, res) => {
  const user_id = req.user.id;

  const {
    lifecycle_record_id,
    measurement_type,
    measurement_value,
    unit,
    notes,
  } = req.body;

  if (
    !lifecycle_record_id ||
    !measurement_type ||
    measurement_value === undefined
  ) {
    return res.status(400).json({
      message:
        "Lifecycle record ID, measurement type and value are required",
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
        console.error("Check measurement error:", error);

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
        insert into growth_measurements (
          lifecycle_record_id,
          measurement_type,
          measurement_value,
          unit,
          notes
        )
        values (?, ?, ?, ?, ?)
      `;

      db.query(
        insertQuery,
        [
          lifecycle_record_id,
          measurement_type,
          measurement_value,
          unit || null,
          notes || null,
        ],
        (error, result) => {
          if (error) {
            console.error(
              "Create measurement error:",
              error
            );

            return res.status(500).json({
              message: "Failed to create measurement",
            });
          }

          res.status(201).json({
            message: "Measurement created successfully",
            measurement: {
              id: result.insertId,
              lifecycle_record_id,
              measurement_type,
              measurement_value,
              unit,
              notes,
            },
          });
        }
      );
    }
  );
};

const getMeasurements = (req, res) => {
  const user_id = req.user.id;
  const lifecycle_record_id = req.params.lifecycleRecordId;

  const query = `
    select growth_measurements.*
    from growth_measurements
    inner join lifecycle_records
      on growth_measurements.lifecycle_record_id = lifecycle_records.id
    inner join crops
      on lifecycle_records.crop_id = crops.id
    inner join fields
      on crops.field_id = fields.id
    where growth_measurements.lifecycle_record_id = ?
      and fields.user_id = ?
    order by growth_measurements.created_at asc
  `;

  db.query(
    query,
    [lifecycle_record_id, user_id],
    (error, results) => {
      if (error) {
        console.error("Get measurements error:", error);

        return res.status(500).json({
          message: "Failed to fetch measurements",
        });
      }

      res.status(200).json({
        message: "Measurements fetched successfully",
        measurements: results,
      });
    }
  );
};

module.exports = {
  createMeasurement,getMeasurements
};