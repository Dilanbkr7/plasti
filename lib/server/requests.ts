import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireUser } from "./auth";
import { db, query } from "./db";
import { HttpError, jsonBody, limit } from "./security";
import { commercialRequest, requestUpdate } from "./validation";
import type {
  Analysis,
  CommercialRequest,
  Product,
  RequestEvent,
  RequestStatus,
  User,
} from "../platform";
import { requestTransitions as transitions } from "../platform";
export function canTransition(
  role: User["role"],
  from: RequestStatus,
  to: RequestStatus,
) {
  return role === "administrator"
    ? transitions[from].includes(to)
    : to === "cancelled" &&
        ["new", "reviewing", "quoted", "confirmed", "preparing"].includes(from);
}
export async function requestHandler(request: Request, id?: string) {
  const user = await requireUser();
  const admin = user.role === "administrator";
  if (id) z.uuid().parse(id);
  if (request.method === "GET") {
    if (id) {
      const [item] = await query<CommercialRequest>(
        "SELECT r.*,u.name customer_name,u.email customer_email FROM plastimad.requests r JOIN plastimad.users u ON u.id=r.user_id WHERE r.id=$1 AND ($2=true OR r.user_id=$3)",
        [id, admin, user.id],
      );
      if (!item) throw new HttpError(404, "Solicitud no encontrada.");
      const events = await query<RequestEvent>(
        `SELECT e.*,u.name author_name FROM plastimad.request_events e JOIN plastimad.users u ON u.id=e.author_id WHERE request_id=$1 AND ($2=true OR internal=false) ORDER BY created_at`,
        [id, admin],
      );
      return { request: item, events };
    }
    return {
      requests: await query<CommercialRequest>(
        `SELECT r.*,u.name customer_name,u.email customer_email,COALESCE(r.product_snapshot->>'name',p.name) product_name FROM plastimad.requests r JOIN plastimad.users u ON u.id=r.user_id LEFT JOIN plastimad.products p ON p.id=r.product_id WHERE ($1=true OR r.user_id=$2) ORDER BY r.updated_at DESC LIMIT 500`,
        [admin, user.id],
      ),
    };
  }
  if (!admin && (request.method === "POST" || request.method === "PUT"))
    throw new HttpError(
      403,
      "Los pedidos se registran al confirmar la compra en la tienda.",
    );
  await limit(`requests:${user.id}`, 100, 3600);
  const body = await jsonBody(request);
  if ((request.method === "POST" && !id) || (request.method === "PUT" && id)) {
    const input = commercialRequest.parse(body);
    const result = await (
      await db()
    ).transaction(async (tx) => {
      let owner = user.id;
      if (!id) {
        if (!input.customer_id)
          throw new HttpError(400, "Selecciona un cliente activo.");
        const {
          rows: [client],
        } = await tx.query<User>(
          "SELECT id FROM plastimad.users WHERE id=$1 AND role='customer' AND active=true",
          [input.customer_id],
        );
        if (!client) throw new HttpError(400, "Selecciona un cliente activo.");
        owner = client.id;
      }
      if (id) {
        const {
          rows: [old],
        } = await tx.query<CommercialRequest>(
          "SELECT * FROM plastimad.requests WHERE id=$1 FOR UPDATE",
          [id],
        );
        if (!old || old.status !== "new" || old.payment_method === "cod")
          throw new HttpError(
            409,
            "Solo puedes editar una solicitud autorizada que siga Por confirmar.",
          );
        owner = old.user_id;
      }
      let price = 0,
        total = 0;
      let snapshot: Product | null = null;
      if (input.product_id) {
        const {
          rows: [p],
        } = await tx.query<Product>(
          "SELECT * FROM plastimad.products WHERE id=$1 AND active=true",
          [input.product_id],
        );
        if (!p) throw new HttpError(400, "Selecciona un producto disponible.");
        if (
          (input.color && !p.colors.includes(input.color)) ||
          (input.size && !p.sizes.includes(input.size))
        )
          throw new HttpError(
            400,
            "La combinación no está disponible en este producto.",
          );
        price = p.price_cents;
        snapshot = p;
        total = price * input.quantity;
      }
      if (input.analysis_id) {
        const {
          rows: [a],
        } = await tx.query<Analysis>(
          "SELECT id,total_cents FROM plastimad.analyses WHERE id=$1 AND user_id=$2",
          [input.analysis_id, owner],
        );
        if (!a) throw new HttpError(404, "Análisis no encontrado.");
        total = a.total_cents;
      }
      if (total > 2147483647)
        throw new HttpError(
          400,
          "El importe supera el límite de una solicitud.",
        );
      const requestId = id || randomUUID();
      const values = [
        input.title,
        input.description,
        input.quantity,
        input.product_id,
        input.color,
        input.size,
        input.finish,
        price,
        total,
        input.analysis_id || null,
        requestId,
      ];
      if (id)
        await tx.query(
          "UPDATE plastimad.requests SET title=$1,description=$2,quantity=$3,product_id=$4,color=$5,size=$6,finish=$7,unit_price_cents=$8,estimated_total_cents=$9,analysis_id=$10,updated_at=now() WHERE id=$11",
          values,
        );
      else
        await tx.query(
          "INSERT INTO plastimad.requests(title,description,quantity,product_id,color,size,finish,unit_price_cents,estimated_total_cents,analysis_id,id,user_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)",
          [...values, owner],
        );
      await tx.query(
        "UPDATE plastimad.requests SET product_snapshot=$1 WHERE id=$2",
        [snapshot ? JSON.stringify(snapshot) : null, requestId],
      );
      await tx.query(
        "INSERT INTO plastimad.request_events(id,request_id,author_id,message,status) VALUES($1,$2,$3,$4,'new')",
        [
          randomUUID(),
          requestId,
          user.id,
          id
            ? "Se actualizaron los datos de la solicitud."
            : "Solicitud registrada. Pendiente de revisión comercial.",
        ],
      );
      return requestId;
    });
    return { id: result };
  }
  if (request.method === "PATCH" && id) {
    const input = requestUpdate.parse(body);
    if (input.internal && !admin)
      throw new HttpError(
        403,
        "Solo el administrador puede crear notas internas.",
      );
    if (!input.message && !input.status)
      throw new HttpError(400, "Escribe un mensaje o selecciona un estado.");
    await (
      await db()
    ).transaction(async (tx) => {
      const {
        rows: [item],
      } = await tx.query<CommercialRequest>(
        "SELECT * FROM plastimad.requests WHERE id=$1 AND ($2=true OR user_id=$3) FOR UPDATE",
        [id, admin, user.id],
      );
      if (!item) throw new HttpError(404, "Solicitud no encontrada.");
      if (
        input.status &&
        ((!admin && item.payment_method !== "cod") ||
          !canTransition(user.role, item.status, input.status))
      )
        throw new HttpError(409, "Ese cambio de estado no está permitido.");
      if (!admin && ["closed", "cancelled"].includes(item.status))
        throw new HttpError(409, "Esta solicitud ya está finalizada.");
      await tx.query(
        "UPDATE plastimad.requests SET status=COALESCE($1,status),updated_at=now() WHERE id=$2",
        [input.status || null, id],
      );
      await tx.query(
        "INSERT INTO plastimad.request_events(id,request_id,author_id,message,status,internal) VALUES($1,$2,$3,$4,$5,$6)",
        [
          randomUUID(),
          id,
          user.id,
          input.message || "Estado actualizado.",
          input.status || null,
          input.internal,
        ],
      );
    });
    return { ok: true };
  }
  throw new HttpError(405, "Método no permitido.");
}
