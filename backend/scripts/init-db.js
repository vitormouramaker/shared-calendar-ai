/**
 * Cria o banco (se não existir) e as tabelas. Útil para rodar sem Docker.
 *
 *   npm run db:init
 *
 * Conecta no banco "postgres" com as mesmas credenciais do .env para criar o
 * DB_NAME, e depois aplica o schema (o mesmo que a API aplica ao subir).
 */
require("dotenv").config();
const { Client } = require("pg");

async function createDatabaseIfMissing() {
  const dbName = process.env.DB_NAME || "calendo";
  const admin = new Client({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
    database: "postgres",
  });

  await admin.connect();
  try {
    const { rowCount } = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
    if (rowCount === 0) {
      // Nome de banco não aceita parâmetro: valida antes de interpolar.
      if (!/^[a-zA-Z0-9_]+$/.test(dbName)) {
        throw new Error(`DB_NAME inválido: ${dbName}`);
      }
      await admin.query(`CREATE DATABASE "${dbName}" ENCODING 'UTF8'`);
      console.log(`banco criado: ${dbName}`);
    } else {
      console.log(`banco já existe: ${dbName}`);
    }
  } finally {
    await admin.end();
  }
}

async function main() {
  await createDatabaseIfMissing();
  const { ensureSchema } = require("../src/server/ensure-schema");
  const { postgres } = require("../src/server/connect");
  try {
    await ensureSchema();
    console.log("tabelas prontas");
  } finally {
    await postgres.end();
  }
}

main().catch((error) => {
  console.error("Erro ao preparar o banco:", error?.message || error);
  process.exitCode = 1;
});
