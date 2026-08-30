const db = require("../config/db");

const createDiseasePestObservation = (req, res) => {
  const user_id = req.user.id;

  const {
    lifecycle_record_id,
    observation_type,
    name,
    severity,
    affected_percentage,
    observation_date,
    notes,
  } = req.body;

  if (
    !lifecycle_record_id ||
    !observation_type ||
    !name ||
    !observation_date
  ) {
    return res.status(400).json({
      message:
        "Lifecycle record ID, observation type, name and observation date are required",
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
        console.error("Check disease/pest error:", error);

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
        insert into disease_pest_observations (
          lifecycle_record_id,
          observation_type,
          name,
          severity,
          affected_percentage,
          observation_date,
          notes
        )
        values (?, ?, ?, ?, ?, ?, ?)
      `;

      db.query(
        insertQuery,
        [
          lifecycle_record_id,
          observation_type,
          name,
          severity || null,
          affected_percentage || null,
          observation_date,
          notes || null,
        ],
        (error, result) => {
          if (error) {
            console.error(
              "Create disease/pest error:",
              error
            );

            return res.status(500).json({
              message:
                "Failed to create disease/pest observation",
            });
          }

          res.status(201).json({
            message:
              "Disease/pest observation created successfully",

            observation: {
              id: result.insertId,
              lifecycle_record_id,
              observation_type,
              name,
              severity,
              affected_percentage,
              observation_date,
              notes,
            },
          });
        }
      );
    }
  );
};

module.exports = {
  createDiseasePestObservation,
};