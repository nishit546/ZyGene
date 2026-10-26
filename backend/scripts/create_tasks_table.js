require("dotenv").config();
const { pool } = require("../config/db");

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS farm_tasks (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    field_id INT REFERENCES fields(id) ON DELETE SET NULL,
    crop_id INT REFERENCES crops(id) ON DELETE SET NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'general' CHECK (category IN ('irrigation', 'treatment', 'fertilizer', 'scouting', 'harvest', 'general')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    due_date DATE DEFAULT NULL,
    completed_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_farm_tasks_user_id ON farm_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_farm_tasks_status ON farm_tasks(status);
CREATE INDEX IF NOT EXISTS idx_farm_tasks_due_date ON farm_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_farm_tasks_crop_id ON farm_tasks(crop_id);
CREATE INDEX IF NOT EXISTS idx_farm_tasks_field_id ON farm_tasks(field_id);
`;

async function run() {
  try {
    console.log("Creating farm_tasks table in PostgreSQL...");
    await pool.query(CREATE_TABLE_SQL);
    console.log("farm_tasks table and indexes created successfully!");

    // Verify
    const res = await pool.query(
      "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'farm_tasks' ORDER BY ordinal_position"
    );
    console.log("Table columns:");
    console.table(res.rows);
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

run();
