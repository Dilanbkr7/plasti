"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api, errorMessage, useResource } from "@/components/platform/api";
import { money, type Product, type User } from "@/lib/platform";
import { Icon } from "@/components/ui/Icons";
import s from "./LandingFeatures.module.css";
export function Access({
  section,
  destination,
}: {
  section: string;
  destination?: string;
}) {
  const next = encodeURIComponent(destination || `/#${section}`);
  return (
    <div className={s.access}>
      <p>
        Crea tu cuenta para continuar con la compra y consultar el estado de tu
        solicitud.
      </p>
      <Link href={`/registro?next=${next}`} className={s.button}>
        Crear cuenta y continuar <Icon />
      </Link>
      <Link className={s.textLink} href={`/acceso?next=${next}`}>
        Ya tengo cuenta ↗
      </Link>
    </div>
  );
}

export type PurchaseLine = {
  product: Product;
  color: string;
  quantity: number;
};
export type CheckoutReceipt = { id: string; total_cents: number };
export function CommercialContact({
  product,
  published,
  color,
  quantity,
  items,
  checkoutKey: providedKey,
  destination,
  onComplete,
  onPendingChange,
}: {
  product?: Product;
  published: boolean;
  color?: string;
  quantity?: number;
  items?: PurchaseLine[];
  checkoutKey?: string;
  destination?: string;
  onComplete?: (receipt: CheckoutReceipt) => void;
  onPendingChange?: (pending: boolean) => void;
}) {
  const router = useRouter();
  const lines =
    items ||
    (product ? [{ product, color: color || "", quantity: quantity || 1 }] : []);
  const total = lines.reduce(
    (sum, line) => sum + line.product.price_cents * line.quantity,
    0,
  );
  const session = useResource<{ user: User | null }>("auth/session");
  const refreshSession = session.refresh;
  useEffect(() => {
    const refresh = () => {
      if (!document.hidden) refreshSession();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [refreshSession]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [deliveryDraft, setDeliveryDraft] = useState<Record<string, string>>(
    {},
  );
  const [saved, setSaved] = useState<{
    id: string;
    total_cents: number;
  } | null>(null);
  const [checkoutKey] = useState(() => crypto.randomUUID());
  const returnTo =
    destination ||
    (product
      ? `/?${new URLSearchParams({ producto: product.id, color: color || "", cantidad: String(quantity || 1), comprar: "1" })}#coleccion`
      : "/carrito?comprar=1#finalizar");
  async function switchAccount() {
    setPending(true);
    setError("");
    try {
      await api("auth/logout", "POST", {});
      router.push(`/acceso?next=${encodeURIComponent(returnTo)}`);
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  }
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    onPendingChange?.(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      // Another tab may have signed in as administrator after this form opened.
      const current = await api<{ user: User | null }>("auth/session");
      if (!current.user || current.user.role !== "customer") {
        session.refresh();
        throw new Error(
          current.user
            ? "Estás usando una cuenta de administrador. Entra con una cuenta de cliente para comprar."
            : "Tu sesión terminó. Inicia sesión con tu cuenta de cliente para continuar.",
        );
      }
      if (current.user.id !== session.data?.user?.id) {
        session.refresh();
        throw new Error(
          "La cuenta cambió en otra pestaña. Revisa tus datos y vuelve a confirmar el pedido.",
        );
      }
      const result = await api<{ id: string; total_cents: number }>(
        "checkout",
        "POST",
        {
          ...(items
            ? {
                items: lines.map((line) => ({
                  product_id: line.product.id,
                  color: line.color,
                  quantity: line.quantity,
                })),
                expected_total_cents: total,
              }
            : { product_id: product!.id, color, quantity }),
          checkout_key: providedKey || checkoutKey,
          payment_method: "cod",
          delivery: Object.fromEntries(
            ["full_name", "phone", "city", "address", "reference"].map(
              (key) => [key, form.get(key)],
            ),
          ),
        },
      );
      setSaved(result);
      onComplete?.(result);
    } catch (error) {
      setError(errorMessage(error));
      session.refresh();
    } finally {
      setPending(false);
      onPendingChange?.(false);
    }
  }
  if (saved)
    return (
      <div className={s.success} role="status">
        <Icon name="leaf" />
        <h3>¡Gracias por tu compra!</h3>
        <p>
          Tu pedido #{saved.id.slice(0, 8).toUpperCase()} fue registrado
          correctamente.
        </p>
        <p>
          {lines.map((line) => (
            <span
              key={`${line.product.id}:${line.color}`}
              style={{ display: "block" }}
            >
              {line.product.name} · {line.color} · {line.quantity}{" "}
              {line.quantity === 1 ? "unidad" : "unidades"}
            </span>
          ))}
          <br />
          <strong>Total de productos: {money(saved.total_cents)}</strong>
        </p>
        <p>
          Pago contraentrega. El equipo coordinará contigo la entrega y el envío
          desde la conversación de este pedido. Ya tienes un mensaje automático
          con el resumen de tu compra.
        </p>
        <Link
          className={s.button}
          href={`/panel?view=requests&pedido=${saved.id}`}
        >
          Ver mi pedido y mensajes <Icon />
        </Link>
      </div>
    );
  return (
    <div className={s.contact}>
      <p className={s.selection}>
        {lines.map((line) => (
          <span
            key={`${line.product.id}:${line.color}`}
            style={{ display: "block" }}
          >
            {line.product.name}
            <br />
            <strong>
              {line.color} · {line.quantity}{" "}
              {line.quantity === 1 ? "unidad" : "unidades"}
            </strong>
          </span>
        ))}
      </p>
      {session.loading ? (
        <p role="status">Comprobando tu cuenta…</p>
      ) : session.error ? (
        <p role="alert" className={s.error}>
          {session.error}
        </p>
      ) : !session.data?.user ? (
        <Access section="coleccion" destination={returnTo} />
      ) : session.data.user.role === "administrator" ? (
        <div className={s.access}>
          <h3>Compra con una cuenta de cliente</h3>
          <p>
            Tienes abierta la cuenta de administrador ({session.data.user.email}
            ). Para realizar una compra, entra con tu cuenta de cliente.
          </p>
          <p>
            Las pestañas del mismo navegador comparten sesión. Para probar ambos
            roles a la vez, abre la cuenta de cliente en una ventana privada.
          </p>
          <button
            className={s.button}
            onClick={switchAccount}
            disabled={pending}
          >
            {pending ? "Cambiando de cuenta…" : "Entrar como cliente"} <Icon />
          </button>
          <p className={s.note}>
            Al cambiar de cuenta se cierra la sesión de administrador en este
            navegador. Conservamos la selección de productos; completarás los
            datos de entrega después de entrar.
          </p>
          <Link href="/admin?view=requests" className={s.textLink}>
            Volver a administración ↗
          </Link>
          {error && (
            <p role="alert" className={s.error}>
              {error}
            </p>
          )}
        </div>
      ) : (
        <form
          onSubmit={send}
          className={s.form}
          onChange={(e) => {
            const values = new FormData(e.currentTarget);
            setDeliveryDraft(
              Object.fromEntries(
                ["full_name", "phone", "city", "address", "reference"].map(
                  (key) => [key, String(values.get(key) || "")],
                ),
              ),
            );
          }}
        >
          <h3>Datos para la entrega</h3>
          <p className={s.note}>Compras con: {session.data.user.email}</p>
          <label>
            Nombre de quien recibe
            <input
              name="full_name"
              autoComplete="name"
              defaultValue={deliveryDraft.full_name ?? session.data.user.name}
              minLength={3}
              maxLength={100}
              required
            />
          </label>
          <label>
            Teléfono de contacto
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
              defaultValue={deliveryDraft.phone ?? session.data.user.phone}
              minLength={7}
              maxLength={30}
              required
            />
          </label>
          <label>
            Ciudad o sector
            <input
              name="city"
              defaultValue={deliveryDraft.city}
              autoComplete="address-level2"
              minLength={2}
              maxLength={100}
              required
            />
          </label>
          <label>
            Dirección de entrega
            <textarea
              name="address"
              defaultValue={deliveryDraft.address}
              autoComplete="street-address"
              minLength={10}
              maxLength={350}
              required
              placeholder="Calles, número de casa o edificio y sector"
            />
          </label>
          <label>
            Referencia del lugar
            <textarea
              name="reference"
              defaultValue={deliveryDraft.reference}
              minLength={5}
              maxLength={350}
              required
              placeholder="Un punto de referencia para encontrarte"
            />
          </label>
          <label>
            Forma de pago
            <select name="payment_method" defaultValue="cod">
              <option value="cod">Contraentrega · pagas al recibir</option>
            </select>
          </label>
          <p className={s.selection}>
            {lines.map((line) => (
              <span
                key={`${line.product.id}:${line.color}`}
                style={{ display: "block" }}
              >
                {line.product.name} · {money(line.product.price_cents)} ×{" "}
                {line.quantity} ={" "}
                {money(line.product.price_cents * line.quantity)}
              </span>
            ))}
            <strong>Total de productos: {money(total)}</strong>
          </p>
          <p className={s.note}>
            El coste y las condiciones de envío se coordinan en los mensajes del
            pedido antes del despacho. Este registro no realiza ningún cobro
            online.
          </p>
          {error && (
            <p role="alert" className={s.error}>
              {error}
            </p>
          )}
          <button className={s.button} disabled={pending || !published}>
            {pending ? "Registrando pedido…" : "Confirmar pedido contraentrega"}
            <Icon />
          </button>
        </form>
      )}
    </div>
  );
}
