"use client";

import Link from "next/link";

import { BrandMark, Icon } from "@/components/ui/Icons";
import { VirtualAssistant } from "./VirtualAssistant";
import { LandingServices } from "./LandingServices";
import { PlanterCollection } from "./PlanterCollection";

import { ProductStory } from "./ProductStory";
import { ImmersiveHero } from "@/components/hero/ImmersiveHero";
import { useResource } from "@/components/platform/api";
import { brochurePlanter, type StorefrontData } from "@/lib/storefront";
import s from "./PlanterShop.module.css";
import { useCart } from "./useCart";

export function PlanterShop() {
  const cart = useCart();
  const catalog = useResource<StorefrontData>("storefront");
  const product = catalog.data?.product || brochurePlanter;

  return (
    <div className={s.shop}>
      <div className={s.announcement}>
        OTRA VIDA PARA TU ESPACIO. UNA FORMA DE HACERLO TUYO.{" "}
        <Icon name="leaf" />
      </div>
      <header className={s.header}>
        <Link href="/" className={s.brand}>
          <BrandMark />
          <span>
            PLASTIMAD<small>DISEÑO CONSCIENTE</small>
          </span>
        </Link>
        <nav aria-label="Navegación principal">
          <a href="#coleccion">La colección</a>
          <a href="#nuestra-historia">Nuestra historia</a>
          <a href="#analiza">Personaliza tu espacio</a>
          <a href="#asesoria">Asesoría</a>
        </nav>
        <Link
          href="/carrito"
          className={s.account}
          aria-label={`Ver carrito, ${cart.count} unidades`}
        >
          Carrito ({cart.count})
        </Link>
        <Link href="/acceso" className={s.account}>
          Iniciar sesión <span>↗</span>
        </Link>
      </header>
      <ImmersiveHero />
      <main className={s.main}>
        <PlanterCollection />
        <ProductStory />
        <LandingServices product={product} />
      </main>
      <footer className={s.footer}>
        <span>
          PLASTIMAD<small>UNA NUEVA VIDA, POR NATURALEZA.</small>
        </span>
        <p>Espacios que florecen con tu estilo.</p>
        <a href="#">Volver arriba ↑</a>
      </footer>

      <VirtualAssistant product={product} />
    </div>
  );
}
