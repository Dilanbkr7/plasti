import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import sharp from "sharp";
import { randomInt } from "node:crypto";
import type {
  CatalogSelection,
  ColorPreference,
  PersonalizationCandidate,
} from "../../personalization/types";
import { GradioSpace, providerFailure } from "./gradio";
import { HttpError } from "../security";
import { planterColors } from "../../storefront";

export const defaultEditSpace =
  "https://lpx55-qwen-image-edit-2511-turbo-lightning.hf.space";
export const defaultVisionSpace =
  "https://developer0hye-qwen2-5-vl-7b-instruct.hf.space";
export function hfSpaces() {
  const token = process.env.HF_TOKEN?.trim() || "";
  return {
    vision: new GradioSpace(
      process.env.HF_VISION_SPACE_URL || defaultVisionSpace,
      token,
    ),
    editor: new GradioSpace(
      process.env.HF_IMAGE_SPACE_URL || defaultEditSpace,
      token,
    ),
  };
}
export function eligibleCandidates(
  candidates: PersonalizationCandidate[],
  preference: ColorPreference,
  excluded: string[],
) {
  return candidates
    .filter((c) => !excluded.includes(c.product.id))
    .map((c) => ({
      ...c,
      references: c.references.filter(
        (r) => preference.mode === "auto" || r.color === preference.color,
      ),
    }))
    .filter((c) => c.references.length > 0);
}
const selectionSchema = z.object({
  product_id: z.uuid(),
  color: z.string().min(1).max(40),
  reason: z.string().trim().min(10).max(700),
});
export function parseRecommendation(
  data: unknown[],
  candidates: PersonalizationCandidate[],
) {
  const text = data[0];
  if (typeof text !== "string" || text.length > 12000)
    throw providerFailure("");
  const start = text.indexOf("{"),
    end = text.lastIndexOf("}");
  let result: z.infer<typeof selectionSchema>;
  try {
    result = selectionSchema.parse(JSON.parse(text.slice(start, end + 1)));
  } catch {
    throw new HttpError(
      422,
      "La IA no devolvió una recomendación válida. Vuelve a intentar; no se ha seleccionado ningún producto.",
    );
  }
  if (
    !candidates.some(
      (c) =>
        c.product.id === result.product_id &&
        c.references.some((r) => r.color === result.color),
    )
  )
    throw new HttpError(
      422,
      "La IA recomendó una opción fuera de los productos o colores disponibles. Vuelve a intentar.",
    );
  return result;
}
export function editPrompt(
  selection: CatalogSelection,
  candidates: PersonalizationCandidate[],
) {
  const candidate = candidates.find(
    (c) => c.product.id === selection.product_id,
  )!;
  const ref = candidate.references.find((r) => r.color === selection.color)!;
  const hex = planterColors.find((c) => c.name === selection.color)?.hex;
  return `Edit IMAGE 1, the customer's actual outdoor space. Preserve its camera viewpoint, architecture, landscape, furniture, perspective and lighting. Add exactly ONE PLASTIMAD ${candidate.product.name} planter from IMAGE 2 in a visually suitable free area, on the ground, without blocking access. IMAGE 2 is the original product reference (${ref.source_color || selection.color}); preserve the exact planter shape, opening, base, silhouette and surface details. Set ONLY the planter material to ${selection.color} (${hex || selection.color}); do not recolor the surroundings. Integrate realistic perspective, scale, contact shadow and matching light. Do not redesign the product, add other planters, labels, logos, prices, borders or text. This is an illustrative product placement, not a measured installation plan.`;
}
export async function normalizePhoto(bytes: Uint8Array) {
  try {
    const input = sharp(bytes, { limitInputPixels: 25000000, animated: false });
    const metadata = await input.metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format || ""))
      throw new Error();
    return await input
      .rotate()
      .resize({
        width: 960,
        height: 960,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    throw new HttpError(
      400,
      "No pudimos abrir la fotografía. Usa JPG, PNG o WebP de hasta 4 MB.",
    );
  }
}
export async function startEdit(
  image: Uint8Array,
  selection: CatalogSelection,
  candidates: PersonalizationCandidate[],
) {
  const ref = candidates
    .find((c) => c.product.id === selection.product_id)
    ?.references.find((r) => r.color === selection.color);
  if (
    !ref ||
    !/^\/images\/[a-zA-Z0-9_\-/]+\.(webp|png|jpe?g)$/.test(ref.image_url) ||
    ref.image_url.includes("..")
  )
    throw new HttpError(
      409,
      "El producto necesita una fotografía local de referencia válida.",
    );
  const reference = await normalizePhoto(
    await readFile(path.join(process.cwd(), "public", ref.image_url)),
  );
  const { editor } = hfSpaces();
  const turbo = editor.origin === defaultEditSpace;
  const fast =
    turbo ||
    editor.origin === "https://linoyts-qwen-image-edit-2511-fast.hf.space";
  const metadata = await sharp(image).metadata();
  const ratio = (metadata.width || 1) / (metadata.height || 1);
  const outputWidth =
    ratio >= 1 ? 768 : Math.max(256, Math.round((768 * ratio) / 16) * 16);
  const outputHeight =
    ratio >= 1 ? Math.max(256, Math.round(768 / ratio / 16) * 16) : 768;
  const [space, product] = await Promise.all([
    editor.upload(image, "espacio.webp"),
    editor.upload(reference, "maceta-original.webp"),
  ]);
  // /infer verified against /gradio_api/info and the live Gradio config.
  // Rewriting is disabled to avoid a separate provider and prompt drift.
  return editor.submit("infer", [
    [
      { image: space, caption: "Customer space" },
      { image: product, caption: "Exact product reference" },
    ],
    editPrompt(selection, candidates),
    randomInt(2147483647),
    false,
    fast ? 1 : 4,
    fast ? 4 : 28,
    outputHeight,
    outputWidth,
    false,
    // Turbo exposes one output count and two hidden State inputs. The raw
    // Gradio queue requires those placeholders even though /info omits State.
    ...(turbo ? [1, null, null] : []),
  ]);
}
export async function finishEdit(data: unknown[]) {
  const gallery = data[0];
  if (!Array.isArray(gallery) || !gallery[0]?.image) throw providerFailure("");
  return normalizePhoto(await hfSpaces().editor.download(gallery[0].image));
}
