const db = require("../config/db");

const createLifecycleRecord = (req, res) => {
  const user_id = req.user.id;

  const {
  crop_id,
  stage,
  record_date,
  record_time,
  latitude,
  longitude,
  notes,
} = req.body;

  if (!crop_id || !stage || !record_date) {
    return res.status(400).json({
      message: "Crop ID, stage and record date are required",
    });
  }

  // Check that the crop belongs to the logged-in user
  const checkCropQuery = `
    select crops.id
    from crops
    inner join fields
      on crops.field_id = fields.id
    where crops.id = ?
      and fields.user_id = ?
  `;

  db.query(
    checkCropQuery,
    [crop_id, user_id],
    (error, results) => {
      if (error) {
        console.error("Check crop error:", error);

        return res.status(500).json({
          message: "Database error",
        });
      }

      if (results.length === 0) {
        return res.status(404).json({
          message: "Crop not found or unauthorized",
        });
      }

     const insertQuery = `
  insert into lifecycle_records (
    crop_id,
    stage,
    record_date,
    record_time,
    latitude,
    longitude,
    notes
  )
  values (?, ?, ?, ?, ?, ?, ?)
`;

db.query(
  insertQuery,
  [
    crop_id,
    stage,
    record_date,
    record_time || null,
    latitude || null,
    longitude || null,
    notes || null,
  ],
  (error, result) => {
    if (error) {
      console.error("Create lifecycle error:", error);

      return res.status(500).json({
        message: "Failed to create lifecycle record",
      });
    }

    res.status(201).json({
      message: "Lifecycle record created successfully",
      lifecycle: {
        id: result.insertId,
        crop_id,
        stage,
        record_date,
        record_time,
        latitude,
        longitude,
        notes,
      },
    });
  }
);
    }
  );
};

const getLifecycleByCrop = (req, res) => {
  const user_id = req.user.id;
  const crop_id = req.params.cropId;

  const query = `
    select 
      lifecycle_records.*
    from lifecycle_records
    inner join crops
      on lifecycle_records.crop_id = crops.id
    inner join fields
      on crops.field_id = fields.id
    where lifecycle_records.crop_id = ?
      and fields.user_id = ?
    order by lifecycle_records.record_date asc,
             lifecycle_records.record_time asc
  `;

  db.query(
    query,
    [crop_id, user_id],
    (error, results) => {
      if (error) {
        console.error("Get lifecycle error:", error);

        return res.status(500).json({
          message: "Failed to fetch lifecycle records",
        });
      }

      res.status(200).json({
        message: "Lifecycle records fetched successfully",
        lifecycle: results,
      });
    }
  );
};

module.exports = {
  createLifecycleRecord,getLifecycleByCrop
};