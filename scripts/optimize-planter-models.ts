import { createRequire } from "node:module";
import { copyFile, mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  dedup,
  draco,
  getBounds,
  prune,
  simplify,
  textureCompress,
  weld,
} from "@gltf-transform/functions";
import { MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";
import { planterCollection } from "../lib/catalog/planter-collection";

async function main() {
  const sourceDirectory = process.argv[2];
  if (!sourceDirectory || !path.isAbsolute(sourceDirectory))
    throw new Error("Indica la carpeta absoluta con los GLB originales.");
  const output = path.join(process.cwd(), "public/models/coleccion");
  const originals = path.join(process.cwd(), ".data/3d-originals");
  await mkdir(output, { recursive: true });
  await mkdir(originals, { recursive: true });
  const dracoModule = createRequire(import.meta.url)("draco3dgltf") as {
    createEncoderModule(): Promise<unknown>;
    createDecoderModule(): Promise<unknown>;
  };
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      "draco3d.encoder": await dracoModule.createEncoderModule(),
      "draco3d.decoder": await dracoModule.createDecoderModule(),
    });
  await MeshoptSimplifier.ready;
  const report = [];
  for (const item of planterCollection) {
    const filename =
      item.slug === "hexagonal" ? "hexagonal (1).glb" : `${item.slug}.glb`;
    const source = path.join(sourceDirectory, filename);
    await copyFile(source, path.join(originals, `${item.slug}.glb`));
    const document = await io.read(source);
    const count = () =>
      document
        .getRoot()
        .listMeshes()
        .reduce(
          (total, mesh) =>
            total +
            mesh
              .listPrimitives()
              .reduce(
                (sum, p) =>
                  sum +
                  (p.getIndices()?.getCount() ||
                    p.getAttribute("POSITION")?.getCount() ||
                    0) /
                    3,
                0,
              ),
          0,
        );
    const before = count();
    const scene = document.getRoot().listScenes()[0];
    if (!scene) throw new Error(`No hay escena: ${item.slug}`);
    const originalBounds = getBounds(scene);
    await document.transform(
      dedup(),
      weld(),
      simplify({
        simplifier: MeshoptSimplifier,
        ratio: Math.min(1, 65000 / before),
        error: 0.002,
        lockBorder: true,
      }),
      prune(),
      textureCompress({
        encoder: sharp,
        targetFormat: "webp",
        resize: [1024, 1024],
        quality: 85,
        effort: 80,
      }),
      draco({
        method: "edgebreaker",
        encodeSpeed: 4,
        decodeSpeed: 5,
        quantizePosition: 14,
        quantizeNormal: 10,
        quantizeTexcoord: 12,
      }),
    );
    if (before > 500000 && count() > 100000)
      await document.transform(
        simplify({
          simplifier: MeshoptSimplifier,
          ratio: 100000 / count(),
          error: 0.006,
          lockBorder: false,
        }),
        prune(),
      );
    const target = path.join(output, `${item.slug}.glb`);
    await io.write(target, document);
    // Decode the exported asset again: catch invalid compression before publication.
    const decoded = await io.read(target);
    const decodedScene = decoded.getRoot().listScenes()[0];
    if (!decodedScene || !decoded.getRoot().listMeshes().length)
      throw new Error(`GLB inválido: ${item.slug}`);
    const optimizedBounds = getBounds(decodedScene);
    const originalBytes = (await stat(source)).size;
    const optimizedBytes = (await stat(target)).size;
    if (optimizedBytes >= originalBytes)
      throw new Error(`No se redujo el tamaño: ${item.slug}`);
    const entry = {
      slug: item.slug,
      product_id: item.id,
      model_url: `/models/coleccion/${item.slug}.glb`,
      originalBytes,
      optimizedBytes,
      originalTriangles: before,
      optimizedTriangles: count(),
      originalBounds,
      optimizedBounds,
      compression: "Draco + WebP 1024",
    };
    report.push(entry);
    console.log(
      `${item.name}: ${(originalBytes / 1048576).toFixed(2)} → ${(optimizedBytes / 1048576).toFixed(2)} MB · ${Math.round(before)} → ${Math.round(count())} triángulos`,
    );
  }
  const decoderDirectory = path.join(process.cwd(), "public/decoders/draco");
  await mkdir(decoderDirectory, { recursive: true });
  for (const file of [
    "draco_decoder.wasm",
    "draco_wasm_wrapper.js",
    "draco_decoder.js",
  ])
    await copyFile(
      path.join(
        process.cwd(),
        "node_modules/three/examples/jsm/libs/draco/gltf",
        file,
      ),
      path.join(decoderDirectory, file),
    );
  // Keep a local copy of the official decoder license for reproducible reruns.
  const licensePath = path.join(decoderDirectory, "LICENSE");
  try {
    await stat(licensePath);
  } catch {
    const response = await fetch(
      "https://raw.githubusercontent.com/google/draco/main/LICENSE",
    );
    if (!response.ok)
      throw new Error("No se pudo descargar la licencia oficial de Draco.");
    await writeFile(licensePath, await response.text());
  }
  await writeFile(
    path.join(output, "manifest.json"),
    JSON.stringify(
      { generated: new Date().toISOString(), models: report },
      null,
      2,
    ),
  );
  console.log(
    `Total: ${report.reduce((n, r) => n + r.originalBytes, 0)} → ${report.reduce((n, r) => n + r.optimizedBytes, 0)} bytes.`,
  );
}
main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : "No se pudieron optimizar los modelos",
  );
  process.exitCode = 1;
});
