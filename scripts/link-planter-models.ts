import { loadEnvConfig } from "@next/env";
import { stat } from "node:fs/promises";
import path from "node:path";
import { db } from "../lib/server/db";
import { planterModels } from "../lib/catalog/planter-models";

async function main() {
  loadEnvConfig(process.cwd());
  if (process.env.DATABASE_URL)
    throw new Error("Esta actualización solo modifica la base local.");
  for (const url of Object.values(planterModels))
    await stat(path.join(process.cwd(), "public", url));
  const connection = await db();
  try {
    await connection.transaction(async (tx) => {
      for (const [id, url] of Object.entries(planterModels))
        await tx.query(
          "UPDATE plastimad.products SET model_url=$1 WHERE id=$2",
          [url, id],
        );
    });
    console.log(
      "Se vincularon los seis modelos optimizados con los productos existentes.",
    );
  } finally {
    await connection.close();
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "No se pudo vincular");
  process.exitCode = 1;
});
