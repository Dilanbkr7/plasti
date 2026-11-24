import { loadEnvConfig } from "@next/env";
import { db } from "../lib/server/db";
import { planterCollection } from "../lib/catalog/planter-collection";

async function main() {
  loadEnvConfig(process.cwd());
  if (process.env.DATABASE_URL)
    throw new Error("Solo se permite actualizar la base local.");
  const connection = await db();
  try {
    await connection.transaction(async (tx) => {
      await tx.query(
        "UPDATE plastimad.products SET active=false,featured=false,model_url='',image_url='' WHERE name=$1 OR image_url LIKE '/images/macetas/%'",
        ["Maceta geométrica de madera plástica"],
      );
      await tx.query(
        "UPDATE plastimad.products SET model_url='' WHERE model_url LIKE '/models/macetas/%' OR model_url='/models/maceta.glb'",
      );
      await tx.query(
        "UPDATE plastimad.products SET featured=true WHERE id=$1 AND active=true",
        [planterCollection[0].id],
      );
    });
    console.log(
      "Maceta anterior retirada del catálogo público. Semiesférica destacada. Historial conservado.",
    );
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
