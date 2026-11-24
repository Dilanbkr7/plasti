import nodemailer from "nodemailer";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { HttpError } from "./security";
export function emailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}
export async function sendRecovery(email: string, url: string) {
  const text = `Se solicitó restablecer tu contraseña de PLASTIMAD. Abre este enlace en los próximos 30 minutos:\n\n${url}\n\nSi no lo solicitaste, ignora este mensaje.`;
  if (!emailConfigured()) {
    if (process.env.NODE_ENV === "production" || process.env.NETLIFY)
      throw new HttpError(
        503,
        "La recuperación de contraseña requiere que el administrador configure el correo.",
      );
    await mkdir(".data/mail", { recursive: true });
    await writeFile(
      `.data/mail/${randomUUID()}.txt`,
      `Para: ${email}\n\n${text}`,
      { mode: 0o600 },
    );
    return;
  }
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_PORT === "465",
    requireTLS: true,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });
  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Restablece tu contraseña de PLASTIMAD",
    text,
  });
}
