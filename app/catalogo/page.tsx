import Link from "next/link";
import { BrandMark } from "@/components/ui/Icons";
import { CatalogPanel } from "@/components/platform/CatalogPanel";
import { SectionTitle } from "@/components/platform/Shared";
import "@/components/platform/platform.css";
export const metadata = { title: "Catálogo | PLASTIMAD" };
export default function Catalog() {
  return (
    <div className="p-public">
      <header>
        <Link href="/" className="brand">
          <BrandMark />
          <span>
            PLASTIMAD<small>DISEÑO CONSCIENTE</small>
          </span>
        </Link>
        <nav>
          <Link href="/">Experiencia 3D</Link>
          <Link href="/acceso" className="p-button">
            Mi cuenta ↗
          </Link>
        </nav>
      </header>
      <main>
        <SectionTitle
          eyebrow="LA COLECCIÓN"
          title="Diseño que encuentra su lugar."
          description="Materiales que vuelven a vivir. Productos para transformar tus espacios."
        />
        <CatalogPanel />
      </main>
    </div>
  );
}
