import type { Metadata } from "next";
import { PlanterShop } from "@/components/storefront/PlanterShop";

export const metadata: Metadata = {
  title: "Macetas de madera plástica | PLASTIMAD",
  description:
    "Descubre Semiesférica, Cónica, Hexagonal, Esférica, Cilíndrica y Facetada. Seis macetas PLASTIMAD para tu espacio.",
};

export default function Home() {
  return <PlanterShop />;
}
