import { randomUUID } from "node:crypto";
import { db } from "./db";
import { HttpError } from "./security";
import { cartCheckout } from "./validation";
import { money, type OrderLine, type Product, type User } from "../platform";
import { cartItemKey, type CartItem } from "../cart";
import type { z } from "zod";

/** Multi-product orders share the existing requests, messages and checkout key. */
export async function createCartOrder(
  user: User,
  input: z.infer<typeof cartCheckout>,
) {
  if (user.role !== "customer")
    throw new HttpError(403, "Compra con una cuenta de cliente.");
  return (await db()).transaction(async (tx) => {
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
    const grouped = new Map<string, CartItem>();
    for (const item of input.items) {
      const key = cartItemKey(item),
        count = (grouped.get(key)?.quantity || 0) + item.quantity;
      if (count > 99)
        throw new HttpError(
          400,
          "El máximo es 99 unidades por maceta y color.",
        );
      grouped.set(key, { ...item, quantity: count });
    }
    const { rows: products } = await tx.query<Product>(
      "SELECT * FROM plastimad.products WHERE id=ANY($1::uuid[]) AND active=true AND demo=false ORDER BY id FOR SHARE",
      [[...new Set(input.items.map((item) => item.product_id))]],
    );
    const lines: OrderLine[] = [...grouped.values()].map((item) => {
      const product = products.find((p) => p.id === item.product_id);
      if (
        !product ||
        product.price_cents <= 0 ||
        !product.colors.includes(item.color)
      )
        throw new HttpError(
          400,
          "Una maceta o color del carrito ya no está disponible. Revisa el carrito antes de continuar.",
        );
      return {
        ...item,
        name: product.name,
        unit_price_cents: product.price_cents,
        subtotal_cents: product.price_cents * item.quantity,
        image_url: product.image_url,
      };
    });
    const total = lines.reduce((sum, line) => sum + line.subtotal_cents, 0);
    if (total > 2147483647)
      throw new HttpError(400, "El importe supera el límite permitido.");
    if (input.expected_total_cents !== total)
      throw new HttpError(
        409,
        "El precio de un producto cambió. Actualiza el carrito y revisa el nuevo total antes de confirmar.",
      );
    const single =
      lines.length === 1
        ? products.find((p) => p.id === lines[0].product_id)!
        : null;
    const quantity = lines.reduce((sum, line) => sum + line.quantity, 0);
    const colors = [...new Set(lines.map((line) => line.color))];
    const id = randomUUID();
    const summary = lines
      .map(
        (line) =>
          `${line.name} · ${line.color}\nCantidad: ${line.quantity} · Precio unitario: ${money(line.unit_price_cents)} · Subtotal: ${money(line.subtotal_cents)}`,
      )
      .join("\n\n");
    await tx.query(
      `INSERT INTO plastimad.requests(id,user_id,product_id,title,description,quantity,color,unit_price_cents,estimated_total_cents,product_snapshot,delivery,payment_method,checkout_key,items)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,'cod',$12,$13::jsonb)`,
      [
        id,
        user.id,
        single?.id || null,
        single ? `Compra de ${single.name}` : `Pedido de ${quantity} macetas`,
        summary,
        quantity,
        colors.length === 1 ? colors[0] : "Varios colores",
        single ? lines[0].unit_price_cents : 0,
        total,
        single ? JSON.stringify(single) : null,
        JSON.stringify(input.delivery),
        input.checkout_key,
        JSON.stringify(lines),
      ],
    );
    const message = `¡Gracias por tu compra, ${input.delivery.full_name}! Tu pedido #${id.slice(0, 8).toUpperCase()} fue registrado correctamente.\n${summary}\n\nTotal de productos: ${money(total)}\nForma de pago: contraentrega. El pago está pendiente y se realiza al recibir el pedido. El envío se coordina y confirma contigo antes del despacho.\nEl equipo PLASTIMAD continuará la atención en esta conversación. Puedes escribirnos aquí para coordinar tu entrega.`;
    await tx.query(
      "INSERT INTO plastimad.request_events(id,request_id,author_id,message,status,system) VALUES($1,$2,$3,$4,'new',true)",
      [randomUUID(), id, user.id, message],
    );
    await tx.query(
      "INSERT INTO plastimad.audit(id,actor_id,action,target_id) VALUES($1,$2,'checkout.cart.created',$3)",
      [randomUUID(), user.id, id],
    );
    return { id, total_cents: total, payment_method: "cod", duplicate: false };
  });
}
