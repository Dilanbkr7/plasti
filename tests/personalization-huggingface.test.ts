import { test, mock } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { GradioSpace, spaceOrigin } from "../lib/server/personalization/gradio";
import {
  eligibleCandidates,
  parseRecommendation,
  editPrompt,
  normalizePhoto,
  startEdit,
  defaultEditSpace,
} from "../lib/server/personalization/huggingface";
import { buildPersonalizationCatalog } from "../lib/personalization/catalog";
import { planterCollection } from "../lib/catalog/planter-collection";
import type { Product } from "../lib/platform";

const products: Product[] = planterCollection.map((p) => ({
  ...p,
  unit: "unidad",
  category: "Macetas",
  colors: ["Negro carbón", "Tomate", "Celeste"],
  sizes: ["referencial"],
  image_url: `/images/coleccion/${p.slug}.webp`,
  model_url: "",
  active: true,
  demo: false,
}));
const catalog = buildPersonalizationCatalog(products);
const origin = "https://test-fixture.hf.space";
test("fast Qwen uses four Lightning steps and the real shape reference without rewriting", async () => {
  const previous = process.env.HF_IMAGE_SPACE_URL;
  process.env.HF_IMAGE_SPACE_URL = defaultEditSpace;
  let submitted = false;
  const intercepted = mock.method(
    globalThis,
    "fetch",
    transport((url, options) => {
      if (url.endsWith("/upload"))
        return Response.json(["/tmp/gradio/fixture.webp"]);
      assert.equal(url, `${defaultEditSpace}/gradio_api/call/infer`);
      const payload = JSON.parse(String(options?.body));
      assert.equal(payload.data[0].length, 2);
      assert.equal(payload.data[4], 1);
      assert.equal(payload.data[5], 4);
      assert.equal(payload.data[8], false);
      assert.deepEqual(payload.data.slice(9), [1, null, null]);
      submitted = true;
      return Response.json({ event_id: "test_event" });
    }),
  );
  try {
    const photo = await sharp({
      create: { width: 300, height: 200, channels: 3, background: "#77885e" },
    })
      .webp()
      .toBuffer();
    await startEdit(
      photo,
      { product_id: products[0].id, color: "Negro carbón" },
      catalog.candidates,
    );
    assert.equal(submitted, true);
  } finally {
    intercepted.mock.restore();
    if (previous === undefined) delete process.env.HF_IMAGE_SPACE_URL;
    else process.env.HF_IMAGE_SPACE_URL = previous;
  }
});
function transport(
  fn: (url: string, options?: RequestInit) => Response | Promise<Response>,
) {
  return ((url: string | URL | Request, options?: RequestInit) =>
    Promise.resolve(fn(String(url), options))) as typeof fetch;
}
test("regeneration excludes previous real products and respects the selected color", () => {
  const filtered = eligibleCandidates(
    catalog.candidates,
    { mode: "selected", color: "Celeste" },
    products.slice(0, 2).map((p) => p.id),
  );
  assert.equal(filtered.length, 4);
  assert.ok(
    filtered.every(
      (p) => p.references.length === 1 && p.references[0].color === "Celeste",
    ),
  );
  const valid = {
    product_id: products[2].id,
    color: "Celeste",
    reason: "Su geometría acompaña las líneas visibles de la terraza.",
  };
  assert.equal(
    parseRecommendation([JSON.stringify(valid)], filtered).product_id,
    products[2].id,
  );
  assert.throws(
    () =>
      parseRecommendation(
        [JSON.stringify({ ...valid, product_id: products[0].id })],
        filtered,
      ),
    /fuera/,
  );
  assert.throws(
    () =>
      parseRecommendation(
        [JSON.stringify({ ...valid, color: "Tomate" })],
        filtered,
      ),
    /fuera/,
  );
  assert.throws(
    () => parseRecommendation(["Una maceta inventada"], filtered),
    /válida/,
  );
  assert.equal(
    eligibleCandidates(
      catalog.candidates,
      { mode: "auto" },
      products.map((p) => p.id),
    ).length,
    0,
  );
});
test("editor receives the original shape and explicit material recoloring; model prices are not requested", () => {
  const instruction = editPrompt(
    { product_id: products[1].id, color: "Tomate" },
    catalog.candidates,
  );
  assert.match(instruction, /IMAGE 1/);
  assert.match(instruction, /IMAGE 2/);
  assert.match(instruction, /Negro carbón/);
  assert.match(instruction, /Tomate/);
  assert.match(instruction, /#bb5134/);
  assert.match(instruction, /Preserve/);
  assert.ok(!instruction.includes('"price_cents"'));
});
test("only dedicated HTTPS Space origins are accepted", () => {
  assert.equal(spaceOrigin(origin), origin);
  for (const url of [
    "http://localhost:3000",
    "https://evil.test",
    "https://good.hf.space.evil.test",
    "https://user:secret@a.hf.space",
    "https://a.hf.space/private",
    "https://a.hf.space:444",
    "https://a.hf.space?token=x",
  ])
    assert.throws(() => spaceOrigin(url));
});
test("Gradio uploads optimized bytes and authenticates only server requests", async () => {
  const space = new GradioSpace(
    origin,
    "test-private-token",
    transport(async (url, options) => {
      assert.equal(url, `${origin}/gradio_api/upload`);
      assert.equal(
        (options!.headers as Record<string, string>).Authorization,
        "Bearer test-private-token",
      );
      const file = (options!.body as FormData).get("files") as File;
      assert.equal(file.name, "espacio.webp");
      assert.equal(file.size, 3);
      return Response.json(["/tmp/gradio/fixture.webp"]);
    }),
  );
  assert.equal(
    (await space.upload(new Uint8Array([1, 2, 3]), "espacio.webp")).meta._type,
    "gradio.FileData",
  );
});
test("queued generation handles fragmented SSE without accepting intermediate outputs", async () => {
  const payload =
    'event: generating\ndata: ["partial"]\n\nevent: complete\ndata: ["final"]\n\n';
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const bytes = new TextEncoder().encode(payload);
      for (let i = 0; i < bytes.length; i += 7)
        controller.enqueue(bytes.slice(i, i + 7));
      controller.close();
    },
  });
  const space = new GradioSpace(
    origin,
    "",
    transport(() => new Response(stream)),
  );
  assert.deepEqual(await space.result("infer", "event_123"), ["final"]);
});
test("Hugging Face quota failure is explicit, never a fabricated proposal", async () => {
  const space = new GradioSpace(
    origin,
    "",
    transport(
      () => new Response('event: error\ndata: "GPU quota exceeded"\n\n'),
    ),
  );
  await assert.rejects(space.result("infer", "event_123"), /cuota gratuita/);
});
test("an expired Gradio stream reports a timeout instead of polling a disconnected event", async () => {
  const space = new GradioSpace(
    origin,
    "",
    transport((_url, options) => {
      const signal = options!.signal!;
      return new Response(
        new ReadableStream({
          start(controller) {
            signal.addEventListener(
              "abort",
              () => controller.error(signal.reason),
              {
                once: true,
              },
            );
          },
        }),
      );
    }),
  );
  await assert.rejects(space.result("infer", "event_123", 1), {
    status: 504,
    message: /superó el tiempo de espera/,
  });
});
test("provider image cannot redirect downloads to another host", async () => {
  let calls = 0;
  const space = new GradioSpace(
    origin,
    "",
    transport(() => {
      calls++;
      return new Response();
    }),
  );
  await assert.rejects(space.download({ url: "http://127.0.0.1/private" }));
  await assert.rejects(
    space.download({ url: "https://other.hf.space/gradio_api/file=x" }),
  );
  assert.equal(calls, 0);
});
test("real image decode bounds resolution and rejects a forged photo", async () => {
  const input = await sharp({
    create: { width: 1800, height: 1200, channels: 3, background: "#253221" },
  })
    .png()
    .toBuffer();
  const output = await normalizePhoto(input);
  const metadata = await sharp(output).metadata();
  assert.equal(metadata.width, 960);
  assert.equal(metadata.height, 640);
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.exif, undefined);
  await assert.rejects(
    normalizePhoto(Buffer.from("not an image")),
    /fotografía/,
  );
});
