import { loadEnvConfig } from "@next/env";
import { randomUUID } from "node:crypto";
import { db, query } from "../lib/server/db";
import { createUser, userColumns } from "../lib/server/auth";
import { hashPassword } from "../lib/server/security";
import { createCodOrder } from "../lib/server/checkout";
import { codCheckout } from "../lib/server/validation";
import { planterCollection } from "../lib/catalog/planter-collection";
import type { User } from "../lib/platform";

async function main() {
  loadEnvConfig(process.cwd());
  if (process.env.DATABASE_URL)
    throw new Error(
      "La preparación de demostración solo se permite en la base local.",
    );
  const adminPassword = process.env.DEMO_ADMIN_PASSWORD;
  const customerPassword = process.env.DEMO_CUSTOMER_PASSWORD;
  if (!adminPassword || !customerPassword)
    throw new Error(
      "Indica DEMO_ADMIN_PASSWORD y DEMO_CUSTOMER_PASSWORD. No se guardan en el código.",
    );
  const connection = await db();
  try {
    async function account(
      name: string,
      email: string,
      password: string,
      role: User["role"],
    ) {
      const [existing] = await query<User>(
        `SELECT ${userColumns} FROM plastimad.users WHERE email=$1`,
        [email],
      );
      if (existing && role === "customer" && existing.role !== "customer")
        throw new Error("La cuenta de prueba no corresponde a un cliente.");
      if (!existing) return createUser({ name, email, password }, role);
      const [updated] = await query<User>(
        `UPDATE plastimad.users SET name=$1,password_hash=$2,role=$3,active=true WHERE id=$4 RETURNING ${userColumns}`,
        [name, await hashPassword(password), role, existing.id],
      );
      await query("DELETE FROM plastimad.sessions WHERE user_id=$1", [
        existing.id,
      ]);
      return updated;
    }
    const admin = await account(
      "Dilan · Administrador",
      "dilan@plastimad.com",
      adminPassword,
      "administrator",
    );
    await account(
      "Cliente comprador",
      "comprador@plastimad.test",
      customerPassword,
      "customer",
    );
    const customer = await account(
      "Cliente de pruebas",
      "pruebas@plastimad.test",
      customerPassword,
      "customer",
    );
    const order = await createCodOrder(
      customer,
      codCheckout.parse({
        product_id: planterCollection[1].id,
        color: "Celeste",
        quantity: 2,
        payment_method: "cod",
        checkout_key: "327a1ce2-6f32-4be0-a635-dc488a86d0d1",
        delivery: {
          full_name: "Cliente de pruebas · DEMOSTRACIÓN",
          phone: "0000000000",
          city: "Ciudad de prueba",
          address: "Dirección ficticia de demostración, sin entrega real.",
          reference: "Pedido para exponer el sistema; no enviar productos.",
        },
      }),
    );
    if (!order.duplicate) {
      await query(
        "UPDATE plastimad.requests SET title='Pedido de prueba: Cónica' WHERE id=$1",
        [order.id],
      );
      await query(
        "INSERT INTO plastimad.request_events(id,request_id,author_id,message) VALUES($1,$2,$3,$4)",
        [
          randomUUID(),
          order.id,
          customer.id,
          "Este pedido es de demostración. Quisiera coordinar la entrega desde este chat de prueba.",
        ],
      );
      await query(
        "INSERT INTO plastimad.request_events(id,request_id,author_id,message) VALUES($1,$2,$3,$4)",
        [
          randomUUID(),
          order.id,
          admin.id,
          "Hola. Hemos recibido tu pedido de prueba de 2 macetas Cónicas celestes. Total de productos: USD 70,00, contraentrega. Desde aquí coordinaremos la entrega y te informaremos del estado. Este registro es de demostración y no se despacha.",
        ],
      );
    }
    console.log(
      "Administrador: dilan@plastimad.com. Clientes: comprador@plastimad.test y pruebas@plastimad.test.",
    );
    console.log(
      `Pedido de demostración: ${order.id} · USD ${(order.total_cents / 100).toFixed(2)}. No se envió ningún correo ni se realizó ningún cobro.`,
    );
  } finally {
    await connection.close();
  }
}
main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : "No se pudo preparar la demostración",
  );
  process.exitCode = 1;
});
