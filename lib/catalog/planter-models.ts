import type { Product } from "../platform";
import { planterCollection } from "./planter-collection";

/** Stable product IDs prevent assigning a different shape to a catalog item. */
export const planterModels = Object.fromEntries(
  planterCollection.map((item) => [
    item.id,
    `/models/coleccion/${item.slug}.glb`,
  ]),
) as Record<string, string>;
export function productModelUrl(product: Product) {
  const value = product.model_url || planterModels[product.id] || "";
  return /^\/models\/[a-zA-Z0-9_\-/]+\.glb$/.test(value) ? value : "";
}
