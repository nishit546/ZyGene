const { pool } = require("../config/db");

/**
 * Get all tasks for authenticated user with optional filtering
 */
const getTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, priority, category, field_id, crop_id } = req.query;

    let queryText = `
      SELECT 
        t.id,
        t.user_id,
        t.field_id,
        f.field_name,
        t.crop_id,
        c.crop_name,
        c.variety,
        t.title,
        t.description,
        t.category,
        t.priority,
        t.status,
        t.due_date,
        t.completed_at,
        t.created_at,
        t.updated_at
      FROM farm_tasks t
      LEFT JOIN fields f ON t.field_id = f.id
      LEFT JOIN crops c ON t.crop_id = c.id
      WHERE t.user_id = $1
    `;

    const params = [userId];
    let paramIndex = 2;

    if (status && status !== "all") {
      queryText += ` AND t.status = $${paramIndex++}`;
      params.push(status);
    }

    if (priority && priority !== "all") {
      queryText += ` AND t.priority = $${paramIndex++}`;
      params.push(priority);
    }

    if (category && category !== "all") {
      queryText += ` AND t.category = $${paramIndex++}`;
      params.push(category);
    }

    if (field_id) {
      queryText += ` AND t.field_id = $${paramIndex++}`;
      params.push(field_id);
    }

    if (crop_id) {
      queryText += ` AND t.crop_id = $${paramIndex++}`;
      params.push(crop_id);
    }

    queryText += `
      ORDER BY 
        CASE 
          WHEN t.status = 'pending' THEN 1
          WHEN t.status = 'in_progress' THEN 2
          ELSE 3
        END,
        CASE
          WHEN t.priority = 'urgent' THEN 1
          WHEN t.priority = 'high' THEN 2
          WHEN t.priority = 'medium' THEN 3
          ELSE 4
        END,
        t.due_date ASC NULLS LAST,
        t.created_at DESC
    `;

    const result = await pool.query(queryText, params);

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      tasks: result.rows,
    });
  } catch (error) {
    console.error("Error fetching farm tasks:", error);
    return res.status(500).json({
      message: "Failed to fetch farm tasks",
      error: error.message,
    });
  }
};

/**
 * Get summary stats for user's tasks
 */
const getTaskStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const statsQuery = `
      SELECT 
        COUNT(*) AS total_count,
        COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
        COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_count,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed_count,
        COUNT(*) FILTER (WHERE status = 'pending' AND due_date = CURRENT_DATE) AS today_count,
        COUNT(*) FILTER (WHERE status = 'pending' AND due_date < CURRENT_DATE) AS overdue_count,
        COUNT(*) FILTER (WHERE status = 'pending' AND priority IN ('high', 'urgent')) AS high_priority_count
      FROM farm_tasks
      WHERE user_id = $1
    `;

    const result = await pool.query(statsQuery, [userId]);
    const row = result.rows[0] || {};

    return res.status(200).json({
      success: true,
      stats: {
        total: parseInt(row.total_count || 0, 10),
        pending: parseInt(row.pending_count || 0, 10),
        in_progress: parseInt(row.in_progress_count || 0, 10),
        completed: parseInt(row.completed_count || 0, 10),
        today: parseInt(row.today_count || 0, 10),
        overdue: parseInt(row.overdue_count || 0, 10),
        high_priority: parseInt(row.high_priority_count || 0, 10),
      },
    });
  } catch (error) {
    console.error("Error fetching task statistics:", error);
    return res.status(500).json({
      message: "Failed to fetch task stats",
      error: error.message,
    });
  }
};

/**
 * Get single task by ID
 */
const getTaskById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const queryText = `
      SELECT 
        t.*,
        f.field_name,
        c.crop_name,
        c.variety
      FROM farm_tasks t
      LEFT JOIN fields f ON t.field_id = f.id
      LEFT JOIN crops c ON t.crop_id = c.id
      WHERE t.id = $1 AND t.user_id = $2
    `;

    const result = await pool.query(queryText, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Task not found or unauthorized",
      });
    }

    return res.status(200).json({
      success: true,
      task: result.rows[0],
    });
  } catch (error) {
    console.error("Error fetching task details:", error);
    return res.status(500).json({
      message: "Failed to fetch task details",
      error: error.message,
    });
  }
};

/**
 * Create a new task
 */
const createTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      title,
      description,
      field_id,
      crop_id,
      category = "general",
      priority = "medium",
      status = "pending",
      due_date,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        message: "Task title is required",
      });
    }

    // Optional field validation
    if (field_id) {
      const fieldCheck = await pool.query(
        "SELECT id FROM fields WHERE id = $1 AND user_id = $2",
        [field_id, userId]
      );
      if (fieldCheck.rows.length === 0) {
        return res.status(400).json({
          message: "Selected field not found or unauthorized",
        });
      }
    }

    // Optional crop validation
    if (crop_id) {
      const cropCheck = await pool.query(
        `SELECT c.id FROM crops c
         JOIN fields f ON c.field_id = f.id
         WHERE c.id = $1 AND f.user_id = $2`,
        [crop_id, userId]
      );
      if (cropCheck.rows.length === 0) {
        return res.status(400).json({
          message: "Selected crop not found or unauthorized",
        });
      }
    }

    const insertQuery = `
      INSERT INTO farm_tasks (
        user_id,
        field_id,
        crop_id,
        title,
        description,
        category,
        priority,
        status,
        due_date,
        completed_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const completedAt = status === "completed" ? new Date() : null;

    const result = await pool.query(insertQuery, [
      userId,
      field_id || null,
      crop_id || null,
      title.trim(),
      description ? description.trim() : null,
      category,
      priority,
      status,
      due_date || null,
      completedAt,
    ]);

    return res.status(201).json({
      success: true,
      message: "Task created successfully",
      task: result.rows[0],
    });
  } catch (error) {
    console.error("Error creating farm task:", error);
    return res.status(500).json({
      message: "Failed to create farm task",
      error: error.message,
    });
  }
};

/**
 * Update task
 */
const updateTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const {
      title,
      description,
      field_id,
      crop_id,
      category,
      priority,
      status,
      due_date,
    } = req.body;

    const existing = await pool.query(
      "SELECT * FROM farm_tasks WHERE id = $1 AND user_id = $2",
      [id, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        message: "Task not found or unauthorized",
      });
    }

    const current = existing.rows[0];
    const newStatus = status !== undefined ? status : current.status;
    let completedAt = current.completed_at;

    if (newStatus === "completed" && current.status !== "completed") {
      completedAt = new Date();
    } else if (newStatus !== "completed") {
      completedAt = null;
    }

    const updateQuery = `
      UPDATE farm_tasks
      SET
        title = COALESCE($1, title),
        description = $2,
        field_id = $3,
        crop_id = $4,
        category = COALESCE($5, category),
        priority = COALESCE($6, priority),
        status = COALESCE($7, status),
        due_date = $8,
        completed_at = $9,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10 AND user_id = $11
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      title ? title.trim() : null,
      description !== undefined ? description : current.description,
      field_id !== undefined ? field_id : current.field_id,
      crop_id !== undefined ? crop_id : current.crop_id,
      category || null,
      priority || null,
      newStatus,
      due_date !== undefined ? due_date : current.due_date,
      completedAt,
      id,
      userId,
    ]);

    return res.status(200).json({
      success: true,
      message: "Task updated successfully",
      task: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating farm task:", error);
    return res.status(500).json({
      message: "Failed to update farm task",
      error: error.message,
    });
  }
};

/**
 * Toggle task completion status
 */
const toggleTaskStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const existing = await pool.query(
      "SELECT id, status FROM farm_tasks WHERE id = $1 AND user_id = $2",
      [id, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        message: "Task not found or unauthorized",
      });
    }

    const currentStatus = existing.rows[0].status;
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    const completedAt = newStatus === "completed" ? new Date() : null;

    const result = await pool.query(
      `UPDATE farm_tasks 
       SET status = $1, completed_at = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [newStatus, completedAt, id, userId]
    );

    return res.status(200).json({
      success: true,
      message: `Task marked as ${newStatus}`,
      task: result.rows[0],
    });
  } catch (error) {
    console.error("Error toggling task status:", error);
    return res.status(500).json({
      message: "Failed to toggle task status",
      error: error.message,
    });
  }
};

/**
 * Delete a task
 */
const deleteTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM farm_tasks WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Task not found or unauthorized",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting farm task:", error);
    return res.status(500).json({
      message: "Failed to delete farm task",
      error: error.message,
    });
  }
};

module.exports = {
  getTasks,
  getTaskStats,
  getTaskById,
  createTask,
  updateTask,
  toggleTaskStatus,
  deleteTask,
};
