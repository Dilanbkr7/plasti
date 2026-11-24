import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { db, query } from "./db";
import {
  digest,
  hashPassword,
  HttpError,
  token,
  verifyPassword,
} from "./security";
import type { Role, User } from "../platform";
export const userColumns = "id,name,email,phone,company,role,active,created_at";
const secureCookie = () => process.env.APP_URL?.startsWith("https://") ?? false;
const cookieName = () =>
  secureCookie() ? "__Host-plastimad_session" : "plastimad_session";
export async function currentUser(): Promise<User | null> {
  const value = (await cookies()).get(cookieName())?.value;
  if (!value || !/^[a-f0-9]{64}$/.test(value)) return null;
  const [user] = await query<User>(
    `SELECT u.id,u.name,u.email,u.phone,u.company,u.role,u.active,u.created_at FROM plastimad.users u JOIN plastimad.sessions s ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active=true`,
    [digest(value)],
  );
  return user || null;
}
export async function requireUser(role?: Role) {
  const user = await currentUser();
  if (!user) throw new HttpError(401, "Inicia sesión para continuar.");
  if (role && user.role !== role)
    throw new HttpError(403, "No tienes permiso para esta operación.");
  return user;
}
export async function createUser(
  input: { name: string; email: string; password: string },
  role: Role = "customer",
) {
  const hash = await hashPassword(input.password);
  return (await db()).transaction(async (tx) => {
    const {
      rows: [user],
    } = await tx.query<User>(
      `INSERT INTO plastimad.users(id,name,email,password_hash,role) VALUES($1,$2,$3,$4,$5) RETURNING ${userColumns}`,
      [randomUUID(), input.name, input.email, hash, role],
    );
    await tx.query(
      "INSERT INTO plastimad.audit(id,actor_id,action,target_id) VALUES($1,$2,'user.created',$2)",
      [randomUUID(), user.id],
    );
    return user;
  });
}
export async function authenticate(email: string, password: string) {
  const [user] = await query<User & { password_hash: string }>(
    "SELECT * FROM plastimad.users WHERE email=$1",
    [email],
  );
  const valid = await verifyPassword(
    password,
    user?.password_hash ||
      `scrypt:00000000000000000000000000000000:${"0".repeat(128)}`,
  );
  if (!user || !valid || !user.active)
    throw new HttpError(401, "Correo o contraseña incorrectos.");
  return user;
}
export async function startSession(userId: string) {
  const value = token();
  await (
    await db()
  ).transaction(async (tx) => {
    await tx.query(
      "INSERT INTO plastimad.sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '7 days')",
      [digest(value), userId],
    );
    await tx.query(
      "INSERT INTO plastimad.audit(id,actor_id,action,target_id) VALUES($1,$2,'auth.login',$2)",
      [randomUUID(), userId],
    );
  });
  (await cookies()).set(cookieName(), value, {
    httpOnly: true,
    secure: secureCookie(),
    sameSite: "lax",
    path: "/",
    maxAge: 604800,
  });
}
export async function endSession() {
  const jar = await cookies();
  const value = jar.get(cookieName())?.value;
  if (value)
    await query("DELETE FROM plastimad.sessions WHERE token_hash=$1", [
      digest(value),
    ]);
  jar.set(cookieName(), "", {
    httpOnly: true,
    secure: secureCookie(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
export async function changePassword(userId: string, password: string) {
  const hash = await hashPassword(password);
  await (
    await db()
  ).transaction(async (tx) => {
    await tx.query("UPDATE plastimad.users SET password_hash=$1 WHERE id=$2", [
      hash,
      userId,
    ]);
    await tx.query("DELETE FROM plastimad.sessions WHERE user_id=$1", [userId]);
    await tx.query("DELETE FROM plastimad.reset_tokens WHERE user_id=$1", [
      userId,
    ]);
  });
}
