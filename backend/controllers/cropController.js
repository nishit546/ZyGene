const db = require("../config/db");

const createCrop = (req, res) => {
  const user_id = req.user.id;

  const {
    field_id,
    crop_name,
    variety,
    sowing_date,
    expected_harvest_date,
    notes,
  } = req.body;

  if (!field_id || !crop_name) {
    return res.status(400).json({
      message: "Field ID and crop name are required",
    });
  }

  const checkFieldQuery = `
    select id from fields
    where id = ? and user_id = ?
  `;

  db.query(
    checkFieldQuery,
    [field_id, user_id],
    (error, fields) => {
      if (error) {
        console.error(error);

        return res.status(500).json({
          message: "Database error",
        });
      }

      if (fields.length === 0) {
        return res.status(404).json({
          message: "Field not found or unauthorized",
        });
      }

      const insertQuery = `
        insert into crops (
          field_id,
          crop_name,
          variety,
          sowing_date,
          expected_harvest_date,
          notes
        )
        values (?, ?, ?, ?, ?, ?)
      `;

      db.query(
        insertQuery,
        [
          field_id,
          crop_name,
          variety || null,
          sowing_date || null,
          expected_harvest_date || null,
          notes || null,
        ],
        (error, result) => {
          if (error) {
            console.error(error);

            return res.status(500).json({
              message: "Failed to create crop",
            });
          }

          res.status(201).json({
            message: "Crop created successfully",
            crop: {
              id: result.insertId,
              field_id,
              crop_name,
              variety,
              sowing_date,
              expected_harvest_date,
              crop_status: "active",
              notes,
            },
          });
        }
      );
    }
  );
};

const getCrops = (req, res) => {
  const user_id = req.user.id;

  const query = `
    select 
      crops.*,
      fields.field_name
    from crops
    inner join fields
      on crops.field_id = fields.id
    where fields.user_id = ?
    order by crops.created_at desc
  `;

  db.query(query, [user_id], (error, results) => {
    if (error) {
      console.error(error);

      return res.status(500).json({
        message: "Failed to fetch crops",
      });
    }

    res.status(200).json({
      message: "Crops fetched successfully",
      crops: results,
    });
  });
};

const getCropById = (req, res) => {
  const user_id = req.user.id;
  const crop_id = req.params.id;

  const query = `
    select 
      crops.*,
      fields.field_name,
      fields.location_name
    from crops
    inner join fields
      on crops.field_id = fields.id
    where crops.id = ?
      and fields.user_id = ?
  `;

  db.query(
    query,
    [crop_id, user_id],
    (error, results) => {
      if (error) {
        console.error(error);

        return res.status(500).json({
          message: "Failed to fetch crop",
        });
      }

      if (results.length === 0) {
        return res.status(404).json({
          message: "Crop not found or unauthorized",
        });
      }

      res.status(200).json({
        message: "Crop fetched successfully",
        crop: results[0],
      });
    }
  );
};

const updateCrop = (req, res) => {
  const user_id = req.user.id;
  const crop_id = req.params.id;

  const {
    crop_name,
    variety,
    sowing_date,
    expected_harvest_date,
    crop_status,
    notes,
  } = req.body;

  if (!crop_name) {
    return res.status(400).json({
      message: "Crop name is required",
    });
  }

  // Step 1: Check whether this crop belongs
  // to a field owned by the logged-in user
  const checkQuery = `
    SELECT crops.id
    FROM crops
    INNER JOIN fields
      ON crops.field_id = fields.id
    WHERE crops.id = ?
      AND fields.user_id = ?
  `;

  db.query(
    checkQuery,
    [crop_id, user_id],
    (error, results) => {
      if (error) {
        console.error("Check crop error:", error);

        return res.status(500).json({
          message: "Database error while checking crop",
        });
      }

      if (results.length === 0) {
        return res.status(404).json({
          message: "Crop not found or unauthorized",
        });
      }

      // Step 2: Update the crop
      const updateQuery = `
        update crops
        set
          crop_name = ?,
          variety = ?,
          sowing_date = ?,
          expected_harvest_date = ?,
          crop_status = ?,
          notes = ?
        where id = ?
      `;

      db.query(
        updateQuery,
        [
          crop_name,
          variety || null,
          sowing_date || null,
          expected_harvest_date || null,
          crop_status || "active",
          notes || null,
          crop_id,
        ],
        (error, result) => {
          if (error) {
            console.error("Update crop error:", error);

            return res.status(500).json({
              message: "Failed to update crop",
            });
          }

          res.status(200).json({
            message: "Crop updated successfully",
          });
        }
      );
    }
  );
};
const deleteCrop = (req, res) => {
  const user_id = req.user.id;
  const crop_id = req.params.id;

  const query = `
    delete crops
    from crops
    inner join fields
      on crops.field_id = fields.id
    where crops.id = ?
      and fields.user_id = ?
  `;

  db.query(query, [crop_id, user_id], (error, result) => {
    if (error) {
      console.error("Delete crop error:", error);

      return res.status(500).json({
        message: "Failed to delete crop",
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Crop not found or unauthorized",
      });
    }

    res.status(200).json({
      message: "Crop deleted successfully",
    });
  });
};
module.exports = {
  createCrop,
  getCrops,getCropById,updateCrop,deleteCrop
};