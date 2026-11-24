import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createUser, requireUser, userColumns } from "./auth";
import { db, query } from "./db";
import { HttpError, jsonBody, limit } from "./security";
import { feedback, registration, userUpdate } from "./validation";
import { emailConfigured } from "./mail";
import type { Feedback, User } from "../platform";

export async function usersHandler(request: Request, id?: string) {
  const actor = await requireUser("administrator");
  if (request.method === "GET")
    return {
      users: await query<User>(
        `SELECT ${userColumns},
          (SELECT max(a.created_at) FROM plastimad.audit a
            WHERE a.actor_id=users.id AND a.action='auth.login') AS last_login_at
          FROM plastimad.users ORDER BY created_at DESC LIMIT 500`,
      ),
    };
  if (request.method === "POST" && !id) {
    const input = registration
      .extend({ role: z.enum(["customer", "administrator"]) })
      .parse(await jsonBody(request));
    return { user: await createUser(input, input.role) };
  }
  if (request.method !== "PATCH" || !id)
    throw new HttpError(405, "Método no permitido.");
  z.uuid().parse(id);
  const input = userUpdate.parse(await jsonBody(request));
  await (
    await db()
  ).transaction(async (tx) => {
    // Serialize role changes so two concurrent edits cannot remove all admins.
    await tx.query("LOCK TABLE plastimad.users IN SHARE ROW EXCLUSIVE MODE");
    const {
      rows: [target],
    } = await tx.query<User>(
      `SELECT ${userColumns} FROM plastimad.users WHERE id=$1`,
      [id],
    );
    if (!target) throw new HttpError(404, "Usuario no encontrado.");
    if (id === actor.id && (!input.active || input.role !== "administrator"))
      throw new HttpError(
        400,
        "No puedes quitarte tu propio acceso administrativo.",
      );
    if (
      target.role === "administrator" &&
      target.active &&
      (!input.active || input.role !== "administrator")
    ) {
      const { rows } = await tx.query<User>(
        "SELECT id FROM plastimad.users WHERE role='administrator' AND active=true",
      );
      if (rows.length <= 1)
        throw new HttpError(
          409,
          "Debe permanecer al menos un administrador activo.",
        );
    }
    await tx.query(
      "UPDATE plastimad.users SET name=$1,role=$2,active=$3 WHERE id=$4",
      [input.name, input.role, input.active, id],
    );
    if (target.role !== input.role || !input.active)
      await tx.query("DELETE FROM plastimad.sessions WHERE user_id=$1", [id]);
    await tx.query(
      "INSERT INTO plastimad.audit(id,actor_id,action,target_id) VALUES($1,$2,'user.update',$3)",
      [randomUUID(), actor.id, id],
    );
  });
  return { ok: true };
}
export async function feedbackHandler(request: Request, id?: string) {
  const user = await requireUser();
  const admin = user.role === "administrator";
  if (request.method === "GET")
    return {
      feedback: await query<Feedback>(
        "SELECT f.*,u.name customer_name FROM plastimad.feedback f JOIN plastimad.users u ON u.id=f.user_id WHERE ($1=true OR user_id=$2) ORDER BY updated_at DESC LIMIT 500",
        [admin, user.id],
      ),
    };
  if (request.method === "POST") {
    await limit(`feedback:${user.id}`, 20, 3600);
    const input = feedback.parse(await jsonBody(request));
    const [saved] = await query<Feedback>(
      "INSERT INTO plastimad.feedback(id,user_id,kind,subject,message) VALUES($1,$2,$3,$4,$5) RETURNING *",
      [randomUUID(), user.id, input.kind, input.subject, input.message],
    );
    return { feedback: saved };
  }
  if (request.method === "PATCH" && id && admin) {
    z.uuid().parse(id);
    const input = z
      .object({
        status: z.enum(["open", "reviewing", "resolved"]),
        response: z.string().trim().min(3).max(3000),
      })
      .parse(await jsonBody(request));
    const [saved] = await query<Feedback>(
      "UPDATE plastimad.feedback SET status=$1,response=$2,updated_at=now() WHERE id=$3 RETURNING *",
      [input.status, input.response, id],
    );
    if (!saved) throw new HttpError(404, "Mensaje no encontrado.");
    return { feedback: saved };
  }
  throw new HttpError(admin ? 405 : 403, "Operación no permitida.");
}
export async function integrationStatus() {
  await requireUser("administrator");
  await query("SELECT 1");
  return {
    database: process.env.DATABASE_URL
      ? process.env.DATABASE_URL.includes("supabase")
        ? "supabase"
        : "postgresql"
      : "local",
    ai: Boolean(process.env.OPENAI_API_KEY),
    personalization: Boolean(process.env.HF_TOKEN?.trim()),
    email: emailConfigured(),
  };
}
