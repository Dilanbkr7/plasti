import { money, type Product } from "./platform";
import { planterCollection } from "./catalog/planter-collection";
export const planterColors = [
  { id: "negro", name: "Negro carbón", hex: "#30322e" },
  { id: "tomate", name: "Tomate", hex: "#bb5134" },
  { id: "verde", name: "Verde naturaleza", hex: "#447043" },
  { id: "celeste", name: "Celeste", hex: "#8bbbd4" },
];
// Owner-supplied Semiesférica. Database values take precedence after loading.
export const brochurePlanter: Product = {
  id: planterCollection[0].id,
  name: planterCollection[0].name,
  description: planterCollection[0].description,
  category: "Macetas",
  price_cents: planterCollection[0].price_cents,
  length_cm: planterCollection[0].length_cm,
  width_cm: planterCollection[0].width_cm,
  height_cm: planterCollection[0].height_cm,
  unit: "unidad",
  colors: ["Negro carbón", "Tomate", "Celeste"],
  sizes: ["Medidas referenciales del prototipo"],
  model_url: "",
  image_url: "/images/coleccion/semiesferica.webp",
  active: true,
  demo: false,
};
export type StorefrontData = { product: Product; published: boolean };
export function dimensions(p: Product) {
  if (p.length_cm && p.width_cm)
    return p.height_cm
      ? `${p.length_cm} × ${p.width_cm} × ${p.height_cm} cm (largo × ancho × alto)${p.sizes.some((size) => /referencial/i.test(size)) ? " · referencial" : ""}`
      : `Base de ${p.length_cm} × ${p.width_cm} cm · altura por confirmar`;
  return "Medidas por confirmar con el equipo comercial";
}
export function priceLabel(p: Product) {
  return p.price_cents
    ? `${money(p.price_cents)} por ${p.unit}${p.demo ? " · demostración" : " · referencial"}`
    : "Precio a consultar";
}
