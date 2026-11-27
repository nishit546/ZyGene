import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DB_NAME = "zygene_offline.db";
let dbInstance = null;

/**
 * Helper to generate unique stable local identifiers.
 */
export const generateLocalId = (prefix = "loc") => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${randomStr}`;
};

/**
 * Initializes and returns the SQLite database instance.
 */
export const getDatabase = async () => {
  if (dbInstance) {
    return dbInstance;
  }

  try {
    if (Platform.OS === "web") {
      // expo-sqlite has experimental web support; wrap in try/catch
      try {
        dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
      } catch (webErr) {
        console.warn("[offlineStorage] SQLite open on web fell back to memory mock:", webErr);
        dbInstance = createWebMockDatabase();
      }
    } else {
      dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
    }

    await initSchema(dbInstance);
    return dbInstance;
  } catch (error) {
    console.error("[offlineStorage] Failed to initialize SQLite database:", error);
    // Return memory fallback so app does not crash
    dbInstance = createWebMockDatabase();
    await initSchema(dbInstance);
    return dbInstance;
  }
};

/**
 * In-memory fallback mock for environments without native SQLite (e.g. basic web without WASM)
 */
function createWebMockDatabase() {
  const memoryStore = new Map();
  return {
    isMock: true,
    execAsync: async (sql) => {
      // basic statement runner
      return;
    },
    runAsync: async (sql, params = []) => {
      return { lastInsertRowId: 1, changes: 1 };
    },
    getAllAsync: async (sql, params = []) => {
      return [];
    },
    getFirstAsync: async (sql, params = []) => {
      return null;
    },
  };
}

/**
 * Creates all required local tables and indexes.
 */
async function initSchema(db) {
  if (db.isMock) return;

  const createTablesSql = `
    PRAGMA journal_mode = WAL;

    -- 1. Cached Fields
    CREATE TABLE IF NOT EXISTS cached_fields (
      id TEXT PRIMARY KEY,
      local_id TEXT UNIQUE NOT NULL,
      user_id INTEGER,
      field_name TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      area REAL,
      area_unit TEXT,
      soil_type TEXT,
      location_name TEXT,
      notes TEXT,
      sync_status TEXT DEFAULT 'synced',
      created_at TEXT,
      updated_at TEXT
    );

    -- 2. Cached Crops
    CREATE TABLE IF NOT EXISTS cached_crops (
      id TEXT PRIMARY KEY,
      local_id TEXT UNIQUE NOT NULL,
      user_id INTEGER,
      field_id TEXT NOT NULL,
      field_name TEXT,
      crop_name TEXT NOT NULL,
      variety TEXT,
      sowing_date TEXT,
      expected_harvest_date TEXT,
      crop_status TEXT DEFAULT 'active',
      notes TEXT,
      sync_status TEXT DEFAULT 'synced',
      created_at TEXT,
      updated_at TEXT
    );

    -- 3. Cached Lifecycle Records
    CREATE TABLE IF NOT EXISTS cached_lifecycle_records (
      id TEXT PRIMARY KEY,
      local_id TEXT UNIQUE NOT NULL,
      user_id INTEGER,
      crop_id TEXT NOT NULL,
      stage TEXT NOT NULL,
      record_date TEXT NOT NULL,
      record_time TEXT,
      latitude REAL,
      longitude REAL,
      notes TEXT,
      sync_status TEXT DEFAULT 'synced',
      created_at TEXT
    );

    -- 4. Cached Activities (measurements, photos, irrigation, treatments, disease-pests, harvests)
    CREATE TABLE IF NOT EXISTS cached_activities (
      id TEXT PRIMARY KEY,
      local_id TEXT UNIQUE NOT NULL,
      user_id INTEGER,
      activity_type TEXT NOT NULL,
      lifecycle_record_id TEXT NOT NULL,
      data_json TEXT NOT NULL,
      sync_status TEXT DEFAULT 'synced',
      created_at TEXT
    );

    -- 5. Synchronization Queue
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operation_id TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      record_type TEXT NOT NULL,
      operation_type TEXT NOT NULL,
      local_record_id TEXT NOT NULL,
      parent_local_id TEXT,
      parent_server_id TEXT,
      endpoint TEXT NOT NULL,
      http_method TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      retry_count INTEGER DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL,
      synced_at TEXT
    );

    -- 6. Synchronization Metadata (e.g., last_sync_time, app_sync_version)
    CREATE TABLE IF NOT EXISTS sync_metadata (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_sync_queue_user_status ON sync_queue (user_id, status);
    CREATE INDEX IF NOT EXISTS idx_cached_crops_field ON cached_crops (field_id);
    CREATE INDEX IF NOT EXISTS idx_cached_lifecycle_crop ON cached_lifecycle_records (crop_id);
    CREATE INDEX IF NOT EXISTS idx_cached_activities_lifecycle ON cached_activities (lifecycle_record_id, activity_type);
  `;

  await db.execAsync(createTablesSql);
}

// ==========================================
// CACHE FIELDS
// ==========================================

export const cacheFields = async (userId, fields = []) => {
  const db = await getDatabase();
  if (db.isMock) return;

  for (const f of fields) {
    const id = String(f.id);
    const localId = f.local_id || id;
    await db.runAsync(
      `INSERT INTO cached_fields (
        id, local_id, user_id, field_name, latitude, longitude, area, area_unit, soil_type, location_name, notes, sync_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        field_name=excluded.field_name,
        latitude=excluded.latitude,
        longitude=excluded.longitude,
        area=excluded.area,
        area_unit=excluded.area_unit,
        soil_type=excluded.soil_type,
        location_name=excluded.location_name,
        notes=excluded.notes,
        sync_status=CASE WHEN cached_fields.sync_status = 'pending' THEN 'pending' ELSE 'synced' END,
        updated_at=excluded.updated_at;`,
      [
        id,
        localId,
        userId || null,
        f.field_name,
        f.latitude ?? null,
        f.longitude ?? null,
        f.area ?? null,
        f.area_unit ?? null,
        f.soil_type ?? null,
        f.location_name ?? null,
        f.notes ?? null,
        f.created_at || new Date().toISOString(),
        f.updated_at || new Date().toISOString(),
      ]
    );
  }
};

export const getCachedFields = async (userId) => {
  const db = await getDatabase();
  if (db.isMock) return [];

  const query = userId
    ? `SELECT * FROM cached_fields WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC;`
    : `SELECT * FROM cached_fields ORDER BY created_at DESC;`;
  const params = userId ? [userId] : [];
  return await db.getAllAsync(query, params);
};

export const getCachedFieldById = async (fieldId) => {
  const db = await getDatabase();
  if (db.isMock) return null;

  return await db.getFirstAsync(
    `SELECT * FROM cached_fields WHERE id = ? OR local_id = ? LIMIT 1;`,
    [String(fieldId), String(fieldId)]
  );
};

// ==========================================
// CACHE CROPS
// ==========================================

export const cacheCrops = async (userId, crops = []) => {
  const db = await getDatabase();
  if (db.isMock) return;

  for (const c of crops) {
    const id = String(c.id);
    const localId = c.local_id || id;
    await db.runAsync(
      `INSERT INTO cached_crops (
        id, local_id, user_id, field_id, field_name, crop_name, variety, sowing_date, expected_harvest_date, crop_status, notes, sync_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        field_id=excluded.field_id,
        field_name=excluded.field_name,
        crop_name=excluded.crop_name,
        variety=excluded.variety,
        sowing_date=excluded.sowing_date,
        expected_harvest_date=excluded.expected_harvest_date,
        crop_status=excluded.crop_status,
        notes=excluded.notes,
        sync_status=CASE WHEN cached_crops.sync_status = 'pending' THEN 'pending' ELSE 'synced' END,
        updated_at=excluded.updated_at;`,
      [
        id,
        localId,
        userId || null,
        String(c.field_id),
        c.field_name || null,
        c.crop_name,
        c.variety || null,
        c.sowing_date || null,
        c.expected_harvest_date || null,
        c.crop_status || c.states || "active",
        c.notes || null,
        c.created_at || new Date().toISOString(),
        c.updated_at || new Date().toISOString(),
      ]
    );
  }
};

export const getCachedCrops = async (userId, fieldId = null) => {
  const db = await getDatabase();
  if (db.isMock) return [];

  let query = `SELECT * FROM cached_crops WHERE 1=1`;
  const params = [];

  if (userId) {
    query += ` AND (user_id = ? OR user_id IS NULL)`;
    params.push(userId);
  }
  if (fieldId) {
    query += ` AND (field_id = ? OR field_id IN (SELECT local_id FROM cached_fields WHERE id = ?))`;
    params.push(String(fieldId), String(fieldId));
  }
  query += ` ORDER BY created_at DESC;`;

  return await db.getAllAsync(query, params);
};

export const getCachedCropById = async (cropId) => {
  const db = await getDatabase();
  if (db.isMock) return null;

  return await db.getFirstAsync(
    `SELECT * FROM cached_crops WHERE id = ? OR local_id = ? LIMIT 1;`,
    [String(cropId), String(cropId)]
  );
};

// ==========================================
// CACHE LIFECYCLE RECORDS
// ==========================================

export const cacheLifecycleRecords = async (userId, cropId, records = []) => {
  const db = await getDatabase();
  if (db.isMock) return;

  for (const r of records) {
    const id = String(r.id);
    const localId = r.local_id || id;
    await db.runAsync(
      `INSERT INTO cached_lifecycle_records (
        id, local_id, user_id, crop_id, stage, record_date, record_time, latitude, longitude, notes, sync_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)
      ON CONFLICT(id) DO UPDATE SET
        stage=excluded.stage,
        record_date=excluded.record_date,
        record_time=excluded.record_time,
        latitude=excluded.latitude,
        longitude=excluded.longitude,
        notes=excluded.notes,
        sync_status=CASE WHEN cached_lifecycle_records.sync_status = 'pending' THEN 'pending' ELSE 'synced' END;`,
      [
        id,
        localId,
        userId || null,
        String(r.crop_id || cropId),
        r.stage,
        r.record_date,
        r.record_time || null,
        r.latitude ?? null,
        r.longitude ?? null,
        r.notes || null,
        r.created_at || new Date().toISOString(),
      ]
    );
  }
};

export const getCachedLifecycleRecords = async (cropId) => {
  const db = await getDatabase();
  if (db.isMock) return [];

  return await db.getAllAsync(
    `SELECT * FROM cached_lifecycle_records 
     WHERE crop_id = ? OR crop_id IN (SELECT local_id FROM cached_crops WHERE id = ?)
     ORDER BY record_date ASC, created_at ASC;`,
    [String(cropId), String(cropId)]
  );
};

// ==========================================
// CACHE ACTIVITIES (measurements, photos, etc.)
// ==========================================

export const cacheActivities = async (userId, lifecycleRecordId, activityType, items = []) => {
  const db = await getDatabase();
  if (db.isMock) return;

  for (const item of items) {
    const id = String(item.id);
    const localId = item.local_id || id;
    await db.runAsync(
      `INSERT INTO cached_activities (
        id, local_id, user_id, activity_type, lifecycle_record_id, data_json, sync_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'synced', ?)
      ON CONFLICT(id) DO UPDATE SET
        data_json=excluded.data_json,
        sync_status=CASE WHEN cached_activities.sync_status = 'pending' THEN 'pending' ELSE 'synced' END;`,
      [
        id,
        localId,
        userId || null,
        activityType,
        String(lifecycleRecordId),
        JSON.stringify(item),
        item.created_at || new Date().toISOString(),
      ]
    );
  }
};

export const getCachedActivities = async (lifecycleRecordId, activityType) => {
  const db = await getDatabase();
  if (db.isMock) return [];

  const rows = await db.getAllAsync(
    `SELECT * FROM cached_activities 
     WHERE (lifecycle_record_id = ? OR lifecycle_record_id IN (SELECT local_id FROM cached_lifecycle_records WHERE id = ?))
       AND activity_type = ?
     ORDER BY created_at ASC;`,
    [String(lifecycleRecordId), String(lifecycleRecordId), activityType]
  );

  return rows.map((r) => {
    try {
      const parsed = JSON.parse(r.data_json);
      return {
        ...parsed,
        id: r.id,
        local_id: r.local_id,
        sync_status: r.sync_status,
      };
    } catch {
      return {
        id: r.id,
        local_id: r.local_id,
        sync_status: r.sync_status,
      };
    }
  });
};

// ==========================================
// SAVE LOCAL (OFFLINE CREATION)
// ==========================================

export const saveLocalRecord = async ({
  userId,
  recordType,
  localId,
  parentLocalId,
  parentServerId,
  data,
}) => {
  const db = await getDatabase();
  const now = new Date().toISOString();

  if (recordType === "field") {
    await db.runAsync(
      `INSERT INTO cached_fields (
        id, local_id, user_id, field_name, latitude, longitude, area, area_unit, soil_type, location_name, notes, sync_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?);`,
      [
        localId,
        localId,
        userId,
        data.field_name,
        data.latitude ?? null,
        data.longitude ?? null,
        data.area ?? null,
        data.area_unit ?? null,
        data.soil_type ?? null,
        data.location_name ?? null,
        data.notes ?? null,
        now,
        now,
      ]
    );
  } else if (recordType === "crop") {
    await db.runAsync(
      `INSERT INTO cached_crops (
        id, local_id, user_id, field_id, field_name, crop_name, variety, sowing_date, expected_harvest_date, crop_status, notes, sync_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?);`,
      [
        localId,
        localId,
        userId,
        String(parentServerId || parentLocalId || data.field_id),
        data.field_name || null,
        data.crop_name,
        data.variety || null,
        data.sowing_date || null,
        data.expected_harvest_date || null,
        data.crop_status || "active",
        data.notes || null,
        now,
        now,
      ]
    );
  } else if (recordType === "lifecycle") {
    await db.runAsync(
      `INSERT INTO cached_lifecycle_records (
        id, local_id, user_id, crop_id, stage, record_date, record_time, latitude, longitude, notes, sync_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?);`,
      [
        localId,
        localId,
        userId,
        String(parentServerId || parentLocalId || data.crop_id),
        data.stage,
        data.record_date,
        data.record_time || null,
        data.latitude ?? null,
        data.longitude ?? null,
        data.notes || null,
        now,
      ]
    );
  } else {
    // Activity records
    const activityData = { ...data, id: localId, local_id: localId, sync_status: "pending" };
    await db.runAsync(
      `INSERT INTO cached_activities (
        id, local_id, user_id, activity_type, lifecycle_record_id, data_json, sync_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?);`,
      [
        localId,
        localId,
        userId,
        recordType,
        String(parentServerId || parentLocalId || data.lifecycle_record_id),
        JSON.stringify(activityData),
        now,
      ]
    );
  }
};

/**
 * Updates a local record after server returns real ID.
 */
export const updateLocalRecordServerId = async ({
  recordType,
  localId,
  serverId,
}) => {
  const db = await getDatabase();
  const serverIdStr = String(serverId);

  if (recordType === "field") {
    await db.runAsync(
      `UPDATE cached_fields SET id = ?, sync_status = 'synced' WHERE local_id = ?;`,
      [serverIdStr, localId]
    );
    // Also update any child crops pointing to this local field ID
    await db.runAsync(
      `UPDATE cached_crops SET field_id = ? WHERE field_id = ?;`,
      [serverIdStr, localId]
    );
    await db.runAsync(
      `UPDATE sync_queue SET parent_server_id = ? WHERE parent_local_id = ?;`,
      [serverIdStr, localId]
    );
  } else if (recordType === "crop") {
    await db.runAsync(
      `UPDATE cached_crops SET id = ?, sync_status = 'synced' WHERE local_id = ?;`,
      [serverIdStr, localId]
    );
    // Update child lifecycle records pointing to local crop ID
    await db.runAsync(
      `UPDATE cached_lifecycle_records SET crop_id = ? WHERE crop_id = ?;`,
      [serverIdStr, localId]
    );
    await db.runAsync(
      `UPDATE sync_queue SET parent_server_id = ? WHERE parent_local_id = ?;`,
      [serverIdStr, localId]
    );
  } else if (recordType === "lifecycle") {
    await db.runAsync(
      `UPDATE cached_lifecycle_records SET id = ?, sync_status = 'synced' WHERE local_id = ?;`,
      [serverIdStr, localId]
    );
    // Update child activities pointing to local lifecycle ID
    await db.runAsync(
      `UPDATE cached_activities SET lifecycle_record_id = ? WHERE lifecycle_record_id = ?;`,
      [serverIdStr, localId]
    );
    await db.runAsync(
      `UPDATE sync_queue SET parent_server_id = ? WHERE parent_local_id = ?;`,
      [serverIdStr, localId]
    );
  } else {
    // Activity records
    await db.runAsync(
      `UPDATE cached_activities SET id = ?, sync_status = 'synced' WHERE local_id = ?;`,
      [serverIdStr, localId]
    );
  }
};

/**
 * Updates status of a local record (e.g. 'failed' or 'pending').
 */
export const updateLocalRecordStatus = async (recordType, localId, syncStatus) => {
  const db = await getDatabase();
  if (recordType === "field") {
    await db.runAsync(`UPDATE cached_fields SET sync_status = ? WHERE local_id = ?;`, [syncStatus, localId]);
  } else if (recordType === "crop") {
    await db.runAsync(`UPDATE cached_crops SET sync_status = ? WHERE local_id = ?;`, [syncStatus, localId]);
  } else if (recordType === "lifecycle") {
    await db.runAsync(`UPDATE cached_lifecycle_records SET sync_status = ? WHERE local_id = ?;`, [syncStatus, localId]);
  } else {
    await db.runAsync(`UPDATE cached_activities SET sync_status = ? WHERE local_id = ?;`, [syncStatus, localId]);
  }
};

// ==========================================
// SYNC METADATA
// ==========================================

export const getSyncMetadata = async (key) => {
  const db = await getDatabase();
  if (db.isMock) return null;
  const row = await db.getFirstAsync(`SELECT value FROM sync_metadata WHERE key = ?;`, [key]);
  return row ? row.value : null;
};

export const setSyncMetadata = async (key, value) => {
  const db = await getDatabase();
  if (db.isMock) return;
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO sync_metadata (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`,
    [key, String(value), now]
  );
};
