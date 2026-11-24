"use client";
import Image from "next/image";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { useResource } from "@/components/platform/api";
import { money, type Product } from "@/lib/platform";
import type { PersonalizationCapabilities } from "@/lib/personalization/types";
import { planterCollection } from "@/lib/catalog/planter-collection";
import { PlanterProductDetail } from "./PlanterProductDetail";
import { Icon } from "@/components/ui/Icons";
import s from "./PlanterCollection.module.css";

function subscribeToLocation(notify: () => void) {
  window.addEventListener("popstate", notify);
  return () => window.removeEventListener("popstate", notify);
}
const locationSearch = () => window.location.search;
const serverSearch = () => "";

export function PlanterCollection() {
  const catalog = useResource<PersonalizationCapabilities>("personalization");
  const [selected, setSelected] = useState<Product | null>(null);
  const [returnDismissed, setReturnDismissed] = useState(false);
  const search = useSyncExternalStore(
    subscribeToLocation,
    locationSearch,
    serverSearch,
  );
  const params = new URLSearchParams(search);
  const products = planterCollection.flatMap((item) => {
    const candidate = catalog.data?.catalog.candidates.find(
      (c) => c.product.id === item.id,
    );
    return candidate ? [candidate.product] : [];
  });
  const returning =
    !returnDismissed &&
    (params.get("comprar") === "1" ||
      ["3d", "producto"].includes(params.get("vista") || ""))
      ? products.find((p) => p.id === params.get("producto")) || null
      : null;
  const displayed = selected || returning;
  return (
    <section
      id="coleccion"
      className={s.section}
      aria-label="Colección de macetas"
    >
      <header>
        <div>
          <span className={s.kicker}>SEIS FORMAS DE HABITAR LO VERDE</span>
          <h2>
            Una forma para <em>cada espacio.</em>
          </h2>
          <p>
            Curvas suaves, líneas precisas y volúmenes con carácter. Descubre la
            maceta que acompaña tu manera de vivir.
          </p>
        </div>
        <Link href="/catalogo">
          Ver catálogo completo <Icon />
        </Link>
      </header>
      {catalog.loading && <p role="status">Cargando la colección…</p>}
      {catalog.error && (
        <p role="alert">
          No pudimos cargar la colección.{" "}
          <button onClick={catalog.refresh}>Volver a intentar</button>
        </p>
      )}
      {!catalog.loading && !catalog.error && !products.length && (
        <p>La colección estará disponible cuando se publique en el catálogo.</p>
      )}
      <div className={s.grid}>
        {products.map((product, index) => (
          <article className={s.card} key={product.id}>
            <button
              type="button"
              className={s.photo}
              onClick={() => setSelected(product)}
              aria-label={`Ver maceta ${product.name} y sus colores`}
            >
              <Image
                src={product.image_url}
                alt={`Maceta ${product.name}, fotografía original en Negro carbón`}
                fill
                sizes="(max-width:600px) 88vw, (max-width:1000px) 43vw, 29vw"
              />
              <span className={s.number}>
                {String(index + 1).padStart(2, "0")} / PLASTIMAD
              </span>
            </button>
            <div className={s.body}>
              <div className={s.title}>
                <h3>
                  <button type="button" onClick={() => setSelected(product)}>
                    {product.name}
                  </button>
                </h3>
                <strong>
                  {product.price_cents
                    ? money(product.price_cents)
                    : "Consultar"}
                </strong>
              </div>
              <span className={s.color}>{product.colors.join(" · ")}</span>
              <p>{product.description}</p>
              <button className={s.buy} onClick={() => setSelected(product)}>
                Ver maceta y colores <Icon />
              </button>
            </div>
          </article>
        ))}
      </div>
      <p className={s.note}>
        Precio por unidad. Explora negro, tomate y celeste en la ficha. Las
        fotografías originales muestran el acabado negro; medidas, existencias y
        entrega se confirman con el equipo.
      </p>
      <PlanterProductDetail
        key={`${displayed?.id || "closed"}-${Boolean(!selected && returning)}`}
        product={displayed}
        initialBuy={Boolean(
          !selected && returning && params.get("comprar") === "1",
        )}
        initialView={
          !selected && returning && params.get("vista") === "3d"
            ? "3d"
            : "photo"
        }
        initialColor={
          !selected && returning
            ? params.get("color") || "Negro carbón"
            : undefined
        }
        initialQuantity={
          !selected && returning
            ? Math.min(
                99,
                Math.max(1, Math.floor(Number(params.get("cantidad"))) || 1),
              )
            : 1
        }
        onClose={() => {
          setSelected(null);
          setReturnDismissed(true);
        }}
      />
    </section>
  );
}
