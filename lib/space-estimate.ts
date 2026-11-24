import type { Product } from "./platform";
export type Space = {
  length_m: number;
  width_m: number;
  gap_cm: number;
  layout: "edge";
};
// One straight row on the longest side. Different products represent alternatives.
export function rowEstimate(space: Space, product: Product) {
  if (!product.length_cm || !product.width_cm) return null;
  const side = Math.max(space.length_m, space.width_m) * 100;
  const depth = Math.min(space.length_m, space.width_m) * 100;
  if (product.width_cm > depth)
    return {
      quantity: 0,
      calculation: "La profundidad de la maceta supera el ancho disponible.",
    };
  const quantity = Math.min(
    10000,
    Math.floor((side + space.gap_cm) / (product.length_cm + space.gap_cm)),
  );
  return {
    quantity,
    calculation: `Una fila sobre ${side / 100} m: macetas de ${product.length_cm} cm de largo, ${product.width_cm} cm de profundidad y ${space.gap_cm} cm entre piezas. Cantidad = parte entera de (${side} + ${space.gap_cm}) / (${product.length_cm} + ${space.gap_cm}). No descuenta obstáculos ni reserva circulación.`,
  };
}
