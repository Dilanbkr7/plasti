import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import { query } from "./db";
const derive = promisify(scrypt);
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const token = () => randomBytes(32).toString("hex");
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = (await derive(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${key.toString("hex")}`;
}
export async function verifyPassword(password: string, encoded: string) {
  const [scheme, salt, hash] = encoded.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = (await derive(password, salt, 64)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = process.env.APP_URL
    ? new URL(process.env.APP_URL).origin
    : new URL(request.url).origin;
  // Both loopback names reach the same development server. Production keeps
  // the exact configured origin; a different port is always a different app.
  const loopback = new Set(["localhost", "127.0.0.1", "[::1]"]);
  let localAlias = false;
  if (
    origin &&
    process.env.NODE_ENV === "development" &&
    !process.env.NETLIFY
  ) {
    try {
      const incoming = new URL(origin),
        configured = new URL(expected),
        target = new URL(request.url);
      localAlias = [incoming, configured, target].every(
        (u) =>
          loopback.has(u.hostname) &&
          u.protocol === "http:" &&
          u.port === configured.port,
      );
    } catch {
      /* Invalid origins are rejected below. */
    }
  }
  if (!origin || (origin !== expected && !localAlias))
    throw new HttpError(403, "Origen de la solicitud no permitido.");
}
export async function limit(key: string, maximum: number, seconds: number) {
  const [row] = await query<{ attempts: number }>(
    `INSERT INTO plastimad.rate_limits(key,attempts,reset_at) VALUES($1,1,now()+$2*interval '1 second')
    ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN plastimad.rate_limits.reset_at<now() THEN 1 ELSE plastimad.rate_limits.attempts+1 END,
    reset_at=CASE WHEN plastimad.rate_limits.reset_at<now() THEN now()+$2*interval '1 second' ELSE plastimad.rate_limits.reset_at END RETURNING attempts`,
    [digest(key), seconds],
  );
  if (row.attempts > maximum)
    throw new HttpError(
      429,
      "Has realizado varios intentos. Espera unos minutos antes de volver a intentar.",
    );
}
export async function jsonBody(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new HttpError(415, "Se esperaba JSON.");
  if (Number(request.headers.get("content-length")) > 65536)
    throw new HttpError(413, "Solicitud demasiado grande.");
  const text = await request.text();
  if (text.length > 65536)
    throw new HttpError(413, "Solicitud demasiado grande.");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "Solicitud inválida.");
  }
}
