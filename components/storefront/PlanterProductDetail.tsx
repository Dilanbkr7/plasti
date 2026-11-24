"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { productModelUrl } from "@/lib/catalog/planter-models";
import { money, type Product } from "@/lib/platform";
import { dimensions, planterColors } from "@/lib/storefront";
import { CommercialContact } from "./CommercialContact";
import { ProductColorPreview } from "./ProductColorPreview";
import { Icon } from "@/components/ui/Icons";
import Link from "next/link";
import { useCart } from "./useCart";
import s from "./PlanterProductDetail.module.css";
const PlanterModelViewer = dynamic(() => import("./PlanterModelViewer"), {
  ssr: false,
  loading: () => (
    <div className={s.viewerLoading} role="status">
      Preparando el visor 3D…
    </div>
  ),
});

export function PlanterProductDetail({
  product,
  onClose,
  initialColor = "Negro carbón",
  initialQuantity = 1,
  initialBuy = false,
  initialView = "photo",
}: {
  product: Product | null;
  onClose: () => void;
  initialColor?: string;
  initialQuantity?: number;
  initialBuy?: boolean;
  initialView?: "photo" | "detail" | "3d";
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [color, setColor] = useState(initialColor);
  const [quantity, setQuantity] = useState(initialQuantity);
  const [view, setView] = useState<"photo" | "detail" | "3d">(initialView);
  const [buy, setBuy] = useState(initialBuy);
  const [cartNotice, setCartNotice] = useState("");
  const cart = useCart();
  useEffect(() => {
    if (product) dialog.current?.showModal();
    else dialog.current?.close();
  }, [product]);
  const colors =
    product?.colors.filter((name) =>
      planterColors.some((c) => c.name === name && c.id !== "verde"),
    ) || [];
  const activeColor = colors.includes(color) ? color : colors[0] || "";
  const modelUrl = product ? productModelUrl(product) : "";
  return (
    <dialog
      ref={dialog}
      className={s.dialog}
      aria-label={product ? `Ficha de ${product.name}` : "Ficha de maceta"}
      data-lenis-prevent
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) dialog.current?.close();
      }}
    >
      {product && (
        <>
          <header className={s.header}>
            <span>
              PLASTIMAD <i>/</i> COLECCIÓN MACETAS
            </span>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label="Cerrar ficha de producto"
            >
              <Icon name="close" />
            </button>
          </header>
          <div className={s.layout}>
            <div className={s.gallery}>
              <div className={s.photo}>
                {view === "3d" && modelUrl ? (
                  <PlanterModelViewer
                    key={modelUrl}
                    url={modelUrl}
                    name={product.name}
                    color={activeColor}
                  />
                ) : (
                  <ProductColorPreview
                    src={product.image_url}
                    name={product.name}
                    color={activeColor}
                    zoom={view === "detail"}
                  />
                )}
              </div>
              <div className={s.views}>
                <button
                  type="button"
                  aria-pressed={view === "photo"}
                  onClick={() => setView("photo")}
                >
                  <Icon name="leaf" /> Vista del producto
                </button>
                <button
                  type="button"
                  aria-pressed={view === "detail"}
                  onClick={() => setView("detail")}
                >
                  <Icon name="plus" /> Ver detalle
                </button>
                {modelUrl && (
                  <button
                    type="button"
                    aria-pressed={view === "3d"}
                    onClick={() => setView("3d")}
                  >
                    <Icon name="rotate" />
                    Ver en 3D
                  </button>
                )}
              </div>
              <p className={s.note}>
                {view === "3d"
                  ? activeColor === "Negro carbón"
                    ? "Modelo 3D del producto. Gira y explora cada ángulo."
                    : "Vista 3D con referencia digital del color. El tono final se confirma con el equipo."
                  : activeColor === "Negro carbón"
                    ? "Fotografía original del producto."
                    : "Referencia digital del color. El tono final se confirma con el equipo."}
              </p>
            </div>
            <div className={s.info}>
              <span className={s.kicker}>DISEÑO QUE ENCUENTRA SU LUGAR</span>
              <h2>Maceta {product.name}</h2>
              <strong className={s.price}>
                {money(product.price_cents)} <small>/ unidad</small>
              </strong>
              <p>{product.description}</p>
              <fieldset className={s.colors}>
                <legend>
                  Color: <strong>{activeColor}</strong>
                </legend>
                <div>
                  {colors.map((name) => (
                    <button
                      type="button"
                      key={name}
                      aria-label={`Ver color ${name}`}
                      aria-pressed={activeColor === name}
                      onClick={() => {
                        setColor(name);
                        setBuy(false);
                        setCartNotice("");
                      }}
                    >
                      <span
                        style={{
                          background: planterColors.find((c) => c.name === name)
                            ?.hex,
                        }}
                      />
                      {name}
                      {activeColor === name && <b>✓</b>}
                    </button>
                  ))}
                </div>
              </fieldset>
              <dl className={s.facts}>
                <div>
                  <dt>Modelo</dt>
                  <dd>{product.name}</dd>
                </div>
                <div>
                  <dt>Medidas</dt>
                  <dd>{dimensions(product)}</dd>
                </div>
                <div>
                  <dt>Disponibilidad</dt>
                  <dd>Consulta con el equipo</dd>
                </div>
              </dl>
            </div>
            <aside className={s.actions} aria-label="Opciones de compra">
              <span className={s.kicker}>DALE LUGAR A TU PRÓXIMA IDEA</span>
              <p>Elige tu color y prepara tu pedido.</p>
              <label className={s.quantity}>
                Cantidad{" "}
                <input
                  type="number"
                  value={quantity}
                  min={1}
                  max={99}
                  onChange={(e) =>
                    setQuantity(
                      Math.max(
                        1,
                        Math.min(99, Math.floor(Number(e.target.value)) || 1),
                      ),
                    )
                  }
                />
              </label>
              <button
                type="button"
                className={s.primary}
                onClick={() => {
                  setBuy(true);
                  setCartNotice("");
                }}
              >
                Comprar ahora <Icon />
              </button>
              <button
                type="button"
                className={s.secondary}
                onClick={() => {
                  try {
                    cart.add({
                      product_id: product.id,
                      color: activeColor,
                      quantity,
                    });
                    setCartNotice("Maceta agregada al carrito.");
                    setBuy(false);
                  } catch (error) {
                    setCartNotice(
                      error instanceof Error
                        ? error.message
                        : "No pudimos agregar la maceta.",
                    );
                  }
                }}
              >
                Agregar al carrito <Icon name="plus" />
              </button>
              {cartNotice && (
                <p className={s.notice} role="status">
                  {cartNotice}{" "}
                  <Link
                    href="/carrito"
                    onNavigate={() => dialog.current?.close()}
                  >
                    Ver mi carrito ({cart.count}) ↗
                  </Link>
                </p>
              )}
              {buy && (
                <CommercialContact
                  key={`${product.id}:${activeColor}:${quantity}`}
                  product={product}
                  color={activeColor}
                  quantity={quantity}
                  published
                />
              )}
            </aside>
          </div>
        </>
      )}
    </dialog>
  );
}
