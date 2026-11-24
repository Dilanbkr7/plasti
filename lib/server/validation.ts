import { z } from "zod";
const text = (min: number, max: number) => z.string().trim().min(min).max(max);
export const email = z.email().trim().toLowerCase().max(200);
export const password = z
  .string()
  .min(12, "La contraseña debe tener al menos 12 caracteres.")
  .max(128);
export const registration = z.object({ name: text(2, 100), email, password });
export const profile = z.object({
  name: text(2, 100),
  phone: text(0, 40),
  company: text(0, 120),
});
export const product = z.object({
  name: text(2, 150),
  description: text(10, 3000),
  category: text(2, 80),
  price_cents: z.number().int().min(0).max(100000000),
  unit: text(1, 30),
  colors: z.array(text(1, 30)).min(1).max(20),
  sizes: z.array(text(1, 30)).min(1).max(20),
  model_url: z.union([
    z.literal(""),
    z.string().regex(/^\/models\/[a-zA-Z0-9_\-/]+\.glb$/),
  ]),
  image_url: z.union([
    z.literal(""),
    z.string().regex(/^\/images\/[a-zA-Z0-9_\-/]+\.(webp|png|jpe?g)$/),
  ]),
  active: z.boolean(),
  demo: z.boolean(),
  length_cm: z.number().positive().max(1000).nullable().default(null),
  width_cm: z.number().positive().max(1000).nullable().default(null),
  height_cm: z.number().positive().max(1000).nullable().default(null),
  featured: z.boolean().default(false),
});
export const spaceMeasurements = z.object({
  length_m: z.coerce.number().positive().max(100),
  width_m: z.coerce.number().positive().max(100),
  gap_cm: z.coerce.number().min(0).max(500),
  layout: z.literal("edge"),
});
export const commercialRequest = z.object({
  title: text(3, 150),
  description: text(10, 4000),
  quantity: z.number().int().min(1).max(10000),
  product_id: z.uuid().nullable(),
  customer_id: z.uuid().optional(),
  analysis_id: z.uuid().nullable().optional(),
  color: text(0, 40),
  size: text(0, 40),
  finish: text(0, 40),
});
export const feedback = z.object({
  kind: z.enum(["complaint", "suggestion"]),
  subject: text(3, 150),
  message: text(10, 3000),
});
export const requestUpdate = z.object({
  status: z
    .enum([
      "new",
      "reviewing",
      "quoted",
      "confirmed",
      "preparing",
      "shipped",
      "delivered",
      "closed",
      "cancelled",
    ])
    .optional(),
  message: text(0, 3000).default(""),
  internal: z.boolean().default(false),
});
export const userUpdate = z.object({
  name: text(2, 100),
  role: z.enum(["customer", "administrator"]),
  active: z.boolean(),
});
export const chatInput = z.object({ message: text(1, 2000) });
export const codCheckout = z.object({
  product_id: z.uuid(),
  color: text(1, 40),
  quantity: z.number().int().min(1).max(99),
  checkout_key: z.uuid(),
  payment_method: z.literal("cod"),
  delivery: z.object({
    full_name: text(3, 100),
    phone: text(7, 30)
      .regex(/^[+\d()\s-]+$/, "Escribe un teléfono válido.")
      .refine(
        (value) => value.replace(/\D/g, "").length >= 7,
        "El teléfono debe tener al menos 7 dígitos.",
      ),
    city: text(2, 100),
    address: text(10, 350),
    reference: text(5, 350),
  }),
});
export const cartCheckout = codCheckout
  .pick({ checkout_key: true, payment_method: true, delivery: true })
  .extend({
    items: z
      .array(
        codCheckout.pick({ product_id: true, color: true, quantity: true }),
      )
      .min(1)
      .max(30),
    expected_total_cents: z.number().int().min(1).max(2147483647),
  });
export const recommendation = z.object({
  summary: z.string().max(3000),
  limitations: z.string().max(3000),
  items: z
    .array(
      z.object({
        product_id: z.string(),
        quantity: z.number().int().min(1).max(10000),
        reason: z.string().max(1500),
      }),
    )
    .max(8),
});
