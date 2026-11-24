import { planterCollection } from "../catalog/planter-collection";
// Confirmed by the owner. Names must match products.colors; never synthesize variants.
export const personalizationConfig = {
  expectedProducts: 6,
  colors: ["Negro carbón", "Tomate", "Celeste"],
  productIds: planterCollection.map((p) => p.id),
  // Optional original photographs by real product ID and exact catalog color.
  // Populate when the final product photographs are supplied.
  referenceImages: {} as Record<string, Record<string, string>>,
};
