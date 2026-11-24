import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { getBounds } from "@gltf-transform/functions";
import { planterCollection } from "../lib/catalog/planter-collection";
import { planterModels, productModelUrl } from "../lib/catalog/planter-models";
import { brochurePlanter } from "../lib/storefront";

test("each catalog ID resolves to its own GLB and rejects unsafe URLs", () => {
  for (const item of planterCollection)
    assert.equal(planterModels[item.id], `/models/coleccion/${item.slug}.glb`);
  assert.equal(
    productModelUrl({ ...brochurePlanter, model_url: "" }),
    "/models/coleccion/semiesferica.glb",
  );
  assert.equal(
    productModelUrl({
      ...brochurePlanter,
      model_url: "https://external.test/object.glb",
    }),
    "",
  );
});

test("all six optimized GLB files decode, preserve bounds and materially reduce geometry and bytes", async () => {
  const dracoCodec = createRequire(import.meta.url)("draco3dgltf") as {
    createDecoderModule(): Promise<unknown>;
  };
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      "draco3d.decoder": await dracoCodec.createDecoderModule(),
    });
  const report = JSON.parse(
    await readFile("public/models/coleccion/manifest.json", "utf8"),
  ) as {
    models: {
      slug: string;
      product_id: string;
      originalBytes: number;
      optimizedBytes: number;
      originalTriangles: number;
      optimizedTriangles: number;
      originalBounds: { min: number[]; max: number[] };
    }[];
  };
  assert.equal(report.models.length, 6);
  for (const item of planterCollection) {
    const entry = report.models.find((r) => r.product_id === item.id)!;
    assert.equal(entry.slug, item.slug);
    const filename = path.join(process.cwd(), "public", planterModels[item.id]);
    assert.equal((await stat(filename)).size, entry.optimizedBytes);
    assert.ok(entry.optimizedBytes < entry.originalBytes * 0.25);
    const document = await io.read(filename);
    const scene = document.getRoot().listScenes()[0];
    const bounds = getBounds(scene);
    for (let axis = 0; axis < 3; axis++) {
      const tolerance =
        (entry.originalBounds.max[axis] - entry.originalBounds.min[axis]) *
        0.03;
      assert.ok(
        Math.abs(bounds.min[axis] - entry.originalBounds.min[axis]) < tolerance,
      );
      assert.ok(
        Math.abs(bounds.max[axis] - entry.originalBounds.max[axis]) < tolerance,
      );
    }
    let triangles = 0;
    for (const mesh of document.getRoot().listMeshes())
      for (const primitive of mesh.listPrimitives()) {
        const position = primitive.getAttribute("POSITION")!;
        assert.ok(position.getCount() > 0);
        const indices = primitive.getIndices()!;
        triangles += indices.getCount() / 3;
        for (const index of indices.getArray()!)
          assert.ok(index < position.getCount());
        assert.ok(
          primitive.getMaterial()?.getBaseColorTexture()?.getImage()?.length,
        );
      }
    assert.equal(triangles, entry.optimizedTriangles);
    assert.ok(triangles < entry.originalTriangles);
  }
  for (const file of [
    "draco_decoder.wasm",
    "draco_wasm_wrapper.js",
    "draco_decoder.js",
    "LICENSE",
  ])
    assert.ok((await stat(`public/decoders/draco/${file}`)).size > 0);
});
