const { Pool } = require("pg");

const dbTimeZone = process.env.DB_TIMEZONE || "America/Sao_Paulo";

const postgres = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "calendo",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
  options: `-c timezone=${dbTimeZone}`,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  allowExitOnIdle: true,
  statement_timeout: 30000,
  query_timeout: 30000,
});

console.log("[db] Pool configured", {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "calendo",
  user: process.env.DB_USER || "postgres",
  timezone: dbTimeZone,
});

postgres.on("error", (error) => {
  console.error("[db] Pool error", {
    message: error.message,
    code: error.code,
    detail: error.detail,
  });
});

process.on("SIGINT", async () => {
  await postgres.end();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await postgres.end();
  process.exit(0);
});

module.exports = { postgres };
