const db = require("../config/db");

// ========================================
// CREATE DISEASE / PEST OBSERVATION
// ========================================

const createObservation = (req, res) => {
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

  // ========================================
  // CHECK OWNERSHIP
  // ========================================

  const checkQuery = `
    SELECT lifecycle_records.id
    FROM lifecycle_records
    INNER JOIN crops
      ON lifecycle_records.crop_id = crops.id
    INNER JOIN fields
      ON crops.field_id = fields.id
    WHERE lifecycle_records.id = ?
      AND fields.user_id = ?
  `;

  db.query(
    checkQuery,
    [lifecycle_record_id, user_id],
    (error, results) => {
      if (error) {
        console.error(
          "Check observation error:",
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
      // INSERT OBSERVATION
      // ========================================

      const insertQuery = `
        INSERT INTO disease_pest_observations (
          lifecycle_record_id,
          observation_type,
          name,
          severity,
          affected_percentage,
          observation_date,
          notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
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
              "Create observation error:",
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


// ========================================
// GET DISEASE / PEST OBSERVATIONS
// ========================================

const getObservationsByLifecycle = (
  req,
  res
) => {
  const user_id = req.user.id;

  const lifecycle_record_id =
    req.params.lifecycleRecordId;

  const query = `
    SELECT disease_pest_observations.*
    FROM disease_pest_observations

    INNER JOIN lifecycle_records
      ON disease_pest_observations.lifecycle_record_id =
         lifecycle_records.id

    INNER JOIN crops
      ON lifecycle_records.crop_id =
         crops.id

    INNER JOIN fields
      ON crops.field_id =
         fields.id

    WHERE disease_pest_observations.lifecycle_record_id = ?
      AND fields.user_id = ?

    ORDER BY
      disease_pest_observations.observation_date ASC,
      disease_pest_observations.created_at ASC
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
          "Get observations error:",
          error
        );

        return res.status(500).json({
          message:
            "Failed to fetch disease/pest observations",
        });
      }

      res.status(200).json({
        message:
          "Disease/pest observations fetched successfully",

        observations: results,
      });
    }
  );
};


module.exports = {
  createObservation,
  getObservationsByLifecycle,
};