const mysql = require("mysql2/promise");
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

// Configuration from environment or defaults
const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST || "localhost",
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "@nISHIT12345",
  database: process.env.MYSQL_DATABASE || "zygene",
};

const PG_CONFIG = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "@nISHIT12345",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  database: "zygene",
};

// Dependency-ordered tables
const TABLES_ORDER = [
  "users",
  "fields",
  "crops",
  "lifecycle_records",
  "growth_measurements",
  "crop_photos",
  "irrigation_records",
  "treatment_records",
  "disease_pest_observations",
  "harvest_records",
  "breeder_profiles",
  "breeding_programs",
  "breeding_crosses",
  "breeding_trials",
  "trial_observations",
];

// DDL for all 15 tables in PostgreSQL
const DDL_STATEMENTS = `
-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'farmer' CHECK (role IN ('farmer', 'breeder', 'admin')),
    phone VARCHAR(20) DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Fields Table
CREATE TABLE IF NOT EXISTS fields (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    latitude DECIMAL(10, 8) DEFAULT NULL,
    longitude DECIMAL(11, 8) DEFAULT NULL,
    area DECIMAL(10, 2) DEFAULT NULL,
    area_unit VARCHAR(20) DEFAULT NULL,
    soil_type VARCHAR(100) DEFAULT NULL,
    location_name VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Crops Table
CREATE TABLE IF NOT EXISTS crops (
    id SERIAL PRIMARY KEY,
    field_id INT NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
    crop_name VARCHAR(100) NOT NULL,
    variety VARCHAR(100) DEFAULT NULL,
    sowing_date DATE NOT NULL,
    expected_harvest_date DATE DEFAULT NULL,
    states VARCHAR(20) DEFAULT 'active' CHECK (states IN ('active', 'harvested', 'archived')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_on TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    crop_status VARCHAR(20) DEFAULT 'active' CHECK (crop_status IN ('active', 'harvested', 'failed', 'archived'))
);

-- 4. Lifecycle Records Table
CREATE TABLE IF NOT EXISTS lifecycle_records (
    id SERIAL PRIMARY KEY,
    crop_id INT NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
    stage VARCHAR(30) NOT NULL CHECK (stage IN ('seed_sowing', 'germination', 'seedling', 'vegetative', 'flowering', 'fruiting', 'maturity', 'harvest')),
    record_date DATE NOT NULL,
    record_time TIME DEFAULT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    latitude DECIMAL(10, 8) DEFAULT NULL,
    longitude DECIMAL(11, 8) DEFAULT NULL
);

-- 5. Growth Measurements Table
CREATE TABLE IF NOT EXISTS growth_measurements (
    id SERIAL PRIMARY KEY,
    lifecycle_record_id INT NOT NULL REFERENCES lifecycle_records(id) ON DELETE CASCADE,
    measurement_type VARCHAR(100) NOT NULL,
    measurement_value DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(30) DEFAULT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Crop Photos Table
CREATE TABLE IF NOT EXISTS crop_photos (
    id SERIAL PRIMARY KEY,
    lifecycle_record_id INT NOT NULL REFERENCES lifecycle_records(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    caption VARCHAR(255) DEFAULT NULL,
    captured_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. Irrigation Records Table
CREATE TABLE IF NOT EXISTS irrigation_records (
    id SERIAL PRIMARY KEY,
    lifecycle_record_id INT NOT NULL REFERENCES lifecycle_records(id) ON DELETE CASCADE,
    irrigation_date DATE NOT NULL,
    water_amount DECIMAL(10, 2) DEFAULT NULL,
    water_unit VARCHAR(30) DEFAULT NULL,
    irrigation_method VARCHAR(100) DEFAULT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. Treatment Records Table
CREATE TABLE IF NOT EXISTS treatment_records (
    id SERIAL PRIMARY KEY,
    lifecycle_record_id INT NOT NULL REFERENCES lifecycle_records(id) ON DELETE CASCADE,
    treatment_type VARCHAR(30) NOT NULL CHECK (treatment_type IN ('fertilizer', 'pesticide', 'fungicide', 'herbicide', 'other')),
    product_name VARCHAR(150) DEFAULT NULL,
    quantity DECIMAL(10, 2) DEFAULT NULL,
    quantity_unit VARCHAR(30) DEFAULT NULL,
    application_method VARCHAR(100) DEFAULT NULL,
    application_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 9. Disease & Pest Observations Table
CREATE TABLE IF NOT EXISTS disease_pest_observations (
    id SERIAL PRIMARY KEY,
    lifecycle_record_id INT NOT NULL REFERENCES lifecycle_records(id) ON DELETE CASCADE,
    observation_type VARCHAR(20) NOT NULL CHECK (observation_type IN ('disease', 'pest')),
    name VARCHAR(150) NOT NULL,
    severity VARCHAR(30) DEFAULT NULL,
    affected_percentage DECIMAL(5, 2) DEFAULT NULL,
    observation_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 10. Harvest Records Table
CREATE TABLE IF NOT EXISTS harvest_records (
    id SERIAL PRIMARY KEY,
    lifecycle_record_id INT NOT NULL REFERENCES lifecycle_records(id) ON DELETE CASCADE,
    harvest_date DATE NOT NULL,
    total_yield DECIMAL(12, 2) DEFAULT NULL,
    yield_unit VARCHAR(30) DEFAULT NULL,
    area_harvested DECIMAL(10, 2) DEFAULT NULL,
    area_unit VARCHAR(30) DEFAULT NULL,
    yield_per_area DECIMAL(12, 2) DEFAULT NULL,
    number_of_plants INT DEFAULT NULL,
    average_weight DECIMAL(10, 2) DEFAULT NULL,
    quality_grade VARCHAR(50) DEFAULT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 11. Breeder Profiles Table
CREATE TABLE IF NOT EXISTS breeder_profiles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    breeder_name VARCHAR(150) NOT NULL,
    organization VARCHAR(200) DEFAULT NULL,
    specialization VARCHAR(150) DEFAULT NULL,
    location VARCHAR(200) DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 12. Breeding Programs Table
CREATE TABLE IF NOT EXISTS breeding_programs (
    id SERIAL PRIMARY KEY,
    breeder_id INT NOT NULL REFERENCES breeder_profiles(id) ON DELETE CASCADE,
    program_name VARCHAR(200) NOT NULL,
    crop_name VARCHAR(100) NOT NULL,
    objective TEXT,
    start_date DATE DEFAULT NULL,
    expected_end_date DATE DEFAULT NULL,
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 13. Breeding Crosses Table
CREATE TABLE IF NOT EXISTS breeding_crosses (
    id SERIAL PRIMARY KEY,
    program_id INT NOT NULL REFERENCES breeding_programs(id) ON DELETE CASCADE,
    parent_1 VARCHAR(150) NOT NULL,
    parent_2 VARCHAR(150) NOT NULL,
    cross_code VARCHAR(100) NOT NULL,
    cross_date DATE NOT NULL,
    generation VARCHAR(50) DEFAULT NULL,
    objective TEXT,
    success_status VARCHAR(30) DEFAULT 'planned' CHECK (success_status IN ('planned', 'successful', 'failed', 'under_evaluation')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 14. Breeding Trials Table
CREATE TABLE IF NOT EXISTS breeding_trials (
    id SERIAL PRIMARY KEY,
    program_id INT NOT NULL REFERENCES breeding_programs(id) ON DELETE CASCADE,
    cross_id INT DEFAULT NULL REFERENCES breeding_crosses(id) ON DELETE SET NULL,
    trial_name VARCHAR(200) NOT NULL,
    location VARCHAR(200) DEFAULT NULL,
    season VARCHAR(100) DEFAULT NULL,
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'ongoing', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 15. Trial Observations Table
CREATE TABLE IF NOT EXISTS trial_observations (
    id SERIAL PRIMARY KEY,
    trial_id INT NOT NULL REFERENCES breeding_trials(id) ON DELETE CASCADE,
    observation_date DATE NOT NULL,
    measurement_type VARCHAR(100) NOT NULL,
    measurement_value DECIMAL(12, 2) DEFAULT NULL,
    unit VARCHAR(50) DEFAULT NULL,
    rating DECIMAL(5, 2) DEFAULT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_fields_user_id ON fields(user_id);
CREATE INDEX IF NOT EXISTS idx_crops_field_id ON crops(field_id);
CREATE INDEX IF NOT EXISTS idx_crops_variety ON crops(variety);
CREATE INDEX IF NOT EXISTS idx_lifecycle_crop_id ON lifecycle_records(crop_id);
CREATE INDEX IF NOT EXISTS idx_growth_lifecycle_id ON growth_measurements(lifecycle_record_id);
CREATE INDEX IF NOT EXISTS idx_photos_lifecycle_id ON crop_photos(lifecycle_record_id);
CREATE INDEX IF NOT EXISTS idx_irrigation_lifecycle_id ON irrigation_records(lifecycle_record_id);
CREATE INDEX IF NOT EXISTS idx_treatment_lifecycle_id ON treatment_records(lifecycle_record_id);
CREATE INDEX IF NOT EXISTS idx_disease_lifecycle_id ON disease_pest_observations(lifecycle_record_id);
CREATE INDEX IF NOT EXISTS idx_harvest_lifecycle_id ON harvest_records(lifecycle_record_id);
CREATE INDEX IF NOT EXISTS idx_breeding_programs_breeder_id ON breeding_programs(breeder_id);
CREATE INDEX IF NOT EXISTS idx_breeding_crosses_program_id ON breeding_crosses(program_id);
CREATE INDEX IF NOT EXISTS idx_breeding_trials_program_id ON breeding_trials(program_id);
CREATE INDEX IF NOT EXISTS idx_breeding_trials_cross_id ON breeding_trials(cross_id);
CREATE INDEX IF NOT EXISTS idx_trial_observations_trial_id ON trial_observations(trial_id);

-- Compatibility function: MySQL datediff(date1, date2) -> integer days (date1 - date2)
CREATE OR REPLACE FUNCTION datediff(end_date DATE, start_date DATE)
RETURNS INTEGER AS $$
BEGIN
    RETURN (end_date - start_date);
END;
$$ LANGUAGE plpgsql IMMUTABLE;
`;

// Format JS value for SQL literal
function sqlEscape(val) {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  if (typeof val === "number") return String(val);
  if (val instanceof Date) {
    // Format YYYY-MM-DD or ISO
    return `'${val.toISOString()}'`;
  }
  // String escaping
  const str = String(val).replace(/'/g, "''");
  return `'${str}'`;
}

async function runMigration() {
  console.log("=== Starting ZyGENE MySQL to PostgreSQL Migration ===");

  // 1. Ensure zygene database exists in PostgreSQL
  console.log("Connecting to PostgreSQL server...");
  const adminClient = new Client({
    host: PG_CONFIG.host,
    user: PG_CONFIG.user,
    password: PG_CONFIG.password,
    port: PG_CONFIG.port,
    database: "postgres",
  });
  await adminClient.connect();

  const checkDb = await adminClient.query(
    "SELECT 1 FROM pg_database WHERE datname = 'zygene'"
  );
  if (checkDb.rowCount === 0) {
    console.log("Creating PostgreSQL database 'zygene'...");
    await adminClient.query("CREATE DATABASE zygene");
    console.log("Database 'zygene' created successfully.");
  } else {
    console.log("PostgreSQL database 'zygene' already exists.");
  }
  await adminClient.end();

  // 2. Connect to MySQL and PostgreSQL zygene
  console.log("Connecting to MySQL source database...");
  const mysqlConn = await mysql.createConnection(MYSQL_CONFIG);
  console.log("Connected to MySQL successfully.");

  console.log("Connecting to PostgreSQL 'zygene' database...");
  const pgClient = new Client(PG_CONFIG);
  await pgClient.connect();
  console.log("Connected to PostgreSQL successfully.");

  // Build the complete standalone SQL dump file content
  let sqlDump = `-- ============================================================================
-- ZyGENE Full Database Schema & Data Migration for PostgreSQL / pgAdmin
-- Generated automatically for ZyGENE Agritech Platform
-- ============================================================================
--
-- HOW TO RUN THIS FILE IN PGADMIN 4:
-- ----------------------------------------------------------------------------
-- 1. Open pgAdmin 4 and connect to your PostgreSQL server.
-- 2. In the Browser tree (left panel), right-click "Databases" -> "Create" -> "Database...".
-- 3. Enter Database name: zygene (all lowercase), Owner: postgres, then click "Save".
--    (If 'zygene' database already exists, you can simply click on it).
-- 4. Right-click the 'zygene' database and select "Query Tool".
-- 5. Click the "Open File" button (folder icon / Ctrl+O) and select this file,
--    OR copy the entire contents of this file and paste it into the Query Tool.
-- 6. Click the "Execute" button (Play icon or press F5).
-- 7. All 15 tables, relational constraints, performance indexes, functions, 
--    and migrated data will be set up in one run!
-- ============================================================================

-- Ensure standard schema
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;

-- ============================================================================
-- STEP 1: CLEANUP EXISTING TABLES (IF ANY)
-- ============================================================================
`;

  // Reverse drop tables
  const reverseTables = [...TABLES_ORDER].reverse();
  for (const t of reverseTables) {
    sqlDump += `DROP TABLE IF EXISTS ${t} CASCADE;\n`;
  }

  sqlDump += `\n-- ============================================================================
-- STEP 2: CREATE TABLES, CONSTRAINTS & INDEXES
-- ============================================================================
${DDL_STATEMENTS}
\n-- ============================================================================
-- STEP 3: MIGRATE / INSERT DATA
-- ============================================================================
`;

  // Apply DDL on PostgreSQL directly
  console.log("Creating tables and constraints in PostgreSQL...");
  // Drop tables first on live PG
  for (const t of reverseTables) {
    await pgClient.query(`DROP TABLE IF EXISTS ${t} CASCADE;`);
  }
  await pgClient.query(DDL_STATEMENTS);
  console.log("DDL executed successfully in PostgreSQL.");

  // 3. Extract data from MySQL, generate INSERT statements, and insert into PostgreSQL
  for (const tableName of TABLES_ORDER) {
    console.log(`Exporting table: ${tableName}...`);
    const [rows] = await mysqlConn.query(`SELECT * FROM ${tableName}`);
    console.log(`  Found ${rows.length} rows in ${tableName}`);

    if (rows.length > 0) {
      const columns = Object.keys(rows[0]);
      const colList = columns.map((c) => `"${c}"`).join(", ");

      sqlDump += `\n-- Data for table: ${tableName} (${rows.length} rows)\n`;
      sqlDump += `INSERT INTO ${tableName} (${colList}) VALUES\n`;

      const valuesChunks = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const valList = columns.map((col) => sqlEscape(row[col])).join(", ");
        valuesChunks.push(`  (${valList})`);

        // Also insert row directly into PostgreSQL
        const pgPlaceholders = columns.map((_, idx) => `$${idx + 1}`).join(", ");
        const pgValues = columns.map((col) => {
          const v = row[col];
          if (v instanceof Date) return v.toISOString();
          return v;
        });
        await pgClient.query(
          `INSERT INTO ${tableName} (${colList}) VALUES (${pgPlaceholders})`,
          pgValues
        );
      }

      sqlDump += valuesChunks.join(",\n") + ";\n";
    }

    // Reset sequence to max(id) + 1
    sqlDump += `SELECT setval(pg_get_serial_sequence('${tableName}', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM ${tableName};\n`;
    await pgClient.query(
      `SELECT setval(pg_get_serial_sequence('${tableName}', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM ${tableName};`
    );
  }

  sqlDump += `\n-- ============================================================================
-- STEP 4: VERIFICATION SUMMARY QUERY
-- ============================================================================
SELECT 
    table_name, 
    (xpath('/row/cnt/text()', xml_count))[1]::text::int as row_count
FROM (
    SELECT 
        table_name, 
        query_to_xml(format('SELECT count(*) as cnt FROM %I', table_name), false, true, '') as xml_count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
) t
ORDER BY table_name;
`;

  // 4. Save SQL file in both backend and project root
  const backendFilePath = path.join(__dirname, "..", "zygene_pgadmin_setup.sql");
  const rootFilePath = path.join(__dirname, "..", "..", "zygene_pgadmin_setup.sql");

  fs.writeFileSync(backendFilePath, sqlDump, "utf8");
  fs.writeFileSync(rootFilePath, sqlDump, "utf8");
  console.log(`Saved pgAdmin setup SQL file to:\n  -> ${backendFilePath}\n  -> ${rootFilePath}`);

  // 5. Verify PostgreSQL row counts
  console.log("\n=== PostgreSQL Migration Verification ===");
  for (const tableName of TABLES_ORDER) {
    const res = await pgClient.query(`SELECT COUNT(*) as count FROM ${tableName}`);
    console.log(`  Table [${tableName}]: ${res.rows[0].count} rows`);
  }

  await mysqlConn.end();
  await pgClient.end();
  console.log("\n=== Migration Completed Successfully! ===");
}

runMigration().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
