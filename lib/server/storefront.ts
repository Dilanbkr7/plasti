import { query } from "./db";
import { brochurePlanter, type StorefrontData } from "../storefront";
import type { Product } from "../platform";
export async function storefrontData(): Promise<StorefrontData> {
  const [product] = await query<Product>(
    "SELECT * FROM plastimad.products WHERE active=true AND featured=true LIMIT 1",
  );
  return { product: product || brochurePlanter, published: Boolean(product) };
}
