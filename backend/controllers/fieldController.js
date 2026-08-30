const db = require("../config/db");

const createField = (req, res) => {
  const {
    field_name,
    latitude,
    longitude,
    area,
    area_unit,
    soil_type,
    location_name,
  } = req.body;

  // Logged-in user's ID comes from JWT middleware
  const user_id = req.user.id;

  if (!field_name) {
    return res.status(400).json({
      message: "Field name is required",
    });
  }

  const query = `
    insert into fields 
    (
      user_id,
      field_name,
      latitude,
      longitude,
      area,
      area_unit,
      soil_type,
      location_name
    )
    values (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    query,
    [
      user_id,
      field_name,
      latitude || null,
      longitude || null,
      area || null,
      area_unit || null,
      soil_type || null,
      location_name || null,
    ],
    (error, result) => {
      if (error) {
        console.error(error);

        return res.status(500).json({
          message: "Failed to create field",
        });
      }

      res.status(201).json({
        message: "Field created successfully",
        field: {
          id: result.insertId,
          user_id,
          field_name,
          latitude,
          longitude,
          area,
          area_unit,
          soil_type,
          location_name,
        },
      });
    }
  );
};

const getFields = (req, res) => {
  const user_id = req.user.id;

  const query = `
    select * from fields
    where user_id = ?
    order by created_at desc
  `;

  db.query(query, [user_id], (error, results) => {
    if (error) {
      console.error(error);

      return res.status(500).json({
        message: "Failed to fetch fields",
      });
    }

    res.status(200).json({
      message: "Fields fetched successfully",
      fields: results,
    });
  });
};

const getFieldById = (req, res) => {
  const user_id = req.user.id;
  const field_id = req.params.id;

  const query = `
    select * from fields
    where id = ? and user_id = ?
  `;

  db.query(query, [field_id, user_id], (error, results) => {
    if (error) {
      console.error(error);

      return res.status(500).json({
        message: "Failed to fetch field",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: "Field not found",
      });
    }

    res.status(200).json({
      message: "Field fetched successfully",
      field: results[0],
    });
  });
};

const updateField = (req, res) => {
  const user_id = req.user.id;
  const field_id = req.params.id;

  const {
    field_name,
    latitude,
    longitude,
    area,
    area_unit,
    soil_type,
    location_name,
  } = req.body;

  if (!field_name) {
    return res.status(400).json({
      message: "Field name is required",
    });
  }

  const query = `
    update fields
    set
      field_name = ?,
      latitude = ?,
      longitude = ?,
      area = ?,
      area_unit = ?,
      soil_type = ?,
      location_name = ?
    where id = ? and user_id = ?
  `;

  db.query(
    query,
    [
      field_name,
      latitude || null,
      longitude || null,
      area || null,
      area_unit || null,
      soil_type || null,
      location_name || null,
      field_id,
      user_id,
    ],
    (error, result) => {
      if (error) {
        console.error(error);

        return res.status(500).json({
          message: "Failed to update field",
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: "Field not found or unauthorized",
        });
      }

      res.status(200).json({
        message: "Field updated successfully",
      });
    }
  );
};

const deleteField = (req, res) => {
  const user_id = req.user.id;
  const field_id = req.params.id;

  const query = `
    delete from fields
    where id = ? and user_id = ?
  `;

  db.query(query, [field_id, user_id], (error, result) => {
    if (error) {
      console.error(error);

      return res.status(500).json({
        message: "Failed to delete field",
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Field not found or unauthorized",
      });
    }

    res.status(200).json({
      message: "Field deleted successfully",
    });
  });
};
module.exports = {
  createField,
  getFields
  ,getFieldById,
  updateField,
  deleteField
};