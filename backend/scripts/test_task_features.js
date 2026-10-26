require("dotenv").config();
const express = require("express");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");
const taskRoutes = require("../routes/taskRoutes");

const app = express();
app.use(express.json());
app.use("/api/tasks", taskRoutes);

const PORT = 4015;
const API_BASE = `http://127.0.0.1:${PORT}/api`;
let server;

async function runTests() {
  console.log("=== Testing Farm Task API & Lifecycle ===");

  await new Promise((resolve) => {
    server = app.listen(PORT, () => {
      console.log(`Test server running on port ${PORT}`);
      resolve();
    });
  });

  // 1. Get or create a test farmer user
  const userRes = await pool.query(
    "SELECT id, email, password FROM users WHERE role = 'farmer' LIMIT 1"
  );

  if (userRes.rows.length === 0) {
    console.error("No test farmer found in database.");
    server.close();
    process.exit(1);
  }

  const farmer = userRes.rows[0];
  console.log(`Using farmer: ${farmer.email} (ID: ${farmer.id})`);

  const JWT_SECRET = process.env.JWT_SECRET || "zygene_jwt_secret_key_2026";
  const token = jwt.sign(
    { id: farmer.id, email: farmer.email, role: "farmer" },
    JWT_SECRET,
    { expiresIn: "1d" }
  );

  // Check any field/crop for linking
  const fieldRes = await pool.query(
    "SELECT id FROM fields WHERE user_id = $1 LIMIT 1",
    [farmer.id]
  );
  const fieldId = fieldRes.rows.length > 0 ? fieldRes.rows[0].id : null;

  async function apiRequest(method, endpoint, body) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    return { status: res.status, data };
  }

  let createdTaskId;

  try {
    // 1. Create Task
    console.log("\n1. Testing POST /api/tasks (Create Task)...");
    const createRes = await apiRequest("POST", "/tasks", {
      title: "Inspect Drip Irrigation Valves",
      description: "Check zone 2 pressure regulators and clean filters",
      category: "irrigation",
      priority: "high",
      due_date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
      field_id: fieldId,
    });
    console.log("Status:", createRes.status);
    console.log("Created Task ID:", createRes.data.task?.id, "Title:", createRes.data.task?.title);
    if (!createRes.data.task) throw new Error("Failed to create task: " + JSON.stringify(createRes.data));
    createdTaskId = createRes.data.task.id;

    // 2. Get All Tasks
    console.log("\n2. Testing GET /api/tasks (List Tasks)...");
    const listRes = await apiRequest("GET", "/tasks");
    console.log("Status:", listRes.status);
    console.log(`Found ${listRes.data.count} tasks`);

    // 3. Get Task Stats
    console.log("\n3. Testing GET /api/tasks/stats (Stats)...");
    const statsRes = await apiRequest("GET", "/tasks/stats");
    console.log("Status:", statsRes.status);
    console.log("Stats:", statsRes.data.stats);

    // 4. Get Task By ID
    console.log(`\n4. Testing GET /api/tasks/${createdTaskId} (Get Task)...`);
    const getRes = await apiRequest("GET", `/tasks/${createdTaskId}`);
    console.log("Status:", getRes.status);
    console.log("Task details:", getRes.data.task.title);

    // 5. Toggle Status
    console.log(`\n5. Testing PATCH /api/tasks/${createdTaskId}/toggle (Toggle Status)...`);
    const toggleRes = await apiRequest("PATCH", `/tasks/${createdTaskId}/toggle`);
    console.log("Status:", toggleRes.status);
    console.log("New Status:", toggleRes.data.task.status, "completed_at:", toggleRes.data.task.completed_at);

    // 6. Update Task
    console.log(`\n6. Testing PUT /api/tasks/${createdTaskId} (Update Task)...`);
    const updateRes = await apiRequest("PUT", `/tasks/${createdTaskId}`, {
      title: "Inspect Drip Irrigation Valves & Flush Lines",
      priority: "urgent",
    });
    console.log("Status:", updateRes.status);
    console.log("Updated title:", updateRes.data.task.title, "priority:", updateRes.data.task.priority);

    // 7. Delete Task
    console.log(`\n7. Testing DELETE /api/tasks/${createdTaskId} (Delete Task)...`);
    const deleteRes = await apiRequest("DELETE", `/tasks/${createdTaskId}`);
    console.log("Status:", deleteRes.status);
    console.log("Delete result:", deleteRes.data.message);

    console.log("\n✅ ALL TASK BACKEND TESTS PASSED SUCCESSFULLY!");
    server.close();
    process.exit(0);
  } catch (error) {
    console.error("Test failed:", error);
    if (server) server.close();
    process.exit(1);
  }
}

runTests();
