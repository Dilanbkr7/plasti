import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { authHandler } from "@/lib/server/auth-handlers";
import { catalogHandler } from "@/lib/server/catalog";
import { requestHandler } from "@/lib/server/requests";
import {
  feedbackHandler,
  integrationStatus,
  usersHandler,
} from "@/lib/server/administration";
import { analysisHandler, chatHandler } from "@/lib/server/ai";
import { checkOrigin, HttpError } from "@/lib/server/security";
import { publicAssistant } from "@/lib/server/public-assistant";
import { storefrontData } from "@/lib/server/storefront";
import { personalizationHandler } from "@/lib/server/personalization";
import { checkoutHandler } from "@/lib/server/checkout";
import { databaseBrowser } from "@/lib/server/database-browser";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
async function handle(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    if (
      process.env.NETLIFY &&
      (!process.env.DATABASE_URL ||
        !process.env.APP_URL?.startsWith("https://"))
    )
      throw new HttpError(
        503,
        "Configura la base de datos y el dominio HTTPS del sistema.",
      );
    if (!["GET", "HEAD"].includes(request.method)) checkOrigin(request);
    const [resource, id, sub, ...rest] = (await params).path;
    if (rest.length) throw new HttpError(404, "Ruta no encontrada.");
    let result: unknown;
    if (resource === "checkout" && !id) result = await checkoutHandler(request);
    else if (resource === "database" && !id)
      result = await databaseBrowser(request);
    else if (resource === "personalization" && (!sub || sub === "image"))
      result = await personalizationHandler(request, id, sub === "image");
    else if (resource === "assistant" && !id)
      result = await publicAssistant(request);
    else if (resource === "storefront" && !id && request.method === "GET")
      result = await storefrontData();
    else if (resource === "auth" && id && !sub)
      result = await authHandler(request, id);
    else if (resource === "products" && !sub)
      result = await catalogHandler(request, id);
    else if (resource === "requests" && !sub)
      result = await requestHandler(request, id);
    else if (resource === "users" && !sub)
      result = await usersHandler(request, id);
    else if (resource === "feedback" && !sub)
      result = await feedbackHandler(request, id);
    else if (resource === "analyses" && (!sub || sub === "image"))
      result = await analysisHandler(request, id, sub === "image");
    else if (resource === "chat" && !id) result = await chatHandler(request);
    else if (resource === "status" && !id && request.method === "GET")
      result = await integrationStatus();
    else throw new HttpError(404, "Ruta no encontrada.");
    if (result instanceof Response) return result;
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    let status = 500,
      message = "No se pudo completar la operación. Intenta de nuevo.";
    if (error instanceof HttpError) {
      status = error.status;
      message = error.message;
    } else if (error instanceof ZodError) {
      status = 400;
      message =
        "Revisa los campos: " +
        error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .slice(0, 3)
          .join("; ");
    } else if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === "23505"
    ) {
      status = 409;
      message = "Ya existe un registro con esos datos.";
    } else
      console.error("PLASTIMAD operation failed", {
        kind: error instanceof Error ? error.name : "unknown",
      });
    return NextResponse.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
export {
  handle as GET,
  handle as POST,
  handle as PUT,
  handle as PATCH,
  handle as DELETE,
};
