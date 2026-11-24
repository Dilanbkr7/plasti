import type { Product } from "../platform";

// The existing commerce model identifies a variant by product ID + exact color.
// It has no separate variant IDs. Keep this pair throughout generation and purchase.
export type CatalogSelection = { product_id: string; color: string };
export type ColorPreference =
  { mode: "auto" } | { mode: "selected"; color: string };
export type ReferenceVariant = CatalogSelection & {
  image_url: string;
  source_color?: string;
};
export type PersonalizationCandidate = {
  product: Product;
  references: ReferenceVariant[];
};
export type PersonalizationCatalog = {
  candidates: PersonalizationCandidate[];
  colors: { name: string; hex: string | null }[];
  expectedProducts: number;
  complete: boolean;
};
export type PersonalizationCapabilities = {
  available: boolean;
  message: string;
  catalog: PersonalizationCatalog;
};
export type PersonalizationRequest = {
  photo: File;
  preference: ColorPreference;
  excludedProducts?: string[];
  consent: boolean;
};
export type PersonalizationProposal = {
  image_url: string;
  product: Product;
  selection: CatalogSelection;
  reason?: string;
};
export type PersonalizationResponse =
  | { status: "unavailable"; message: string }
  | { status: "pending"; id: string; message: string }
  | { status: "ready"; proposal: PersonalizationProposal };
