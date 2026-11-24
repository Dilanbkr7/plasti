import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";

export interface Sql {
  query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: T[] }>;
}
export interface Database extends Sql {
  transaction<T>(work: (tx: Sql) => Promise<T>): Promise<T>;
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
}
let connection: Promise<Database> | undefined;
const globalDb = globalThis as typeof globalThis & {
  plastimadDb?: Promise<Database>;
};
async function connect(): Promise<Database> {
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    url.searchParams.delete("sslmode");
    const pool = new Pool({
      connectionString: url.toString(),
      max: 3,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
      ssl: {
        rejectUnauthorized: true,
        ...(process.env.DATABASE_CA_CERT
          ? { ca: process.env.DATABASE_CA_CERT.replace(/\\n/g, "\n") }
          : {}),
      },
    });
    return {
      query: async <T>(sql: string, params: unknown[] = []) => ({
        rows: (await pool.query(sql, params)).rows as T[],
      }),
      exec: async (sql: string) => {
        await pool.query(sql);
      },
      transaction: async <T>(work: (tx: Sql) => Promise<T>) => {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const result = await work({
            query: async <R>(sql: string, params: unknown[] = []) => ({
              rows: (await client.query(sql, params)).rows as R[],
            }),
          });
          await client.query("COMMIT");
          return result;
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        } finally {
          client.release();
        }
      },
      close: () => pool.end(),
    };
  }
  if (
    process.env.NETLIFY ||
    (process.env.NODE_ENV === "production" &&
      process.env.ALLOW_LOCAL_DATABASE !== "true")
  )
    throw new Error(
      "DATABASE_URL is required in production. Local storage is not suitable for Netlify.",
    );
  const directory =
    process.env.LOCAL_DATABASE_PATH ||
    path.join(process.cwd(), ".data/postgres");
  // Keep tracing scoped to this directory; custom database paths need an existing parent.
  if (directory !== "memory://")
    await mkdir(path.join(process.cwd(), ".data"), { recursive: true });
  const local = await PGlite.create(directory);
  await local.exec(
    await readFile(path.join(process.cwd(), "database/schema.sql"), "utf8"),
  );
  return {
    query: (sql, params) => local.query(sql, params),
    exec: async (sql) => {
      await local.exec(sql);
    },
    transaction: (work) => local.transaction(work),
    close: () => local.close(),
  };
}
export function db() {
  connection ??= globalDb.plastimadDb ??= connect();
  return connection;
}
export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
) {
  return (await (await db()).query<T>(sql, params)).rows;
}
