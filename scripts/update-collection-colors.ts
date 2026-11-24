import { loadEnvConfig } from "@next/env";
import { db } from "../lib/server/db";
import { planterCollection } from "../lib/catalog/planter-collection";
import { personalizationConfig } from "../lib/personalization/config";

async function main() {
  loadEnvConfig(process.cwd());
  if (process.env.DATABASE_URL)
    throw new Error("Esta actualización solo modifica la base local.");
  const connection = await db();
  try {
    await connection.transaction(async (tx) => {
      for (const item of planterCollection)
        await tx.query(
          "UPDATE plastimad.products SET colors=$1::jsonb,description=$2 WHERE id=$3",
          [
            JSON.stringify(personalizationConfig.colors),
            item.description,
            item.id,
          ],
        );
    });
    console.log(
      "Se actualizaron los tres colores autorizados de las seis macetas. Las referencias fotográficas originales siguen siendo negras.",
    );
  } finally {
    await connection.close();
  }
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "No se pudo actualizar.",
  );
  process.exitCode = 1;
});
