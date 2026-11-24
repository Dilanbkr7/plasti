import { cookies } from "next/headers";
import { randomInt, randomUUID } from "node:crypto";
import { z } from "zod";
import { query } from "./db";
import { digest, HttpError, limit, token } from "./security";
import {
  buildPersonalizationCatalog,
  resolveProposal,
} from "../personalization/catalog";
import type { Product } from "../platform";
import type {
  CatalogSelection,
  ColorPreference,
  PersonalizationCapabilities,
} from "../personalization/types";
import {
  eligibleCandidates,
  finishEdit,
  hfSpaces,
  parseRecommendation,
  startEdit,
  normalizePhoto,
} from "./personalization/huggingface";

interface Job {
  id: string;
  phase: "selecting" | "generating" | "ready" | "error";
  source_image: Uint8Array | null;
  result_image: Uint8Array | null;
  preference: ColorPreference;
  excluded: string[];
  selection: CatalogSelection | null;
  reason: string | null;
  event_id: string | null;
  error_message: string | null;
}
const preferenceSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("auto") }),
  z.object({
    mode: z.literal("selected"),
    color: z.enum(["Negro carbón", "Tomate", "Celeste"]),
  }),
]);
async function catalog() {
  return buildPersonalizationCatalog(
    await query<Product>(
      "SELECT * FROM plastimad.products WHERE active=true AND demo=false ORDER BY created_at,id LIMIT 500",
    ),
  );
}
export async function personalizationCapabilities(): Promise<PersonalizationCapabilities> {
  const collection = await catalog();
  const available =
    Boolean(process.env.HF_TOKEN?.trim()) && collection.complete;
  return {
    available,
    catalog: collection,
    message: available
      ? "Cada propuesta usa una maceta disponible del catálogo, elegida al azar entre las que aún no has probado en esta ronda. Qwen edita tu foto en una sola ejecución de Hugging Face."
      : !collection.complete
        ? "Completa las seis macetas y sus referencias en el catálogo antes de generar."
        : "La personalización con IA está lista para activar. PLASTIMAD debe completar la conexión con Hugging Face para empezar a generar propuestas.",
  };
}
async function owner(create = false) {
  const jar = await cookies();
  let value = jar.get("plastimad_personalization")?.value;
  if (!value || !/^[a-f0-9]{64}$/.test(value)) {
    if (!create)
      throw new HttpError(
        404,
        "Propuesta no encontrada o sesión de personalización caducada.",
      );
    value = token();
    jar.set("plastimad_personalization", value, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.APP_URL?.startsWith("https://") || false,
      path: "/",
      maxAge: 86400,
    });
  }
  return digest(value);
}
async function loadJob(id: string, ownerHash: string) {
  z.uuid().parse(id);
  const [job] = await query<Job>(
    "SELECT * FROM plastimad.personalization_jobs WHERE id=$1 AND owner_hash=$2 AND expires_at>now()",
    [id, ownerHash],
  );
  if (!job)
    throw new HttpError(
      404,
      "La propuesta ha caducado o pertenece a otra sesión. Sube tu foto para comenzar de nuevo.",
    );
  return job;
}
function pending(job: Pick<Job, "id" | "phase">) {
  return {
    status: "pending" as const,
    id: job.id,
    message:
      job.phase === "selecting"
        ? "La IA está analizando tu espacio y eligiendo una maceta del catálogo…"
        : "Hugging Face recibió tu solicitud. Estamos esperando la imagen de Qwen…",
  };
}
async function jobResponse(job: Job) {
  if (job.phase === "error")
    throw new HttpError(
      502,
      job.error_message || "No se pudo generar la propuesta.",
    );
  if (job.phase !== "ready") return pending(job);
  const collection = await catalog();
  const proposal =
    job.selection &&
    resolveProposal(
      collection,
      job.selection,
      job.preference,
      `/api/personalization/${job.id}/image`,
    );
  if (!proposal)
    throw new HttpError(
      409,
      "El producto o color ya no está disponible. Genera otra propuesta con el catálogo actual.",
    );
  return {
    status: "ready" as const,
    proposal: { ...proposal, reason: job.reason || "" },
  };
}
async function submit(request: Request) {
  const capabilities = await personalizationCapabilities();
  if (!capabilities.available) throw new HttpError(503, capabilities.message);
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data"))
    throw new HttpError(415, "Sube una fotografía mediante el formulario.");
  if (Number(request.headers.get("content-length")) > 4500000)
    throw new HttpError(413, "La fotografía debe pesar menos de 4 MB.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Falta la fotografía.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > 4500000)
        throw new HttpError(413, "La fotografía debe pesar menos de 4 MB.");
      chunks.push(part.value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const form = await new Response(Buffer.concat(chunks), {
    headers: { "Content-Type": request.headers.get("content-type")! },
  }).formData();
  if (form.get("consent") !== "true")
    throw new HttpError(
      400,
      "Autoriza el envío de tu fotografía a Hugging Face para personalizar el espacio.",
    );
  const photo = form.get("image");
  if (
    !(photo instanceof File) ||
    photo.size === 0 ||
    photo.size > 4000000 ||
    !["image/jpeg", "image/png", "image/webp"].includes(photo.type)
  )
    throw new HttpError(400, "Usa una foto JPG, PNG o WebP de hasta 4 MB.");
  let preference: ColorPreference, excluded: string[];
  try {
    preference = preferenceSchema.parse(
      JSON.parse(String(form.get("preference"))),
    );
    excluded = z
      .array(z.uuid())
      .max(6)
      .parse(JSON.parse(String(form.get("excluded") || "[]")));
  } catch {
    throw new HttpError(
      400,
      "Revisa el color seleccionado y vuelve a intentar.",
    );
  }
  const candidates = eligibleCandidates(
    capabilities.catalog.candidates,
    preference,
    excluded,
  );
  if (!candidates.length)
    throw new HttpError(
      409,
      "Ya exploraste todas las macetas disponibles. Pulsa «Volver a explorar» para empezar otra ronda.",
    );
  const ownerHash = await owner(true);
  await limit(`personalization:${ownerHash}`, 6, 3600);
  await limit("personalization:global", 18, 3600);
  await query(
    "DELETE FROM plastimad.personalization_jobs WHERE expires_at<now()",
  );
  const image = await normalizePhoto(new Uint8Array(await photo.arrayBuffer()));
  const candidate = candidates[randomInt(candidates.length)];
  const reference =
    candidate.references[randomInt(candidate.references.length)];
  const selection: CatalogSelection = {
    product_id: candidate.product.id,
    color: reference.color,
  };
  const id = randomUUID();
  // One in-flight job per guest, enforced by a partial unique DB index.
  const saved = await query<{ id: string }>(
    `INSERT INTO plastimad.personalization_jobs(id,owner_hash,phase,preference,excluded,selection,expires_at)
    VALUES($1,$2,'generating',$3,$4,$5,now()+interval '20 minutes') ON CONFLICT DO NOTHING RETURNING id`,
    [
      id,
      ownerHash,
      JSON.stringify(preference),
      JSON.stringify(excluded),
      JSON.stringify(selection),
    ],
  );
  if (!saved.length)
    throw new HttpError(
      409,
      "Ya hay una propuesta en curso. Espera a que termine antes de generar otra.",
    );
  try {
    const event = await startEdit(image, selection, candidates);
    await query(
      "UPDATE plastimad.personalization_jobs SET event_id=$1 WHERE id=$2",
      [event, id],
    );
  } catch (error) {
    await query(
      "UPDATE plastimad.personalization_jobs SET phase='error',source_image=NULL,error_message=$1 WHERE id=$2",
      [
        error instanceof HttpError
          ? error.message
          : "No se pudo iniciar la IA. Intenta después.",
        id,
      ],
    );
    throw error;
  }
  return pending({ id, phase: "generating" });
}
async function poll(id: string) {
  const ownerHash = await owner();
  const job = await loadJob(id, ownerHash);
  if (job.phase === "ready" || job.phase === "error") return jobResponse(job);
  // The local server can keep the stream open longer than a hosted function.
  const local = process.env.NODE_ENV === "development" && !process.env.NETLIFY;
  const editorWaitMs = local ? 90000 : 32000;
  const leaseSeconds = Math.ceil(editorWaitMs / 1000) + 25;
  const claimed = await query<{ id: string }>(
    "UPDATE plastimad.personalization_jobs SET lease_until=now()+$4::integer*interval '1 second' WHERE id=$1 AND phase=$2 AND event_id=$3 AND (lease_until IS NULL OR lease_until<now()) RETURNING id",
    [id, job.phase, job.event_id, leaseSeconds],
  );
  if (!claimed.length) return pending(job);
  try {
    if (!job.event_id) return pending(job);
    const spaces = hfSpaces();
    const data = await (job.phase === "selecting"
      ? spaces.vision.result("qwen_vl_inference", job.event_id)
      : // Gradio can discard a queued event when its listener disconnects.
        // Give the editor time to finish while leaving room for the download.
        spaces.editor.result("infer", job.event_id, editorWaitMs));
    const collection = await catalog();
    const candidates = eligibleCandidates(
      collection.candidates,
      job.preference,
      job.excluded,
    );
    if (job.phase === "selecting") {
      const recommended = parseRecommendation(data, candidates);
      const selection = {
        product_id: recommended.product_id,
        color: recommended.color,
      };
      const event = await startEdit(job.source_image!, selection, candidates);
      await query(
        "UPDATE plastimad.personalization_jobs SET phase='generating',event_id=$1,selection=$2,reason=$3 WHERE id=$4",
        [event, JSON.stringify(selection), recommended.reason, id],
      );
    } else {
      if (
        !job.selection ||
        !resolveProposal(
          collection,
          job.selection,
          job.preference,
          "/proposal.webp",
        )
      )
        throw new HttpError(
          409,
          "El producto ya no está disponible. Genera otra propuesta.",
        );
      const image = await finishEdit(data);
      await query(
        "UPDATE plastimad.personalization_jobs SET phase='ready',source_image=NULL,result_image=$1,expires_at=now()+interval '24 hours' WHERE id=$2",
        [image, id],
      );
    }
    return jobResponse(await loadJob(id, ownerHash));
  } catch (error) {
    const message =
      error instanceof HttpError
        ? error.message
        : "No pudimos completar la propuesta. Vuelve a intentar más tarde.";
    await query(
      "UPDATE plastimad.personalization_jobs SET phase='error',source_image=NULL,error_message=$1 WHERE id=$2",
      [message, id],
    );
    throw error;
  } finally {
    await query(
      "UPDATE plastimad.personalization_jobs SET lease_until=NULL WHERE id=$1",
      [id],
    );
  }
}
export async function personalizationHandler(
  request: Request,
  id?: string,
  image = false,
) {
  if (request.method === "GET" && !id) return personalizationCapabilities();
  if (request.method === "POST" && !id) return submit(request);
  if (request.method === "GET" && id) {
    if (!image) return poll(id);
    const job = await loadJob(id, await owner());
    if (job.phase !== "ready" || !job.result_image)
      throw new HttpError(404, "Imagen todavía no disponible.");
    return new Response(new Uint8Array(job.result_image), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  throw new HttpError(405, "Método no permitido.");
}
