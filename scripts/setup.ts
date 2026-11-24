import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { randomBytes, randomUUID } from "node:crypto";
import { db, query } from "../lib/server/db";
import { hashPassword } from "../lib/server/security";
import { registration } from "../lib/server/validation";

async function main() {
  const mode = process.argv[2];
  if (mode === "local" && process.env.DATABASE_URL)
    throw new Error(
      "Local setup refuses to modify a remote database. Use a separate local environment.",
    );
  const connection = await db();
  try {
    if (mode === "check") {
      const {
        rows: [result],
      } = await connection.query<{ users: string; products: string }>(
        "SELECT (SELECT count(*) FROM plastimad.users)::text AS users, (SELECT count(*) FROM plastimad.products)::text AS products",
      );
      console.log(
        `Conexión correcta. Esquema PLASTIMAD disponible: ${result.users} usuarios, ${result.products} productos.`,
      );
      return;
    }
    await connection.exec(await readFile("database/schema.sql", "utf8"));
    if (mode === "migrate") {
      console.log("Esquema de PLASTIMAD aplicado.");
      return;
    }
    if (mode !== "local" && mode !== "admin")
      throw new Error("Use local, migrate or admin.");
    const input = registration.parse({
      name: process.env.ADMIN_NAME || "Administrador PLASTIMAD",
      email:
        mode === "local" ? "admin@plastimad.local" : process.env.ADMIN_EMAIL,
      password:
        mode === "local"
          ? randomBytes(18).toString("base64url")
          : process.env.ADMIN_PASSWORD,
    });
    const existing = await query(
      "SELECT id FROM plastimad.users WHERE email=$1",
      [input.email],
    );
    if (!existing.length) {
      await query(
        "INSERT INTO plastimad.users(id,name,email,password_hash,role) VALUES($1,$2,$3,$4,'administrator')",
        [
          randomUUID(),
          input.name,
          input.email,
          await hashPassword(input.password),
        ],
      );
      if (mode === "local") {
        await mkdir(".data", { recursive: true });
        await writeFile(
          ".data/dev-access.txt",
          `ACCESO LOCAL PLASTIMAD\n\nURL: http://localhost:3000/acceso\nCorreo: ${input.email}\nContraseña: ${input.password}\n\nCuenta exclusiva para desarrollo. Cambia la contraseña desde Perfil. Este archivo está excluido de Git.\n`,
          { mode: 0o600 },
        );
        console.log(
          "Administrador local creado. Acceso guardado en .data/dev-access.txt (no se imprime la contraseña).",
        );
      } else
        console.log(
          "Administrador creado. Utiliza la contraseña configurada en ADMIN_PASSWORD.",
        );
    } else
      console.log(
        "La cuenta ya existe; no se ha modificado su contraseña ni su rol.",
      );
    if (mode === "local") {
      const oldDemos = [
        "Maceta Origen",
        "Jardinera Horizonte",
        "Banca Encuentro",
      ];
      const oldDemoFilter =
        "p.demo=true AND p.image_url='' AND p.name=ANY($1::text[])";
      const { deleted, archived } = await connection.transaction(async (tx) => {
        const deleted = await tx.query<{ name: string }>(
          `DELETE FROM plastimad.products p WHERE ${oldDemoFilter}
           AND NOT EXISTS (SELECT 1 FROM plastimad.requests r WHERE r.product_id=p.id)
           RETURNING p.name`,
          [oldDemos],
        );
        const archived = await tx.query<{ name: string }>(
          `UPDATE plastimad.products p SET active=false,featured=false
           WHERE ${oldDemoFilter} AND (p.active OR p.featured) RETURNING p.name`,
          [oldDemos],
        );
        return { deleted: deleted.rows, archived: archived.rows };
      });
      console.log(
        `Base local preparada. Demostraciones eliminadas: ${deleted.length}. Archivadas para conservar el historial: ${archived.length}.`,
      );
    }
  } finally {
    await connection.close();
  }
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "No se completó la configuración.",
  );
  process.exitCode = 1;
});
