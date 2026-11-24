import type { Metadata } from "next";
import { RecycledBinHero } from "@/components/experience/RecycledBinHero";

export const metadata: Metadata = {
  title: "PLASTIMAD — El plástico merece otra historia",
  description:
    "Basureros hechos con plástico reciclado. Descubre cómo el material encuentra una nueva función.",
};

export default function Home() {
  return <RecycledBinHero />;
}
