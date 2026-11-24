import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireUser } from "./auth";
import { db, query } from "./db";
import { HttpError, jsonBody } from "./security";
import { product } from "./validation";
import type { Product } from "../platform";
export async function catalogHandler(request: Request, id?: string) {
  if (request.method === "GET") {
    const all = new URL(request.url).searchParams.get("all") === "true";
    if (all) await requireUser("administrator");
    return {
      products: await query<Product>(
        `SELECT * FROM plastimad.products ${all ? "" : "WHERE active=true AND demo=false"} ORDER BY created_at DESC LIMIT 500`,
      ),
    };
  }
  const actor = await requireUser("administrator");
  if (id) z.uuid().parse(id);
  if (request.method === "DELETE" && id) {
    await query("UPDATE plastimad.products SET active=false WHERE id=$1", [id]);
    return { ok: true };
  }
  if (!["POST", "PATCH"].includes(request.method))
    throw new HttpError(405, "Método no permitido.");
  const p = product.parse(await jsonBody(request));
  const values = [
    p.name,
    p.description,
    p.category,
    p.price_cents,
    p.unit,
    JSON.stringify(p.colors),
    JSON.stringify(p.sizes),
    p.model_url,
    p.image_url,
    p.active,
    p.demo,
    p.length_cm,
    p.width_cm,
    p.height_cm,
    p.featured,
  ];
  const saved = await (
    await db()
  ).transaction(async (tx) => {
    await tx.query("LOCK TABLE plastimad.products IN SHARE ROW EXCLUSIVE MODE");
    if (p.featured)
      await tx.query(
        "UPDATE plastimad.products SET featured=false WHERE featured=true",
      );
    const {
      rows: [item],
    } = id
      ? await tx.query<Product>(
          `UPDATE plastimad.products SET name=$1,description=$2,category=$3,price_cents=$4,unit=$5,colors=$6,sizes=$7,model_url=$8,image_url=$9,active=$10,demo=$11,length_cm=$12,width_cm=$13,height_cm=$14,featured=$15 WHERE id=$16 RETURNING *`,
          [...values, id],
        )
      : await tx.query<Product>(
          `INSERT INTO plastimad.products(name,description,category,price_cents,unit,colors,sizes,model_url,image_url,active,demo,length_cm,width_cm,height_cm,featured,id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
          [...values, randomUUID()],
        );
    if (!item) throw new HttpError(404, "Producto no encontrado.");
    return item;
  });
  await query(
    "INSERT INTO plastimad.audit(id,actor_id,action,target_id) VALUES($1,$2,$3,$4)",
    [
      randomUUID(),
      actor.id,
      id ? "product.update" : "product.create",
      saved.id,
    ],
  );
  return { product: saved };
}
