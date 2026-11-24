import { randomUUID } from "node:crypto";
import { requireUser } from "./auth";
import { db } from "./db";
import { HttpError, jsonBody, limit } from "./security";
import { codCheckout, cartCheckout } from "./validation";
import { createCartOrder } from "./cart-checkout";
import { money, type Product, type User } from "../platform";
import type { z } from "zod";

export async function createCodOrder(
  user: User,
  input: z.infer<typeof codCheckout>,
) {
  if (user.role !== "customer")
    throw new HttpError(403, "Compra con una cuenta de cliente.");
  return (await db()).transaction(async (tx) => {
    // Serialize checkouts per customer so simultaneous retries cannot duplicate orders.
    await tx.query("SELECT id FROM plastimad.users WHERE id=$1 FOR UPDATE", [
      user.id,
    ]);
    const {
      rows: [previous],
    } = await tx.query<{ id: string; estimated_total_cents: number }>(
      "SELECT id,estimated_total_cents FROM plastimad.requests WHERE user_id=$1 AND checkout_key=$2",
      [user.id, input.checkout_key],
    );
    if (previous)
      return {
        id: previous.id,
        total_cents: previous.estimated_total_cents,
        payment_method: "cod",
        duplicate: true,
      };
    const {
      rows: [product],
    } = await tx.query<Product>(
      "SELECT * FROM plastimad.products WHERE id=$1 AND active=true AND demo=false FOR SHARE",
      [input.product_id],
    );
    if (
      !product ||
      product.price_cents <= 0 ||
      !product.colors.includes(input.color)
    )
      throw new HttpError(400, "Producto, precio o color no disponible.");
    const total = product.price_cents * input.quantity;
    if (total > 2147483647)
      throw new HttpError(400, "El importe supera el límite permitido.");
    const id = randomUUID();
    await tx.query(
      `INSERT INTO plastimad.requests(id,user_id,product_id,title,description,quantity,color,unit_price_cents,estimated_total_cents,product_snapshot,delivery,payment_method,checkout_key)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,'cod',$12)`,
      [
        id,
        user.id,
        product.id,
        `Pedido: ${product.name}`.slice(0, 150),
        "Compra contraentrega. Coordinar la entrega y cualquier coste de envío en esta conversación antes del despacho.",
        input.quantity,
        input.color,
        product.price_cents,
        total,
        JSON.stringify(product),
        JSON.stringify(input.delivery),
        input.checkout_key,
      ],
    );
    const message = `¡Gracias por tu compra, ${input.delivery.full_name}! Tu pedido #${id.slice(0, 8).toUpperCase()} fue registrado correctamente.\n${product.name} · ${input.color}\nCantidad: ${input.quantity}\nPrecio unitario: ${money(product.price_cents)}\nTotal de productos: ${money(total)}\nForma de pago: contraentrega. El pago está pendiente y se realiza al recibir el pedido. El envío se coordina y confirma contigo antes del despacho.\nEl equipo PLASTIMAD continuará la atención en esta conversación. Puedes escribirnos aquí para coordinar tu entrega.`;
    await tx.query(
      "INSERT INTO plastimad.request_events(id,request_id,author_id,message,status,system) VALUES($1,$2,$3,$4,'new',true)",
      [randomUUID(), id, user.id, message],
    );
    await tx.query(
      "INSERT INTO plastimad.audit(id,actor_id,action,target_id) VALUES($1,$2,'checkout.cod.created',$3)",
      [randomUUID(), user.id, id],
    );
    return { id, total_cents: total, payment_method: "cod", duplicate: false };
  });
}

export async function checkoutHandler(request: Request) {
  const user = await requireUser();
  if (user.role !== "customer")
    throw new HttpError(
      403,
      "Estás usando una cuenta de administrador. Inicia sesión con una cuenta de cliente para confirmar la compra.",
    );
  if (request.method !== "POST")
    throw new HttpError(405, "Método no permitido.");
  await limit(`checkout:${user.id}`, 30, 3600);
  const body = await jsonBody(request);
  if (body && typeof body === "object" && "items" in body)
    return createCartOrder(user, cartCheckout.parse(body));
  return createCodOrder(user, codCheckout.parse(body));
}
