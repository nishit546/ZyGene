import API from "./api";
import {
  getDatabase,
  generateLocalId,
  saveLocalRecord,
  updateLocalRecordServerId,
  updateLocalRecordStatus,
  setSyncMetadata,
  getSyncMetadata,
} from "./offlineStorage";
import NetInfo from "@react-native-community/netinfo";
import * as FileSystem from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";

// In-memory sync lock to avoid parallel execution
let isSyncing = false;
const listeners = new Set();

/**
 * Register a listener for sync state changes.
 */
export const subscribeSyncEvents = (callback) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};

const notifyListeners = (event) => {
  listeners.forEach((cb) => {
    try {
      cb(event);
    } catch (e) {
      console.warn("[syncService] Listener error:", e);
    }
  });
};

/**
 * Check if device currently has active internet connectivity.
 */
export const checkOnlineStatus = async () => {
  try {
    const netState = await NetInfo.fetch();
    return Boolean(netState.isConnected && netState.isInternetReachable !== false);
  } catch {
    return false;
  }
};

/**
 * Adds an operation to the persistent SQLite synchronization queue.
 */
export const enqueueOperation = async ({
  userId,
  recordType,
  operationType = "create",
  localRecordId,
  parentLocalId = null,
  parentServerId = null,
  endpoint,
  httpMethod = "POST",
  payload,
}) => {
  const db = await getDatabase();
  const operationId = generateLocalId("op");
  const now = new Date().toISOString();

  // 1. Save locally in cached SQLite tables with 'pending' status
  await saveLocalRecord({
    userId,
    recordType,
    localId: localRecordId,
    parentLocalId,
    parentServerId,
    data: payload,
  });

  // 2. Add to persistent sync queue
  if (!db.isMock) {
    await db.runAsync(
      `INSERT INTO sync_queue (
        operation_id, user_id, record_type, operation_type,
        local_record_id, parent_local_id, parent_server_id,
        endpoint, http_method, payload_json, status, retry_count,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?);`,
      [
        operationId,
        userId,
        recordType,
        operationType,
        localRecordId,
        parentLocalId,
        parentServerId ? String(parentServerId) : null,
        endpoint,
        httpMethod,
        JSON.stringify(payload),
        now,
      ]
    );
  }

  notifyListeners({ type: "QUEUED", recordType, localRecordId });
  return operationId;
};

/**
 * Get all sync operations for a user, sorted with pending first.
 */
export const getQueueOperations = async (userId) => {
  const db = await getDatabase();
  if (db.isMock) return [];

  const query = userId
    ? `SELECT * FROM sync_queue WHERE user_id = ? ORDER BY id ASC;`
    : `SELECT * FROM sync_queue ORDER BY id ASC;`;
  const params = userId ? [userId] : [];
  return await db.getAllAsync(query, params);
};

/**
 * Counts operations by status.
 */
export const getQueueStats = async (userId) => {
  const db = await getDatabase();
  if (db.isMock) return { pending: 0, syncing: 0, failed: 0, synced: 0 };

  const query = userId
    ? `SELECT status, COUNT(*) as count FROM sync_queue WHERE user_id = ? GROUP BY status;`
    : `SELECT status, COUNT(*) as count FROM sync_queue GROUP BY status;`;
  const params = userId ? [userId] : [];
  const rows = await db.getAllAsync(query, params);

  const stats = { pending: 0, syncing: 0, failed: 0, synced: 0 };
  rows.forEach((r) => {
    if (stats[r.status] !== undefined) {
      stats[r.status] = r.count;
    }
  });
  return stats;
};

/**
 * Helper to resolve parent server IDs for dependency ordering.
 */
const resolveParentServerId = async (db, op) => {
  if (op.parent_server_id) {
    return op.parent_server_id;
  }

  if (!op.parent_local_id) {
    return null;
  }

  // Lookup in parent tables
  if (op.record_type === "crop") {
    // Parent is field
    const field = await db.getFirstAsync(
      `SELECT id FROM cached_fields WHERE local_id = ? AND sync_status = 'synced' LIMIT 1;`,
      [op.parent_local_id]
    );
    return field && !field.id.startsWith("loc_") ? field.id : null;
  }

  if (op.record_type === "lifecycle") {
    // Parent is crop
    const crop = await db.getFirstAsync(
      `SELECT id FROM cached_crops WHERE local_id = ? AND sync_status = 'synced' LIMIT 1;`,
      [op.parent_local_id]
    );
    return crop && !crop.id.startsWith("loc_") ? crop.id : null;
  }

  // Activity records: parent is lifecycle_record
  const lc = await db.getFirstAsync(
    `SELECT id FROM cached_lifecycle_records WHERE local_id = ? AND sync_status = 'synced' LIMIT 1;`,
    [op.parent_local_id]
  );
  return lc && !lc.id.startsWith("loc_") ? lc.id : null;
};

/**
 * Dependency order rank for sorting queue operations.
 * Field (1) -> Crop (2) -> Lifecycle (3) -> Activities (4)
 */
const getDependencyRank = (recordType) => {
  switch (recordType) {
    case "field":
      return 1;
    case "crop":
      return 2;
    case "lifecycle":
      return 3;
    default:
      return 4; // measurements, photos, irrigation, treatments, disease_pest, harvest
  }
};

/**
 * Main Automatic Sync Engine.
 * Processes operations strictly according to dependency order.
 */
export const processSyncQueue = async (userId) => {
  if (isSyncing) {
    console.log("[syncService] Sync already in progress, skipping duplicate run.");
    return { status: "already_running" };
  }

  const isOnline = await checkOnlineStatus();
  if (!isOnline) {
    console.log("[syncService] Device is offline. Cannot process sync queue.");
    return { status: "offline" };
  }

  // Verify auth token exists
  const token = await AsyncStorage.getItem("token");
  if (!token) {
    console.log("[syncService] No active auth token found. Aborting sync.");
    return { status: "unauthenticated" };
  }

  const db = await getDatabase();
  if (db.isMock) return { status: "mock_skipped" };

  isSyncing = true;
  notifyListeners({ type: "SYNC_START" });

  try {
    // Retrieve pending and failed operations for this user
    const query = userId
      ? `SELECT * FROM sync_queue WHERE user_id = ? AND status IN ('pending', 'failed') ORDER BY id ASC;`
      : `SELECT * FROM sync_queue WHERE status IN ('pending', 'failed') ORDER BY id ASC;`;
    const params = userId ? [userId] : [];
    const operations = await db.getAllAsync(query, params);

    if (operations.length === 0) {
      notifyListeners({ type: "SYNC_COMPLETE", count: 0 });
      return { status: "complete", count: 0 };
    }

    // Sort by dependency rank: Field -> Crop -> Lifecycle -> Activities
    operations.sort((a, b) => {
      const rankA = getDependencyRank(a.record_type);
      const rankB = getDependencyRank(b.record_type);
      if (rankA !== rankB) return rankA - rankB;
      return a.id - b.id; // FIFO order within same dependency level
    });

    let successCount = 0;
    let failedCount = 0;

    for (const op of operations) {
      // Re-verify network before each request
      const liveNet = await checkOnlineStatus();
      if (!liveNet) {
        console.log("[syncService] Connection lost mid-sync. Pausing remaining operations.");
        break;
      }

      // Check if parent dependencies are met
      let payload = JSON.parse(op.payload_json);
      let parentServerId = op.parent_server_id;

      if (op.parent_local_id && !parentServerId) {
        parentServerId = await resolveParentServerId(db, op);
        if (!parentServerId) {
          console.warn(
            `[syncService] Parent record for ${op.record_type} (local ${op.parent_local_id}) not yet synced. Postponing.`
          );
          continue;
        }
      }

      // Inject resolved parent IDs into payload
      if (op.record_type === "crop" && parentServerId) {
        payload.field_id = Number(parentServerId);
      } else if (op.record_type === "lifecycle" && parentServerId) {
        payload.crop_id = Number(parentServerId);
      } else if (op.record_type !== "field" && parentServerId) {
        // Activity record
        payload.lifecycle_record_id = Number(parentServerId);
      }

      // Mark operation as syncing
      await db.runAsync(`UPDATE sync_queue SET status = 'syncing' WHERE id = ?;`, [op.id]);
      notifyListeners({ type: "ITEM_SYNCING", opId: op.operation_id });

      try {
        // For photos: check if we need to encode local image file into base64 or prepare payload
        if (op.record_type === "photo" && payload.image_url) {
          const imgUri = payload.image_url;
          if (imgUri.startsWith("file://") || imgUri.startsWith("/")) {
            try {
              const base64Data = await FileSystem.readAsStringAsync(imgUri, {
                encoding: FileSystem.EncodingType?.Base64 || "base64",
              });
              payload.image_url = `data:image/jpeg;base64,${base64Data}`;
            } catch (fileErr) {
              console.warn("[syncService] Could not read local photo file:", fileErr);
            }
          }
        }

        // Send API request with idempotency key header
        const res = await API({
          method: op.http_method,
          url: op.endpoint,
          data: payload,
          headers: {
            "X-Operation-Id": op.operation_id,
            "X-Idempotency-Key": op.operation_id,
          },
        });

        // Resolve returned server ID
        let serverId = null;
        if (op.record_type === "field") {
          serverId = res.data?.field?.id;
        } else if (op.record_type === "crop") {
          serverId = res.data?.crop?.id;
        } else if (op.record_type === "lifecycle") {
          serverId = res.data?.lifecycle?.id;
        } else if (op.record_type === "measurement") {
          serverId = res.data?.measurement?.id;
        } else if (op.record_type === "photo") {
          serverId = res.data?.photo?.id;
        } else if (op.record_type === "irrigation") {
          serverId = res.data?.irrigation?.id;
        } else if (op.record_type === "treatment") {
          serverId = res.data?.treatment?.id;
        } else if (op.record_type === "disease_pest") {
          serverId = res.data?.observation?.id;
        } else if (op.record_type === "harvest") {
          serverId = res.data?.harvest?.id;
        }

        const now = new Date().toISOString();

        // Mark operation as synced
        await db.runAsync(
          `UPDATE sync_queue SET status = 'synced', synced_at = ?, last_error = NULL WHERE id = ?;`,
          [now, op.id]
        );

        // Update local SQLite record with server ID and synced status
        if (serverId) {
          await updateLocalRecordServerId({
            recordType: op.record_type,
            localId: op.local_record_id,
            serverId,
          });
        } else {
          await updateLocalRecordStatus(op.record_type, op.local_record_id, "synced");
        }

        successCount++;
        notifyListeners({ type: "ITEM_SYNCED", opId: op.operation_id, serverId });
      } catch (reqError) {
        const errorDesc =
          reqError.response?.data?.message || reqError.message || "Network request failed";
        const isNetworkErr = !reqError.response;

        console.error(`[syncService] Sync error for ${op.record_type}:`, errorDesc);

        if (isNetworkErr) {
          // Keep as pending for automatic retry on reconnect
          await db.runAsync(
            `UPDATE sync_queue SET status = 'pending', retry_count = retry_count + 1, last_error = ? WHERE id = ?;`,
            [errorDesc, op.id]
          );
          break; // Stop further requests if offline
        } else {
          // Server returned 4xx or 5xx: mark as failed, store description, allow retry
          await db.runAsync(
            `UPDATE sync_queue SET status = 'failed', retry_count = retry_count + 1, last_error = ? WHERE id = ?;`,
            [errorDesc, op.id]
          );
          await updateLocalRecordStatus(op.record_type, op.local_record_id, "failed");
          failedCount++;
          notifyListeners({ type: "ITEM_FAILED", opId: op.operation_id, error: errorDesc });
        }
      }
    }

    const now = new Date().toISOString();
    await setSyncMetadata("last_successful_sync", now);

    notifyListeners({
      type: "SYNC_COMPLETE",
      successCount,
      failedCount,
      lastSync: now,
    });

    return { status: "complete", successCount, failedCount };
  } finally {
    isSyncing = false;
  }
};

/**
 * Retries all failed operations.
 */
export const retryFailedOperations = async (userId) => {
  const db = await getDatabase();
  if (db.isMock) return;

  const query = userId
    ? `UPDATE sync_queue SET status = 'pending' WHERE user_id = ? AND status = 'failed';`
    : `UPDATE sync_queue SET status = 'pending' WHERE status = 'failed';`;
  const params = userId ? [userId] : [];
  await db.runAsync(query, params);

  return await processSyncQueue(userId);
};

/**
 * Retries a specific operation by its operation ID.
 */
export const retrySpecificOperation = async (operationId, userId) => {
  const db = await getDatabase();
  if (db.isMock) return;

  await db.runAsync(
    `UPDATE sync_queue SET status = 'pending' WHERE operation_id = ?;`,
    [operationId]
  );

  return await processSyncQueue(userId);
};

/**
 * Checks if there are unsynchronized records before user logout.
 */
export const checkUnsyncedRecordsOnLogout = async (userId) => {
  const stats = await getQueueStats(userId);
  return stats.pending > 0 || stats.failed > 0 || stats.syncing > 0;
};
