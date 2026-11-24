import type { Product } from "../platform";
import { planterColors } from "../storefront";
import { personalizationConfig } from "./config";
import { planterCollection } from "../catalog/planter-collection";
import type {
  CatalogSelection,
  ColorPreference,
  PersonalizationCatalog,
  PersonalizationProposal,
} from "./types";

export function isImageLocation(value: string) {
  return /^\/(?!\/)[^\s\\]+$/.test(value) || /^https:\/\/[^\s\\]+$/.test(value);
}

function referenceImage(product: Product, color: string) {
  const configured = personalizationConfig.referenceImages[product.id]?.[color];
  if (configured && isImageLocation(configured)) return configured;
  if (
    personalizationConfig.colors.includes(color) &&
    product.colors.includes(color) &&
    planterCollection.some(
      (p) =>
        p.id === product.id &&
        product.image_url === `/images/coleccion/${p.slug}.webp`,
    )
  )
    return product.image_url;
  // A generic multi-color product photo cannot be assumed to depict every variant.
  if (product.colors.length === 1 && isImageLocation(product.image_url))
    return product.image_url;
  return null;
}

export function buildPersonalizationCatalog(
  products: Product[],
): PersonalizationCatalog {
  const candidates = products
    .filter(
      (p) =>
        p.active &&
        !p.demo &&
        personalizationConfig.productIds.includes(p.id) &&
        p.category.trim().toLocaleLowerCase("es") === "macetas",
    )
    .map((product) => ({
      product,
      references: product.colors.flatMap((color) => {
        if (!personalizationConfig.colors.includes(color)) return [];
        const image_url = referenceImage(product, color);
        return image_url
          ? [
              {
                product_id: product.id,
                color,
                image_url,
                // The original black photograph supplies the real shape. The editor
                // is explicitly instructed to recolor only the planter when needed.
                source_color: personalizationConfig.referenceImages[
                  product.id
                ]?.[color]
                  ? color
                  : planterCollection.some((p) => p.id === product.id && product.image_url === `/images/coleccion/${p.slug}.webp`)
                    ? "Negro carbón" : color,
              },
            ]
          : [];
      }),
    }));
  const colors = personalizationConfig.colors
    .filter((name) =>
      candidates.some(
        (c) => c.references.length > 0 && c.product.colors.includes(name),
      ),
    )
    .map((name) => ({
      name,
      hex: planterColors.find((c) => c.name === name)?.hex || null,
    }));
  return {
    candidates,
    colors,
    expectedProducts: personalizationConfig.expectedProducts,
    complete:
      candidates.length === personalizationConfig.expectedProducts &&
      candidates.every((c) => c.references.length > 0) &&
      colors.length > 0,
  };
}

/** Resolve all commercial data from the live catalog, never from AI-supplied names/prices. */
export function resolveProposal(
  catalog: PersonalizationCatalog,
  selection: CatalogSelection,
  preference: ColorPreference,
  image_url: string,
): PersonalizationProposal | null {
  if (!catalog.complete || !isImageLocation(image_url)) return null;
  if (preference.mode === "selected" && selection.color !== preference.color)
    return null;
  const candidate = catalog.candidates.find(
    (c) => c.product.id === selection.product_id,
  );
  if (!candidate?.references.some((r) => r.color === selection.color))
    return null;
  return { image_url, product: candidate.product, selection: { ...selection } };
}
