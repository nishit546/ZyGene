const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { Pool } = require("pg");

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    }
  : {
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "postgres",
      password: String(process.env.DB_PASSWORD ?? ""),
      database: process.env.DB_NAME || "zygene",
      port: parseInt(process.env.DB_PORT || "5432", 10),
      ssl:
        process.env.DB_SSL === "true" || (process.env.DB_HOST && !process.env.DB_HOST.includes("localhost") && !process.env.DB_HOST.includes("127.0.0.1"))
          ? { rejectUnauthorized: false }
          : false,
    };

const pool = new Pool({
  ...poolConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Verify connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error("PostgreSQL connection error:", err.message);
  } else {
    const hostInfo = process.env.DATABASE_URL
      ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ":****@")
      : `${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || 5432}`;
    console.log("Connected to ZyGene Database (PostgreSQL active on " + hostInfo + ")");
    release();
  }
});

/**
 * Translates MySQL '?' placeholders to PostgreSQL '$1, $2, ...'
 * ignoring '?' inside string literals.
 */
function convertPlaceholders(sql) {
  let paramIdx = 1;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let result = "";
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    if (char === "'" && !inDoubleQuote) {
      if (sql[i - 1] !== "\\") inSingleQuote = !inSingleQuote;
      result += char;
    } else if (char === '"' && !inSingleQuote) {
      if (sql[i - 1] !== "\\") inDoubleQuote = !inDoubleQuote;
      result += char;
    } else if (char === "?" && !inSingleQuote && !inDoubleQuote) {
      result += `$${paramIdx++}`;
    } else {
      result += char;
    }
  }
  return result;
}

/**
 * Executes a PostgreSQL query with MySQL-compatible response structure
 */
function executeQuery(sql, params = []) {
  let queryText = convertPlaceholders(sql.trim());
  const isInsert = /^\s*insert\s+into\s+/i.test(queryText);
  const hasReturning = /\s+returning\s+/i.test(queryText);

  if (isInsert && !hasReturning) {
    queryText += " RETURNING id";
  }

  return pool.query(queryText, params).then((res) => {
    if (isInsert) {
      const insertId = res.rows.length > 0 && res.rows[0].id ? res.rows[0].id : null;
      return {
        insertId,
        affectedRows: res.rowCount,
        rows: res.rows,
      };
    }

    const isUpdateOrDelete = /^\s*(update|delete)\s+/i.test(queryText);
    if (isUpdateOrDelete) {
      return {
        affectedRows: res.rowCount,
        rows: res.rows,
      };
    }

    // Default SELECT: array of row objects
    return res.rows;
  });
}

/**
 * db.query(sql, [params], callback) compatibility wrapper
 */
function query(sql, paramsOrCallback, maybeCallback) {
  let params = [];
  let callback = null;

  if (typeof paramsOrCallback === "function") {
    callback = paramsOrCallback;
  } else {
    params = Array.isArray(paramsOrCallback) ? paramsOrCallback : [];
    callback = maybeCallback;
  }

  executeQuery(sql, params)
    .then((result) => {
      if (callback) {
        callback(null, result);
      }
    })
    .catch((err) => {
      if (callback) {
        callback(err);
      } else {
        console.error("Unhandled db query error:", err);
      }
    });
}

/**
 * db.promise().query(sql, [params]) compatibility wrapper
 */
function promise() {
  return {
    query: async (sql, params = []) => {
      const result = await executeQuery(sql, params);
      return [result, []];
    },
  };
}

/**
 * db.getConnection(callback) compatibility wrapper
 */
function getConnection(callback) {
  pool.connect((err, client, release) => {
    if (err) {
      return callback(err);
    }
    const connectionWrapper = {
      query: (sql, p, cb) => query(sql, p, cb),
      release: () => release(),
    };
    callback(null, connectionWrapper);
  });
}

module.exports = {
  pool,
  query,
  promise,
  getConnection,
};