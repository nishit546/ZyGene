const db = require("../config/db");

const createHarvest = (req, res) => {
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
        console.error("Check harvest error:", error);

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
        insert into harvest_records (
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
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.query(
        insertQuery,
        [
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
        ],
        (error, result) => {
          if (error) {
            console.error(
              "Create harvest error:",
              error
            );

            return res.status(500).json({
              message: "Failed to create harvest record",
            });
          }

          res.status(201).json({
            message: "Harvest record created successfully",

            harvest: {
              id: result.insertId,
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
            },
          });
        }
      );
    }
  );
};

module.exports = {
  createHarvest,
};