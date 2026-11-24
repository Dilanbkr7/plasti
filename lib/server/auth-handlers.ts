import { z } from "zod";
import { randomUUID } from "node:crypto";
import { db, query } from "./db";
import {
  authenticate,
  changePassword,
  createUser,
  currentUser,
  endSession,
  requireUser,
  startSession,
  userColumns,
} from "./auth";
import {
  digest,
  hashPassword,
  HttpError,
  jsonBody,
  limit,
  token,
} from "./security";
import { email, password, profile, registration } from "./validation";
import { emailConfigured, sendRecovery } from "./mail";
import type { User } from "../platform";

export async function authHandler(request: Request, action: string) {
  if (request.method === "GET" && action === "session")
    return { user: await currentUser() };
  if (request.method !== "POST")
    throw new HttpError(405, "Método no permitido.");
  const body = await jsonBody(request);
  const ip = process.env.NETLIFY
    ? request.headers.get("x-nf-client-connection-ip") || "unknown"
    : "local";
  if (action === "register") {
    await limit(`register:${ip}`, 10, 3600);
    const input = registration.parse(body);
    const user = await createUser(input);
    await startSession(user.id);
    return { user };
  }
  if (action === "login") {
    const input = z
      .object({ email, password: z.string().min(1).max(128) })
      .parse(body);
    await limit(`login-ip:${ip}`, 60, 900);
    await limit(`login:${input.email}`, 10, 900);
    const user = await authenticate(input.email, input.password);
    await endSession();
    await startSession(user.id);
    return {
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        email: user.email,
      },
    };
  }
  if (action === "logout") {
    await endSession();
    return { ok: true };
  }
  if (action === "forgot") {
    const input = z.object({ email }).parse(body);
    await limit(`forgot:${ip}`, 10, 3600);
    if (
      (process.env.NODE_ENV === "production" || process.env.NETLIFY) &&
      !emailConfigured()
    )
      throw new HttpError(
        503,
        "La recuperación por correo todavía no está configurada. Contacta al administrador.",
      );
    const [user] = await query<User>(
      `SELECT ${userColumns} FROM plastimad.users WHERE email=$1 AND active=true`,
      [input.email],
    );
    if (user) {
      const value = token();
      await query(
        "INSERT INTO plastimad.reset_tokens(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '30 minutes')",
        [digest(value), user.id],
      );
      await sendRecovery(
        user.email,
        `${process.env.APP_URL || "http://localhost:3000"}/restablecer?token=${value}`,
      );
    }
    return {
      message:
        "Si existe una cuenta activa con ese correo, recibirás instrucciones para recuperar el acceso.",
    };
  }
  if (action === "reset") {
    const input = z
      .object({ token: z.string().regex(/^[a-f0-9]{64}$/), password })
      .parse(body);
    await limit(`reset:${ip}`, 20, 3600);
    const hash = await hashPassword(input.password);
    await (
      await db()
    ).transaction(async (tx) => {
      const {
        rows: [reset],
      } = await tx.query<{ user_id: string }>(
        "DELETE FROM plastimad.reset_tokens WHERE token_hash=$1 AND expires_at>now() RETURNING user_id",
        [digest(input.token)],
      );
      if (!reset)
        throw new HttpError(400, "El enlace no es válido o ha caducado.");
      await tx.query(
        "UPDATE plastimad.users SET password_hash=$1 WHERE id=$2",
        [hash, reset.user_id],
      );
      await tx.query("DELETE FROM plastimad.sessions WHERE user_id=$1", [
        reset.user_id,
      ]);
      await tx.query("DELETE FROM plastimad.reset_tokens WHERE user_id=$1", [
        reset.user_id,
      ]);
      await tx.query(
        "INSERT INTO plastimad.audit(id,actor_id,action) VALUES($1,$2,'password.reset')",
        [randomUUID(), reset.user_id],
      );
    });
    await endSession();
    return { message: "Contraseña actualizada. Inicia sesión de nuevo." };
  }
  if (action === "profile") {
    const user = await requireUser();
    const input = profile.parse(body);
    const [updated] = await query<User>(
      `UPDATE plastimad.users SET name=$1,phone=$2,company=$3 WHERE id=$4 RETURNING ${userColumns}`,
      [input.name, input.phone, input.company, user.id],
    );
    return { user: updated };
  }
  if (action === "password") {
    const user = await requireUser();
    await limit(`password:${user.id}`, 10, 900);
    const input = z
      .object({ current: z.string().min(1).max(128), password })
      .parse(body);
    await authenticate(user.email, input.current);
    await changePassword(user.id, input.password);
    await endSession();
    return { ok: true };
  }
  throw new HttpError(404, "Ruta no encontrada.");
}
