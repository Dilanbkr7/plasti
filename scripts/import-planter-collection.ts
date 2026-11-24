import { loadEnvConfig } from "@next/env";
import { copyFile, mkdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { db } from "../lib/server/db";
import { planterCollection } from "../lib/catalog/planter-collection";
import { personalizationConfig } from "../lib/personalization/config";
import { planterModels } from "../lib/catalog/planter-models";

async function main() {
  loadEnvConfig(process.cwd());
  if (process.env.DATABASE_URL)
    throw new Error(
      "Importación limitada a la base local. No se modificarán bases remotas.",
    );
  const sourceDirectory = process.argv[2];
  if (!sourceDirectory || !path.isAbsolute(sourceDirectory))
    throw new Error(
      "Indica la carpeta absoluta que contiene las seis fotografías.",
    );
  const destination = path.join(process.cwd(), "public/images/coleccion");
  const originals = path.join(process.cwd(), ".data/product-originals");
  await mkdir(destination, { recursive: true });
  await mkdir(originals, { recursive: true });
  // Validate every supplied file before modifying the catalog.
  const sources = await Promise.all(
    planterCollection.map(async (item) => {
      const source = path.join(sourceDirectory, item.source);
      const bytes = await readFile(source);
      const metadata = await sharp(bytes).metadata();
      if (!metadata.width || !metadata.height)
        throw new Error(`Imagen inválida: ${item.name}`);
      return { item, source, bytes };
    }),
  );
  const report = [];
  for (const { item, source, bytes } of sources) {
    await copyFile(source, path.join(originals, `${item.slug}.png`));
    await sharp(bytes)
      .rotate()
      .resize({
        width: 1200,
        height: 1200,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 86, effort: 6 })
      .toFile(path.join(destination, `${item.slug}.webp`));
    await sharp(bytes)
      .rotate()
      .resize({
        width: 560,
        height: 560,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82, effort: 6 })
      .toFile(path.join(destination, `${item.slug}-560.webp`));
    report.push({
      name: item.name,
      original: bytes.length,
      web: (await stat(path.join(destination, `${item.slug}.webp`))).size,
      thumbnail: (await stat(path.join(destination, `${item.slug}-560.webp`)))
        .size,
    });
  }
  const connection = await db();
  try {
    await connection.transaction(async (tx) => {
      for (const item of planterCollection)
        await tx.query(
          `INSERT INTO plastimad.products(id,name,description,category,price_cents,unit,colors,sizes,model_url,image_url,active,demo,featured,length_cm,width_cm,height_cm)
        VALUES($1,$2,$3,'Macetas',$4,'unidad',$5::jsonb,$6::jsonb,$11,$7,true,false,false,$8,$9,$10)
        ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,category=EXCLUDED.category,
        price_cents=EXCLUDED.price_cents,colors=EXCLUDED.colors,sizes=EXCLUDED.sizes,image_url=EXCLUDED.image_url,model_url=EXCLUDED.model_url,active=true,demo=false,length_cm=EXCLUDED.length_cm,width_cm=EXCLUDED.width_cm,height_cm=EXCLUDED.height_cm`,
          [
            item.id,
            item.name,
            item.description,
            item.price_cents,
            JSON.stringify(personalizationConfig.colors),
            JSON.stringify([
              `${item.length_cm} × ${item.width_cm} × ${item.height_cm} cm · referencial del prototipo`,
            ]),
            `/images/coleccion/${item.slug}.webp`,
            item.length_cm,
            item.width_cm,
            item.height_cm,
            planterModels[item.id],
          ],
        );
    });
    await writeFile(
      path.join(destination, "manifest.json"),
      JSON.stringify(
        { generated: new Date().toISOString(), images: report },
        null,
        2,
      ),
    );
    console.log(
      JSON.stringify(
        { imported: planterCollection.length, images: report },
        null,
        2,
      ),
    );
  } finally {
    await connection.close();
  }
}
main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : "No se pudo importar la colección.",
  );
  process.exitCode = 1;
});
