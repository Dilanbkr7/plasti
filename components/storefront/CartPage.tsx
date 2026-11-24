"use client";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { BrandMark, Icon } from "@/components/ui/Icons";
import { useResource } from "@/components/platform/api";
import { money, type Product } from "@/lib/platform";
import { cartItemKey } from "@/lib/cart";
import { useCart } from "./useCart";
import { ProductColorPreview } from "./ProductColorPreview";
import {
  CommercialContact,
  type PurchaseLine,
  type CheckoutReceipt,
} from "./CommercialContact";
import s from "./CartPage.module.css";
function subscribe(notify: () => void) {
  window.addEventListener("popstate", notify);
  return () => window.removeEventListener("popstate", notify);
}
const search = () => window.location.search;
export function CartPage() {
  const cart = useCart();
  const catalog = useResource<{ products: Product[] }>("products");
  const params = useSyncExternalStore(subscribe, search, () => "");
  const [checkout, setCheckout] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<CheckoutReceipt | null>(null);
  const [retained, setRetained] = useState(false);
  const checkoutOpen =
    checkout || new URLSearchParams(params).get("comprar") === "1";
  const rows = cart.items.map((item) => ({
    item,
    product: catalog.data?.products.find(
      (p) =>
        p.id === item.product_id &&
        p.active &&
        !p.demo &&
        p.price_cents > 0 &&
        p.colors.includes(item.color),
    ),
  }));
  const lines: PurchaseLine[] = rows.flatMap(({ item, product }) =>
    product ? [{ product, color: item.color, quantity: item.quantity }] : [],
  );
  const valid = Boolean(
    catalog.data &&
    !catalog.error &&
    lines.length === cart.items.length &&
    cart.items.length,
  );
  const total = lines.reduce(
    (sum, line) => sum + line.product.price_cents * line.quantity,
    0,
  );
  function change(action: () => void) {
    try {
      action();
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No pudimos actualizar el carrito.",
      );
    }
  }
  return (
    <div className={s.page}>
      <header className={s.header}>
        <Link className={s.brand} href="/">
          <BrandMark /> PLASTIMAD
        </Link>
        <nav>
          <Link href="/#coleccion">Seguir explorando ↗</Link>
          <Link href="/panel">Mi cuenta</Link>
        </nav>
      </header>
      <main className={s.main}>
        <span className={s.kicker}>TU COLECCIÓN, A UN PASO DE CASA</span>
        <h1>
          Tu próximo <em>espacio verde.</em>
        </h1>
        <p className={s.intro}>
          Tus macetas, sus colores y cada detalle antes de confirmar.
        </p>
        {receipt ? (
          <section className={s.success} role="status">
            <Icon name="leaf" />
            <h2>¡Gracias por tu compra!</h2>
            <p>
              Tu pedido #{receipt.id.slice(0, 8).toUpperCase()} se registró con
              todos los productos del carrito.
            </p>
            <strong>Total de productos: {money(receipt.total_cents)}</strong>
            <p>
              Pago contraentrega. Ya tienes un mensaje automático con el resumen
              y puedes coordinar la entrega con PLASTIMAD.
            </p>
            {retained && (
              <p>
                El carrito cambió durante la compra y lo conservamos. Revísalo
                antes de hacer otro pedido.
              </p>
            )}
            <Link
              className={s.primary}
              href={`/panel?view=requests&pedido=${receipt.id}`}
            >
              Ver mi pedido y mensajes <Icon />
            </Link>
            <Link href="/#coleccion">Volver a la colección ↗</Link>
          </section>
        ) : !cart.items.length ? (
          <section className={s.empty}>
            <Icon name="leaf" />
            <h2>Tu carrito está esperando una nueva idea.</h2>
            <p>Elige una maceta, su color y cantidad desde la colección.</p>
            <Link className={s.primary} href="/#coleccion">
              Descubrir las macetas <Icon />
            </Link>
          </section>
        ) : (
          <div className={s.layout}>
            <section aria-label="Productos de mi carrito">
              <div className={s.toolbar}>
                <span>
                  {cart.count} {cart.count === 1 ? "unidad" : "unidades"}
                </span>
                <button disabled={pending} onClick={() => change(cart.clear)}>
                  Vaciar carrito
                </button>
              </div>
              {rows.map(({ item, product }) => (
                <article className={s.item} key={cartItemKey(item)}>
                  <div className={s.photo}>
                    {product ? (
                      <ProductColorPreview
                        src={product.image_url}
                        name={product.name}
                        color={item.color}
                      />
                    ) : (
                      <Icon name="leaf" />
                    )}
                  </div>
                  <div className={s.details}>
                    <h2>
                      {product
                        ? `Maceta ${product.name}`
                        : catalog.loading
                          ? "Consultando maceta…"
                          : "Producto no disponible"}
                    </h2>
                    <p>{item.color}</p>
                    {product ? (
                      <p>{money(product.price_cents)} / unidad</p>
                    ) : (
                      !catalog.loading && (
                        <p className={s.error}>
                          Retira esta opción o vuelve a consultar el catálogo
                          antes de comprar.
                        </p>
                      )
                    )}
                    <label>
                      Cantidad{" "}
                      <input
                        aria-label={`Cantidad de ${product?.name || "producto"}, ${item.color}`}
                        type="number"
                        min={1}
                        max={99}
                        value={item.quantity}
                        disabled={pending}
                        onChange={(event) =>
                          change(() =>
                            cart.update(item, Number(event.target.value)),
                          )
                        }
                      />
                    </label>
                    <button
                      className={s.remove}
                      disabled={pending}
                      onClick={() => change(() => cart.remove(item))}
                    >
                      Eliminar
                    </button>
                  </div>
                  <strong className={s.subtotal}>
                    {product ? money(product.price_cents * item.quantity) : "—"}
                  </strong>
                </article>
              ))}
              <p className={s.note}>
                El carrito se guarda en este navegador, incluso al iniciar
                sesión. Las vistas de color son referencias digitales.
              </p>
            </section>
            <aside className={s.summary}>
              <span className={s.kicker}>TU PEDIDO</span>
              <h2>El comienzo de algo vivo.</h2>
              <div className={s.total}>
                <span>Total de productos</span>
                <strong>{valid ? money(total) : "—"}</strong>
              </div>
              <p>
                Contraentrega · pagas al recibir. El envío y sus condiciones se
                coordinan con el equipo antes del despacho.
              </p>
              {catalog.loading && (
                <p role="status">Consultando precios y colores actuales…</p>
              )}
              {catalog.error && (
                <p className={s.error} role="alert">
                  {catalog.error}
                </p>
              )}
              {error && (
                <p className={s.error} role="alert">
                  {error}
                </p>
              )}
              <button
                className={s.primary}
                disabled={!valid || pending}
                onClick={() => setCheckout(true)}
              >
                Finalizar compra <Icon />
              </button>
              <button
                className={s.refresh}
                disabled={pending}
                onClick={catalog.refresh}
              >
                Actualizar precios y disponibilidad ↻
              </button>
              {checkoutOpen && valid && (
                <div id="finalizar" className={s.checkout}>
                  <CommercialContact
                    key={cart.revision}
                    items={lines}
                    published
                    checkoutKey={cart.revision}
                    destination="/carrito?comprar=1#finalizar"
                    onPendingChange={setPending}
                    onComplete={(saved) => {
                      setReceipt(saved);
                      try {
                        setRetained(!cart.clearPurchased(cart.revision));
                      } catch {
                        setRetained(true);
                      }
                    }}
                  />
                </div>
              )}
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
