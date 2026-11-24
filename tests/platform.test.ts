import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, mkdtemp } from "node:fs/promises";
import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { db, query } from "../lib/server/db";
import { createUser } from "../lib/server/auth";
import { digest, hashPassword, verifyPassword } from "../lib/server/security";
import { estimate } from "../lib/server/ai";
import type { Product } from "../lib/platform";
import { rowEstimate } from "../lib/space-estimate";
import { spaceMeasurements } from "../lib/server/validation";
import { safeDestination } from "../lib/navigation";
import { planterCollection } from "../lib/catalog/planter-collection";

const origin = "http://127.0.0.1:3101";
const password = `Test-${randomBytes(18).toString("hex")}`;
const resetToken = randomBytes(32).toString("hex");
let server: ChildProcess;
let adminId: string;
let clientId: string;
let productId: string;
let requestId: string;
let feedbackId: string;
const analysisId = randomUUID();
class Client {
  cookie = "";
  async request(
    route: string,
    method = "GET",
    body?: unknown,
    customOrigin = origin,
  ) {
    const response = await fetch(`${origin}/api/${route}`, {
      method,
      headers: {
        "content-type": "application/json",
        origin: customOrigin,
        ...(this.cookie ? { cookie: this.cookie } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const cookies = response.headers.getSetCookie();
    if (cookies.length)
      this.cookie = cookies.map((c) => c.split(";")[0]).join("; ");
    return {
      status: response.status,
      data: await response.json(),
      headers: response.headers,
    };
  }
}
const admin = new Client(),
  alice = new Client(),
  bob = new Client(),
  guest = new Client();
before(
  async () => {
    await mkdir(".data", { recursive: true });
    process.env.LOCAL_DATABASE_PATH = await mkdtemp(
      path.join(process.cwd(), ".data/qa-"),
    );
    process.env.DATABASE_URL = "";
    process.env.ALLOW_LOCAL_DATABASE = "true";
    adminId = (
      await createUser(
        { name: "Admin QA", email: "admin-qa@example.test", password },
        "administrator",
      )
    ).id;
    clientId = (
      await createUser({
        name: "Alice QA",
        email: "alice-qa@example.test",
        password,
      })
    ).id;
    const b = await createUser({
      name: "Bob QA",
      email: "bob-qa@example.test",
      password,
    });
    await query(
      "INSERT INTO plastimad.reset_tokens(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '30 minutes')",
      [digest(resetToken), b.id],
    );
    await query(
      "INSERT INTO plastimad.analyses(id,user_id,image,context,result,total_cents) VALUES($1,$2,$3,$4,$5,0)",
      [
        analysisId,
        clientId,
        Buffer.from("test-only-image"),
        "Espacio de prueba aislado",
        JSON.stringify({ summary: "Prueba", limitations: "Sin IA", items: [] }),
      ],
    );
    for (const item of planterCollection)
      await query(
        "INSERT INTO plastimad.products(id,name,description,category,price_cents,colors,sizes,image_url,model_url,active,demo) VALUES($1,$2,$3,'Macetas',$4,$5::jsonb,$6::jsonb,$7,'',true,false)",
        [
          item.id,
          item.name,
          item.description,
          item.price_cents,
          JSON.stringify(["Negro carbón", "Tomate", "Celeste"]),
          JSON.stringify(["Medidas por confirmar"]),
          `/images/coleccion/${item.slug}.webp`,
        ],
      );
    await (await db()).close();
    server = spawn(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "start",
        "-p",
        "3101",
        "--hostname",
        "127.0.0.1",
      ],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_ENV: "production",
          APP_URL: origin,
          OPENAI_API_KEY: "",
          HF_TOKEN: "",
          SMTP_HOST: "",
          SMTP_FROM: "",
          NETLIFY: "",
        },
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      },
    );
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("QA server did not start")),
        45000,
      );
      const read = (chunk: Buffer) => {
        if (chunk.toString().includes("Ready")) {
          clearTimeout(timeout);
          resolve();
        }
      };
      server.stdout?.on("data", read);
      server.stderr?.on("data", () => {});
      server.once("exit", (code) => {
        clearTimeout(timeout);
        reject(new Error(`QA server exited: ${code}`));
      });
    });
  },
  { timeout: 60000 },
);
after(() => {
  server?.kill();
});

test("passwords are salted, verified and never stored as plaintext", async () => {
  const a = await hashPassword(password),
    b = await hashPassword(password);
  assert.notEqual(a, b);
  assert.ok(await verifyPassword(password, a));
  assert.equal(await verifyPassword("incorrect-password", a), false);
});
test("anonymous access and cross-origin mutations are blocked", async () => {
  assert.equal((await guest.request("users")).status, 401);
  assert.equal((await guest.request("requests")).status, 401);
  assert.equal(
    (
      await guest.request(
        "auth/login",
        "POST",
        { email: "admin-qa@example.test", password },
        "https://attacker.example",
      )
    ).status,
    403,
  );
});
test("public registration cannot self-assign administrator", async () => {
  const result = await guest.request("auth/register", "POST", {
    name: "Mallory QA",
    email: "mallory-qa@example.test",
    password,
    role: "administrator",
    active: true,
  });
  assert.equal(result.status, 200);
  assert.equal(result.data.user.role, "customer");
  assert.equal((await guest.request("users")).status, 403);
  assert.equal((await guest.request("auth/logout", "POST", {})).status, 200);
});
test("both roles can log in; session cookies are HttpOnly and not in response data", async () => {
  for (const [client, email] of [
    [admin, "admin-qa@example.test"],
    [alice, "alice-qa@example.test"],
    [bob, "bob-qa@example.test"],
  ] as const) {
    const result = await client.request("auth/login", "POST", {
      email,
      password,
    });
    assert.equal(result.status, 200);
    assert.ok(result.headers.get("set-cookie")?.includes("HttpOnly"));
    assert.equal(result.data.user.password_hash, undefined);
  }
  assert.equal(
    (
      await guest.request("auth/login", "POST", {
        email: "admin-qa@example.test",
        password: "invalid",
      })
    ).status,
    401,
  );
});
test("registered customers persist, can log in again and appear in administrator accounts without passwords", async () => {
  const registered = new Client();
  const login = await registered.request("auth/login", "POST", {
    email: "mallory-qa@example.test",
    password,
  });
  assert.equal(login.status, 200);
  assert.equal(login.data.user.role, "customer");
  const users = await admin.request("users");
  assert.equal(users.status, 200);
  const saved = users.data.users.find(
    (u: { email: string }) => u.email === "mallory-qa@example.test",
  );
  assert.equal(saved.id, login.data.user.id);
  assert.equal(saved.active, true);
  assert.equal(saved.password, undefined);
  assert.equal(saved.password_hash, undefined);
  assert.ok(Number.isFinite(Date.parse(saved.created_at)));
  assert.ok(Number.isFinite(Date.parse(saved.last_login_at)));
  const audit = await admin.request("database?table=audit");
  const activity = audit.data.rows.filter(
    (row: { actor_id: string }) => row.actor_id === saved.id,
  );
  assert.ok(
    activity.some((row: { action: string }) => row.action === "user.created"),
  );
  const accessCount = activity.filter(
    (row: { action: string }) => row.action === "auth.login",
  ).length;
  assert.ok(accessCount >= 2); // Session at signup, then a successful sign-in.
  const failed = await guest.request("auth/login", "POST", {
    email: saved.email,
    password: "incorrect-password",
  });
  assert.equal(failed.status, 401);
  const afterFailure = await admin.request("database?table=audit");
  assert.equal(
    afterFailure.data.rows.filter(
      (row: { actor_id: string; action: string }) =>
        row.actor_id === saved.id && row.action === "auth.login",
    ).length,
    accessCount,
  );
  const panel = await fetch(`${origin}/panel`, {
    headers: { cookie: registered.cookie },
  });
  assert.equal(panel.status, 200);
  const html = await panel.text();
  assert.match(html, /Mis pedidos/);
  assert.match(html, /Mi cuenta/);
  assert.match(html, /Quejas y sugerencias/);
  assert.doesNotMatch(html, /Nueva consulta|Cuéntanos tu proyecto/);
  const legacyLink = await fetch(
    `${origin}/panel?view=requests&product=${planterCollection[0].id}`,
    {
      headers: { cookie: registered.cookie },
    },
  );
  assert.doesNotMatch(await legacyLink.text(), /Cuéntanos tu proyecto/);
});

test("server-rendered pages enforce role redirects", async () => {
  for (const route of [
    "/acceso",
    "/registro",
    "/catalogo",
    "/recuperar",
    "/carrito",
  ]) {
    const response = await fetch(`${origin}${route}`);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /PLASTIMAD/);
  }
  const anonymous = await fetch(`${origin}/panel`, { redirect: "manual" });
  assert.equal(anonymous.status, 307);
  assert.match(anonymous.headers.get("location") || "", /acceso/);
  const denied = await fetch(`${origin}/admin`, {
    redirect: "manual",
    headers: { cookie: alice.cookie },
  });
  assert.equal(denied.status, 307);
  assert.equal(denied.headers.get("location"), "/panel");
  const dashboard = await fetch(`${origin}/admin`, {
    headers: { cookie: admin.cookie },
  });
  assert.equal(dashboard.status, 200);
  const html = await dashboard.text();
  assert.match(html, /Pedidos y mensajes/);
  assert.match(html, />Productos<\/button>/);
  assert.match(html, />Gestión<\/summary>/);
  assert.match(html, />Clientes y cuentas<\/button>/);
  assert.doesNotMatch(html, /<aside/);
});
test("stored analysis images are private to their owner and administrators", async () => {
  const url = `${origin}/api/analyses/${analysisId}/image`;
  assert.equal((await fetch(url)).status, 401);
  assert.equal(
    (await fetch(url, { headers: { cookie: bob.cookie } })).status,
    404,
  );
  for (const account of [alice, admin]) {
    const response = await fetch(url, { headers: { cookie: account.cookie } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
  }
  assert.equal((await bob.request("analyses")).data.analyses.length, 0);
});
test("catalog writes require administrator and validate prices", async () => {
  const product = {
    name: "Maceta QA",
    description: "Producto aislado para pruebas de integración.",
    category: "Macetas",
    price_cents: 4500,
    unit: "unidad",
    colors: ["Nogal"],
    sizes: ["M"],
    model_url: "/models/maceta.glb",
    image_url: "",
    active: true,
    demo: false,
  };
  assert.equal((await alice.request("products", "POST", product)).status, 403);
  assert.equal(
    (await admin.request("products", "POST", { ...product, price_cents: -1 }))
      .status,
    400,
  );
  const result = await admin.request("products", "POST", product);
  assert.equal(result.status, 200);
  productId = result.data.product.id;
  const demo = await admin.request("products", "POST", {
    ...product,
    name: "Producto de demostración QA",
    demo: true,
  });
  assert.equal(demo.status, 200);
  const publicProducts = (await guest.request("products")).data
    .products as Product[];
  assert.ok(publicProducts.some((p) => p.id === productId));
  assert.ok(!publicProducts.some((p) => p.id === demo.data.product.id));
  assert.ok(
    (await admin.request("products?all=true")).data.products.some(
      (p: Product) => p.id === demo.data.product.id,
    ),
  );
});
test("request ownership and amounts are assigned on server", async () => {
  const body = {
    title: "Terraza QA",
    description: "Necesito una propuesta para mi terraza.",
    quantity: 3,
    product_id: productId,
    color: "Nogal",
    size: "M",
    finish: "Natural",
    user_id: adminId,
    estimated_total_cents: 1,
    status: "closed",
  };
  assert.equal((await alice.request("requests", "POST", body)).status, 403);
  const r = await admin.request("requests", "POST", {
    ...body,
    customer_id: clientId,
  });
  assert.equal(r.status, 200);
  requestId = r.data.id;
  assert.equal(
    (await alice.request(`requests/${requestId}`, "PUT", body)).status,
    403,
  );
  assert.equal(
    (
      await alice.request(`requests/${requestId}`, "PATCH", {
        status: "cancelled",
      })
    ).status,
    409,
  );
  const saved = await alice.request(`requests/${requestId}`);
  assert.equal(saved.data.request.user_id, clientId);
  assert.equal(saved.data.request.estimated_total_cents, 13500);
  assert.equal(saved.data.request.status, "new");
  assert.equal((await bob.request(`requests/${requestId}`)).status, 404);
  assert.equal((await bob.request("requests")).data.requests.length, 0);
});
test("state transitions and internal notes are protected", async () => {
  assert.equal(
    (
      await admin.request(`requests/${requestId}`, "PATCH", {
        status: "closed",
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await alice.request(`requests/${requestId}`, "PATCH", {
        status: "quoted",
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await alice.request(`requests/${requestId}`, "PATCH", {
        message: "secret",
        internal: true,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await admin.request(`requests/${requestId}`, "PATCH", {
        status: "reviewing",
        message: "Private note QA",
        internal: true,
      })
    ).status,
    200,
  );
  const client = await alice.request(`requests/${requestId}`);
  assert.equal(
    client.data.events.some((e: { internal: boolean }) => e.internal),
    false,
  );
  assert.equal(
    (await admin.request(`requests/${requestId}`)).data.events.length,
    2,
  );
  const message = "Quisiera continuar con mi solicitud anterior.";
  assert.equal(
    (await alice.request(`requests/${requestId}`, "PATCH", { message })).status,
    200,
  );
  assert.equal(
    (await admin.request(`requests/${requestId}`)).data.events.at(-1).message,
    message,
  );
  assert.equal(
    (await bob.request(`requests/${requestId}`, "PATCH", { message })).status,
    404,
  );
});
test("feedback is private and administrator replies reach the owner", async () => {
  const r = await alice.request("feedback", "POST", {
    kind: "suggestion",
    subject: "Mejorar información",
    message: "Quisiera conocer más acabados del producto.",
  });
  assert.equal(r.status, 200);
  feedbackId = r.data.feedback.id;
  assert.equal((await bob.request("feedback")).data.feedback.length, 0);
  assert.equal(
    (
      await alice.request(`feedback/${feedbackId}`, "PATCH", {
        status: "resolved",
        response: "No",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await admin.request(`feedback/${feedbackId}`, "PATCH", {
        status: "resolved",
        response: "Gracias, incorporaremos la información.",
      })
    ).status,
    200,
  );
  assert.equal(
    (await alice.request("feedback")).data.feedback[0].status,
    "resolved",
  );
});
test("cash on delivery creates an owned priced order, one automatic message and safe retries", async () => {
  const payload = {
    product_id: planterCollection[1].id,
    color: "Celeste",
    quantity: 2,
    payment_method: "cod",
    checkout_key: randomUUID(),
    delivery: {
      full_name: "Cliente QA",
      phone: "0000000000",
      city: "Ciudad de prueba",
      address: "Dirección ficticia de prueba, sin despacho real",
      reference: "Prueba automatizada del sistema",
    },
    user_id: "fake",
    estimated_total_cents: 1,
  };
  assert.equal((await guest.request("checkout", "POST", payload)).status, 401);
  const adminCheckout = await admin.request("checkout", "POST", payload);
  assert.equal(adminCheckout.status, 403);
  assert.match(
    adminCheckout.data.error,
    /cuenta de administrador.*cuenta de cliente/,
  );
  assert.equal(
    (
      await alice.request("checkout", "POST", {
        ...payload,
        delivery: { ...payload.delivery, address: "" },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await alice.request("checkout", "POST", {
        ...payload,
        color: "Inventado",
      })
    ).status,
    400,
  );
  const result = await alice.request("checkout", "POST", payload);
  assert.equal(result.status, 200);
  assert.equal(result.data.total_cents, 7000);
  const repeats = await Promise.all([
    alice.request("checkout", "POST", payload),
    alice.request("checkout", "POST", payload),
  ]);
  for (const r of repeats) assert.equal(r.data.id, result.data.id);
  const detail = await alice.request(`requests/${result.data.id}`);
  assert.equal(detail.data.request.user_id, clientId);
  assert.equal(detail.data.request.payment_method, "cod");
  assert.equal(detail.data.request.delivery.address, payload.delivery.address);
  assert.equal(detail.data.events.length, 1);
  assert.equal(detail.data.events[0].system, true);
  assert.match(detail.data.events[0].message, /Gracias por tu compra/);
  assert.match(detail.data.events[0].message, /70[,.]00/);
  assert.equal((await bob.request(`requests/${result.data.id}`)).status, 404);
  assert.equal(
    (
      await alice.request(`requests/${result.data.id}`, "PATCH", {
        message: "Hola, coordinemos la entrega del pedido.",
        system: true,
      })
    ).status,
    200,
  );
  const thread = await admin.request(`requests/${result.data.id}`);
  assert.equal(thread.data.events[1].system, false);
  assert.equal(
    (
      await admin.request(`requests/${result.data.id}`, "PATCH", {
        message: "Recibido, estamos coordinando tu entrega.",
      })
    ).status,
    200,
  );
  for (const status of ["confirmed", "preparing", "shipped"])
    assert.equal(
      (await admin.request(`requests/${result.data.id}`, "PATCH", { status }))
        .status,
      200,
    );
  assert.equal(
    (
      await alice.request(`requests/${result.data.id}`, "PATCH", {
        status: "cancelled",
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await alice.request(`requests/${result.data.id}`, "PATCH", {
        message: "He recibido la información del envío.",
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await admin.request(`requests/${result.data.id}`, "PATCH", {
        status: "delivered",
      })
    ).status,
    200,
  );
});

test("cart checkout creates one private multi-product order with trusted totals and retry protection", async () => {
  const payload = {
    items: [
      {
        product_id: planterCollection[0].id,
        color: "Tomate",
        quantity: 2,
        unit_price_cents: 1,
      },
      { product_id: planterCollection[1].id, color: "Celeste", quantity: 1 },
    ],
    expected_total_cents: 8500,
    checkout_key: randomUUID(),
    payment_method: "cod",
    delivery: {
      full_name: "Cliente QA",
      phone: "0000000000",
      city: "Ciudad QA",
      address: "Dirección ficticia del carrito, sin envío",
      reference: "Prueba automatizada del carrito",
    },
  };
  assert.equal((await guest.request("checkout", "POST", payload)).status, 401);
  assert.equal((await admin.request("checkout", "POST", payload)).status, 403);
  const before = (await alice.request("requests")).data.requests.length;
  assert.equal(
    (
      await alice.request("checkout", "POST", {
        ...payload,
        expected_total_cents: 1,
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await alice.request("checkout", "POST", {
        ...payload,
        items: [
          ...payload.items,
          {
            product_id: planterCollection[2].id,
            color: "Inventado",
            quantity: 1,
          },
        ],
      })
    ).status,
    400,
  );
  assert.equal((await alice.request("requests")).data.requests.length, before);
  const results = await Promise.all([
    alice.request("checkout", "POST", payload),
    alice.request("checkout", "POST", payload),
  ]);
  for (const result of results) {
    assert.equal(result.status, 200);
    assert.equal(result.data.id, results[0].data.id);
    assert.equal(result.data.total_cents, 8500);
  }
  const id = results[0].data.id;
  const detail = await alice.request(`requests/${id}`);
  assert.equal(detail.data.request.items.length, 2);
  assert.equal(detail.data.request.quantity, 3);
  assert.equal(detail.data.request.items[0].unit_price_cents, 2500);
  assert.equal(detail.data.request.items[0].subtotal_cents, 5000);
  assert.equal(detail.data.request.items[1].color, "Celeste");
  assert.equal(detail.data.request.estimated_total_cents, 8500);
  assert.equal(detail.data.events.length, 1);
  assert.match(detail.data.events[0].message, /Gracias por tu compra/);
  assert.match(detail.data.events[0].message, /Semiesférica/);
  assert.match(detail.data.events[0].message, /Cónica/);
  assert.equal((await bob.request(`requests/${id}`)).status, 404);
  const response = await admin.request(`requests/${id}`, "PATCH", {
    message: "Coordinamos la entrega de las dos referencias del pedido.",
  });
  assert.equal(response.status, 200);
  assert.equal((await alice.request(`requests/${id}`)).data.events.length, 2);
});

test("a newly registered customer can order, sign in again and exchange private messages with administration", async () => {
  const buyer = new Client();
  const account = await buyer.request("auth/register", "POST", {
    name: "Comprador nuevo QA",
    email: "pedido-nuevo-qa@example.test",
    password,
  });
  assert.equal(account.status, 200);
  const created = await buyer.request("checkout", "POST", {
    product_id: planterCollection[0].id,
    color: "Tomate",
    quantity: 1,
    payment_method: "cod",
    checkout_key: randomUUID(),
    delivery: {
      full_name: "Comprador nuevo QA",
      phone: "0000000000",
      city: "Ciudad de prueba",
      address: "Dirección ficticia del cliente nuevo",
      reference: "Sin despacho, prueba automatizada",
    },
  });
  assert.equal(created.status, 200);
  assert.equal(created.data.total_cents, 2500);
  const id = created.data.id;
  assert.equal((await buyer.request("auth/logout", "POST", {})).status, 200);
  assert.equal((await buyer.request(`requests/${id}`)).status, 401);
  assert.equal(
    (
      await buyer.request("auth/login", "POST", {
        email: "pedido-nuevo-qa@example.test",
        password,
      })
    ).status,
    200,
  );
  const ownOrders = await buyer.request("requests");
  assert.deepEqual(
    ownOrders.data.requests.map((r: { id: string }) => r.id),
    [id],
  );
  assert.equal((await alice.request(`requests/${id}`)).status, 404);
  assert.equal(
    (
      await buyer.request(`requests/${id}`, "PATCH", {
        message: "Quisiera coordinar la entrega de mi primera compra.",
      })
    ).status,
    200,
  );
  const received = await admin.request(`requests/${id}`);
  assert.equal(
    received.data.request.customer_email,
    "pedido-nuevo-qa@example.test",
  );
  assert.equal(received.data.request.user_id, account.data.user.id);
  assert.match(received.data.events[0].message, /Gracias por tu compra/);
  assert.equal(
    (
      await admin.request(`requests/${id}`, "PATCH", {
        status: "confirmed",
        message: "Pedido confirmado, coordinaremos contigo la entrega.",
      })
    ).status,
    200,
  );
  const answered = await buyer.request(`requests/${id}`);
  assert.equal(answered.data.request.status, "confirmed");
  assert.match(answered.data.events.at(-1).message, /Pedido confirmado/);
  const accounts = await admin.request("users");
  const saved = accounts.data.users.find(
    (u: { id: string }) => u.id === account.data.user.id,
  );
  assert.ok(saved.last_login_at);
  assert.equal(saved.password_hash, undefined);
  const table = await admin.request("database?table=users");
  const row = table.data.rows.find(
    (u: { id: string }) => u.id === account.data.user.id,
  );
  assert.equal(row?.email, "pedido-nuevo-qa@example.test");
  assert.equal(row?.role, "customer");
  assert.equal(row?.password_hash, undefined);
});

test("database viewer is read-only, administrator-only and never exposes credential values", async () => {
  assert.equal((await guest.request("database")).status, 401);
  assert.equal((await alice.request("database")).status, 403);
  const result = await admin.request("database?table=users");
  assert.equal(result.status, 200);
  assert.equal(result.data.schema, "plastimad");
  assert.ok(
    result.data.tables.some((t: { name: string }) => t.name === "requests"),
  );
  assert.ok(
    result.data.rows.every(
      (r: Record<string, unknown>) => !("password_hash" in r),
    ),
  );
  assert.equal(
    (await admin.request("database?table=sessions")).data.rows.length,
    0,
  );
  assert.equal(
    (await admin.request("database?table=users%3BDROP")).status,
    400,
  );
  assert.equal((await admin.request("database", "POST", {})).status, 405);
});
test("profile edits cannot change role; disabling user invalidates sessions", async () => {
  assert.equal(
    (
      await alice.request("auth/profile", "POST", {
        name: "Alice Actualizada",
        phone: "",
        company: "QA",
        role: "administrator",
      })
    ).status,
    200,
  );
  assert.equal(
    (await alice.request("auth/session")).data.user.role,
    "customer",
  );
  assert.equal(
    (
      await admin.request(`users/${adminId}`, "PATCH", {
        name: "Admin QA",
        role: "customer",
        active: false,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await admin.request(`users/${clientId}`, "PATCH", {
        name: "Alice QA",
        role: "customer",
        active: false,
      })
    ).status,
    200,
  );
  assert.equal((await alice.request("requests")).status, 401);
  assert.equal(
    (
      await alice.request("auth/login", "POST", {
        email: "alice-qa@example.test",
        password,
      })
    ).status,
    401,
  );
});
test("reset tokens are single-use and revoke previous sessions", async () => {
  const changed = password + "new";
  assert.equal(
    (
      await guest.request("auth/reset", "POST", {
        token: resetToken,
        password: changed,
      })
    ).status,
    200,
  );
  assert.equal((await bob.request("requests")).status, 401);
  assert.equal(
    (
      await guest.request("auth/reset", "POST", {
        token: resetToken,
        password: changed,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await bob.request("auth/login", "POST", {
        email: "bob-qa@example.test",
        password: changed,
      })
    ).status,
    200,
  );
});
test("unconfigured external integrations fail clearly instead of simulating success", async () => {
  assert.equal(
    (await bob.request("chat", "POST", { message: "¿Qué colores tienen?" }))
      .status,
    503,
  );
  assert.equal(
    (
      await guest.request("auth/forgot", "POST", {
        email: "bob-qa@example.test",
      })
    ).status,
    503,
  );
  assert.equal((await admin.request("status")).data.ai, false);
});
test("AI pricing uses catalog prices and drops invented products and duplicates", () => {
  const products = [
    { id: "real", active: true, price_cents: 1234, name: "Producto" },
  ] as Product[];
  const result = estimate(
    [
      { product_id: "fake", quantity: 900, reason: "bad" },
      { product_id: "real", quantity: 2, reason: "ok" },
      { product_id: "real", quantity: 99, reason: "duplicate" },
    ],
    products,
  );
  assert.equal(result.total, 2468);
  assert.equal(result.items.length, 1);
});
test("landing exposes assistant, commercial forms and planter storytelling", async () => {
  const page = await fetch(origin);
  const html = await page.text();
  assert.equal(page.status, 200);
  for (const text of [
    "Asistente PLASTIMAD",
    "Quejas",
    "asesoria",
    "te-escuchamos",
    "Personaliza tu espacio",
    "Preparar mi personalización",
    "conica.webp",
  ])
    assert.ok(html.toLowerCase().includes(text.toLowerCase()), text);
  assert.equal((await fetch(`${origin}/macetas-3d`)).status, 200);
  assert.ok(!html.includes('id="calcula-espacio"'));
  assert.ok(!html.includes('id="producto"'));
  assert.ok(
    html.includes('href="/acceso"'),
    "public landing offers an optional sign-in link",
  );
  assert.ok(
    !/href="\/registro(?:[?"#])/.test(html),
    "registration remains in the purchase flow",
  );
});

test("personalization exposes only database products and never simulates generation", async () => {
  const response = await guest.request("personalization");
  assert.equal(response.status, 200);
  assert.equal(response.data.available, false);
  assert.equal(response.data.catalog.expectedProducts, 6);
  assert.equal(response.data.catalog.complete, true);
  assert.equal(response.data.catalog.candidates.length, 6);
  const live = await guest.request("products");
  for (const candidate of response.data.catalog.candidates) {
    assert.ok(
      live.data.products.some((p: Product) => p.id === candidate.product.id),
    );
    assert.equal(candidate.product.demo, false);
    for (const variant of candidate.references) {
      assert.equal(variant.product_id, candidate.product.id);
      assert.ok(candidate.product.colors.includes(variant.color));
      assert.notEqual(variant.color, "Verde naturaleza");
    }
  }
  const generation = await guest.request("personalization", "POST", {});
  assert.equal(generation.status, 503);
  assert.match(generation.data.error, /activar/);
  assert.equal(generation.data.proposal, undefined);
});

test("collection purchase keeps real product ID, black variant and the supplied unit price", async () => {
  const chosen = planterCollection.find((p) => p.slug === "esferica")!;
  const order = {
    product_id: chosen.id,
    color: "Negro carbón",
    quantity: 2,
    payment_method: "cod",
    checkout_key: randomUUID(),
    delivery: {
      full_name: "Comprador QA",
      phone: "0000000000",
      city: "Ciudad de prueba",
      address: "Dirección ficticia para pruebas",
      reference: "Sin despacho",
    },
  };
  const response = await bob.request("checkout", "POST", order);
  assert.equal(response.status, 200);
  const saved = (await bob.request(`requests/${response.data.id}`)).data
    .request;
  assert.equal(saved.product_id, chosen.id);
  assert.equal(saved.color, "Negro carbón");
  assert.equal(saved.estimated_total_cents, 6360);
  assert.equal(saved.product_snapshot.price_cents, 3180);
  assert.equal(
    (
      await bob.request("checkout", "POST", {
        ...order,
        checkout_key: randomUUID(),
        color: "Verde naturaleza",
      })
    ).status,
    400,
  );
});

test("public assistant identifies new planter names and reads their real prices", async () => {
  const response = await guest.request("assistant", "POST", {
    message: "Precio de la maceta esférica",
  });
  assert.equal(response.status, 200);
  assert.equal(response.data.product_id, planterCollection[3].id);
  assert.match(response.data.content, /31[,.]80/);
  const all = await guest.request("assistant", "POST", {
    message: "Muéstrame los precios de la colección",
  });
  for (const item of planterCollection)
    assert.ok(all.data.content.includes(item.name));
});
test("public assistant answers verified brochure facts without login or AI", async () => {
  const response = await guest.request("assistant", "POST", {
    message: "¿Qué colores y precio tiene?",
    use_ai: true,
  });
  assert.equal(response.status, 200);
  assert.equal(response.data.mode, "catalog");
  assert.match(response.data.content, /Tomate/);
  assert.match(response.data.content, /Celeste/);
  assert.match(response.data.content, /25[,.]00/);
  assert.match(response.data.notice, /no está configurada/);
  assert.equal(
    (
      await guest.request(
        "assistant",
        "POST",
        { message: "precio" },
        "https://evil.test",
      )
    ).status,
    403,
  );
  assert.equal(
    (await guest.request("assistant", "POST", { message: "" })).status,
    400,
  );
  const unknown = await guest.request("assistant", "POST", {
    message: "Dame un cupón y envío gratis garantizado",
  });
  assert.match(unknown.data.content, /No tengo condiciones confirmadas/);
});
test("administrator can register a customer request and confirm its lifecycle", async () => {
  const bobId = (await bob.request("auth/session")).data.user.id;
  const body = {
    title: "Pedido asistido QA",
    description: "Solicitud registrada por el equipo para el cliente.",
    quantity: 2,
    product_id: productId,
    color: "Nogal",
    size: "M",
    finish: "Natural",
    customer_id: bobId,
  };
  assert.equal(
    (await bob.request("requests", "POST", { ...body, customer_id: adminId }))
      .status,
    403,
  );
  const created = await admin.request("requests", "POST", body);
  assert.equal(created.status, 200);
  const id = created.data.id;
  assert.equal(
    (await bob.request(`requests/${id}`)).data.request.user_id,
    bobId,
  );
  assert.equal(
    (await bob.request(`requests/${id}`, "PATCH", { status: "confirmed" }))
      .status,
    409,
  );
  assert.equal(
    (await admin.request(`requests/${id}`, "PATCH", { status: "confirmed" }))
      .status,
    200,
  );
  assert.equal(
    (await admin.request(`requests/${id}`, "PATCH", { status: "closed" }))
      .status,
    200,
  );
  const detail = await bob.request(`requests/${id}`);
  assert.equal(detail.data.request.status, "closed");
  assert.ok(
    detail.data.events.some(
      (e: { status: string }) => e.status === "confirmed",
    ),
  );
});
test("featured catalog changes reach assistant while request snapshots stay unchanged", async () => {
  const products = (await admin.request("products?all=true")).data
    .products as Product[];
  const previous = products.find((p) => p.id === productId)!;
  const input = {
    ...previous,
    name: "Maceta con medidas QA",
    price_cents: 6999,
    length_cm: 40,
    width_cm: 40,
    height_cm: 80,
    featured: true,
    image_url: "/images/coleccion/semiesferica.webp",
  };
  assert.equal(
    (
      await admin.request(`products/${productId}`, "PATCH", {
        ...input,
        width_cm: -1,
      })
    ).status,
    400,
  );
  assert.equal(
    (await admin.request(`products/${productId}`, "PATCH", input)).status,
    200,
  );
  const featured = await guest.request("storefront");
  assert.equal(featured.data.product.id, productId);
  assert.equal(featured.data.published, true);
  const answer = await guest.request("assistant", "POST", {
    message: "precio y medidas",
  });
  assert.match(answer.data.content, /69[,.]99/);
  assert.match(answer.data.content, /40 × 40 × 80/);
  const historical = (await admin.request(`requests/${requestId}`)).data
    .request;
  assert.equal(historical.product_snapshot.price_cents, 4500);
  assert.equal(historical.product_snapshot.name, "Maceta QA");
  assert.equal(historical.estimated_total_cents, 13500);
  assert.equal(
    (await admin.request(`products/${productId}`, "DELETE")).status,
    200,
  );
  assert.equal(
    (
      await guest.request("assistant", "POST", {
        message: "precio",
        product_id: productId,
      })
    ).status,
    404,
  );
  assert.equal((await guest.request("storefront")).data.published, false);
});
test("space estimate uses submitted lengths and published footprint", () => {
  const space = {
    length_m: 4,
    width_m: 3,
    gap_cm: 20,
    layout: "edge" as const,
  };
  const p = { length_cm: 40, width_cm: 40 } as Product;
  assert.equal(rowEstimate(space, p)?.quantity, 7);
  assert.equal(rowEstimate(space, { ...p, width_cm: 400 })?.quantity, 0);
  assert.equal(rowEstimate(space, { ...p, length_cm: null }), null);
  assert.equal(
    spaceMeasurements.safeParse({ ...space, length_m: -1 }).success,
    false,
  );
  assert.equal(
    spaceMeasurements.safeParse({ ...space, width_m: "" }).success,
    false,
  );
});
test("return to landing after login is restricted to safe local destinations", () => {
  assert.equal(safeDestination("/#asesoria", "/panel"), "/#asesoria");
  for (const bad of [
    "//evil.test",
    "/\\evil.test",
    "https://evil.test",
    "/api/auth/logout",
  ])
    assert.equal(safeDestination(bad, "/panel"), "/panel");
});
test("logout revokes server session", async () => {
  const cookie = admin.cookie;
  assert.equal((await admin.request("auth/logout", "POST", {})).status, 200);
  admin.cookie = cookie;
  assert.equal((await admin.request("users")).status, 401);
});
