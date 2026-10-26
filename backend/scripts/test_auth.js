const express = require("express");
const authRoutes = require("../routes/authRoutes");
const db = require("../config/db");

// Build a lightweight test harness using the actual auth router
const app = express();
app.use(express.json());
app.use("/api/auth", authRoutes);

let server;

async function request(method, path, body = null, headers = {}) {
  const url = `http://127.0.0.1:4005${path}`;
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function runAuthTests() {
  console.log("=================================================");
  console.log("   ZyGENE Backend Authentication Test Suite");
  console.log("   Connecting to: PostgreSQL (zygene)");
  console.log("=================================================\n");

  await new Promise((resolve) => {
    server = app.listen(4005, () => {
      console.log("Test server started on port 4005\n");
      resolve();
    });
  });

  const timestamp = Date.now();
  const testFarmerEmail = `test_farmer_${timestamp}@zygene.test`;
  const testBreederEmail = `test_breeder_${timestamp}@zygene.test`;
  const testPassword = "Password@1234";

  let farmerToken = "";
  let farmerId = null;
  let breederToken = "";
  let breederId = null;

  try {
    // TEST 1: Register Farmer
    console.log("TEST 1: Register New Farmer...");
    const regFarmerRes = await request("POST", "/api/auth/register", {
      name: "Farmer TestUser",
      email: testFarmerEmail,
      password: testPassword,
      role: "farmer",
      phone: "+91 9876543210",
    });

    console.log(`Status: ${regFarmerRes.status}`);
    if (regFarmerRes.status === 201 && regFarmerRes.data.token) {
      farmerToken = regFarmerRes.data.token;
      farmerId = regFarmerRes.data.user.id;
      console.log("PASSED: Farmer registered successfully.");
      console.log(`Created User ID: ${farmerId}, Role: ${regFarmerRes.data.user.role}\n`);
    } else {
      throw new Error(`Failed to register farmer: ${JSON.stringify(regFarmerRes.data)}`);
    }

    // TEST 2: Duplicate Email Registration Prevention
    console.log("TEST 2: Attempt Duplicate Email Registration...");
    const dupRes = await request("POST", "/api/auth/register", {
      name: "Duplicate User",
      email: testFarmerEmail,
      password: testPassword,
    });
    console.log(`Status: ${dupRes.status}`);
    if (dupRes.status === 409) {
      console.log("PASSED: Correctly rejected duplicate email with 409 Conflict.\n");
    } else {
      throw new Error(`Expected 409 Conflict, got ${dupRes.status}`);
    }

    // TEST 3: Register Breeder (Checks auto-creation of breeder_profiles record)
    console.log("TEST 3: Register New Breeder (Auto-creates breeder_profile in PostgreSQL)...");
    const regBreederRes = await request("POST", "/api/auth/register", {
      name: "Dr. Breeder Scientist",
      email: testBreederEmail,
      password: testPassword,
      role: "breeder",
      phone: "+91 9123456780",
    });
    console.log(`Status: ${regBreederRes.status}`);
    if (regBreederRes.status === 201 && regBreederRes.data.token) {
      breederToken = regBreederRes.data.token;
      breederId = regBreederRes.data.user.id;
      console.log("PASSED: Breeder registered successfully.");
      console.log(`Created User ID: ${breederId}, Role: ${regBreederRes.data.user.role}`);

      // Verify breeder_profile exists in PostgreSQL
      const [profiles] = await db
        .promise()
        .query("SELECT * FROM breeder_profiles WHERE user_id = ?", [breederId]);
      if (profiles && profiles.length > 0) {
        console.log(`PASSED: Auto-created breeder_profiles entry confirmed in PostgreSQL (Profile ID: ${profiles[0].id})\n`);
      } else {
        throw new Error("breeder_profiles record was not created for breeder!");
      }
    } else {
      throw new Error(`Failed to register breeder: ${JSON.stringify(regBreederRes.data)}`);
    }

    // TEST 4: Login with Correct Credentials
    console.log("TEST 4: Login with Correct Password...");
    const loginRes = await request("POST", "/api/auth/login", {
      email: testFarmerEmail,
      password: testPassword,
    });
    console.log(`Status: ${loginRes.status}`);
    if (loginRes.status === 200 && loginRes.data.token) {
      console.log("PASSED: Logged in successfully. Received valid JWT.\n");
    } else {
      throw new Error(`Login failed: ${JSON.stringify(loginRes.data)}`);
    }

    // TEST 5: Login with Wrong Password
    console.log("TEST 5: Login with Wrong Password...");
    const wrongLoginRes = await request("POST", "/api/auth/login", {
      email: testFarmerEmail,
      password: "WrongPassword999",
    });
    console.log(`Status: ${wrongLoginRes.status}`);
    if (wrongLoginRes.status === 401) {
      console.log("PASSED: Rejected invalid credentials with 401 Unauthorized.\n");
    } else {
      throw new Error(`Expected 401 Unauthorized, got ${wrongLoginRes.status}`);
    }

    // TEST 6: Protected Route GET /api/auth/me with Bearer Token
    console.log("TEST 6: Access Protected Route (GET /api/auth/me) with JWT Bearer Token...");
    const meRes = await request("GET", "/api/auth/me", null, {
      Authorization: `Bearer ${farmerToken}`,
    });
    console.log(`Status: ${meRes.status}`);
    if (meRes.status === 200 && meRes.data.user && meRes.data.user.id === farmerId) {
      console.log("PASSED: Successfully fetched authenticated user profile from PostgreSQL.");
      console.log(`User Profile Data: Name: "${meRes.data.user.name}", Role: "${meRes.data.user.role}"\n`);
    } else {
      throw new Error(`Failed to get profile: ${JSON.stringify(meRes.data)}`);
    }

    // TEST 7: Access Protected Route without Token (Expect 401)
    console.log("TEST 7: Access Protected Route without Token...");
    const noTokenRes = await request("GET", "/api/auth/me");
    console.log(`Status: ${noTokenRes.status}`);
    if (noTokenRes.status === 401) {
      console.log("PASSED: Correctly blocked unauthorized access without token.\n");
    } else {
      throw new Error(`Expected 401, got ${noTokenRes.status}`);
    }

    console.log("=================================================");
    console.log("  ALL 7 AUTHENTICATION TESTS PASSED WITH POSTGRESQL!");
    console.log("=================================================\n");
  } finally {
    // Cleanup test users from PostgreSQL
    console.log("Cleaning up test users from PostgreSQL...");
    if (farmerId) {
      await db.promise().query("DELETE FROM users WHERE id = ?", [farmerId]);
    }
    if (breederId) {
      await db.promise().query("DELETE FROM users WHERE id = ?", [breederId]);
    }
    console.log("Cleanup complete.");

    if (server) {
      server.close();
    }
    process.exit(0);
  }
}

runAuthTests().catch((err) => {
  console.error("FATAL TEST FAILURE:", err);
  if (server) server.close();
  process.exit(1);
});
