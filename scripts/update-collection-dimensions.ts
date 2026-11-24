import { loadEnvConfig } from "@next/env";
import { db } from "../lib/server/db";
import { planterCollection } from "../lib/catalog/planter-collection";

async function main() {
  loadEnvConfig(process.cwd());
  if (process.env.DATABASE_URL)
    throw new Error("Esta actualización solo modifica la base local.");
  const connection = await db();
  try {
    await connection.transaction(async (tx) => {
      for (const item of planterCollection) {
        if (
          [item.length_cm, item.width_cm, item.height_cm].some(
            (n) => n <= 0 || n >= 100,
          )
        )
          throw new Error(`Medidas inválidas: ${item.name}`);
        await tx.query(
          "UPDATE plastimad.products SET length_cm=$1,width_cm=$2,height_cm=$3,sizes=$4::jsonb,description=$5 WHERE id=$6",
          [
            item.length_cm,
            item.width_cm,
            item.height_cm,
            JSON.stringify([
              `${item.length_cm} × ${item.width_cm} × ${item.height_cm} cm · referencial del prototipo`,
            ]),
            item.description,
            item.id,
          ],
        );
        console.log(
          `${item.name}: ${item.length_cm} × ${item.width_cm} × ${item.height_cm} cm · referencial`,
        );
      }
    });
  } finally {
    await connection.close();
  }
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "No se pudo actualizar",
  );
  process.exitCode = 1;
});
