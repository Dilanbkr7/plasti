import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import sharp from "sharp";
import { planterCollection } from "../lib/catalog/planter-collection";

test(
  "guest personalization generates three distinct catalog products without a separate vision call",
  { timeout: 120000 },
  async () => {
    await mkdir(".data", { recursive: true });
    const directory = await mkdtemp(
      path.join(process.cwd(), ".data", "qa-personalization-"),
    );
    const db = await PGlite.create(directory);
    try {
      await db.exec(await readFile("database/schema.sql", "utf8"));
      for (const p of planterCollection)
        await db.query(
          "INSERT INTO plastimad.products(id,name,description,category,price_cents,colors,sizes,image_url,active,demo) VALUES($1,$2,$3,'Macetas',$4,$5,$6,$7,true,false)",
          [
            p.id,
            p.name,
            p.description,
            p.price_cents,
            JSON.stringify(["Negro carbón", "Tomate", "Celeste"]),
            JSON.stringify(["referencial"]),
            `/images/coleccion/${p.slug}.webp`,
          ],
        );
    } finally {
      await db.close();
    }
    const origin = "http://127.0.0.1:3102";
    const server = spawn(
      process.execPath,
      [
        "--import",
        pathToFileURL(
          path.join(process.cwd(), "tests/fixtures/huggingface-fetch.mjs"),
        ).href,
        "node_modules/next/dist/bin/next",
        "start",
        "-p",
        "3102",
        "--hostname",
        "127.0.0.1",
      ],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_ENV: "production",
          ALLOW_LOCAL_DATABASE: "true",
          DATABASE_URL: "",
          NETLIFY: "",
          LOCAL_DATABASE_PATH: directory,
          APP_URL: origin,
          HF_TOKEN: "isolated-test-token",
          HF_IMAGE_SPACE_URL:
            "https://lpx55-qwen-image-edit-2511-turbo-lightning.hf.space",
          HF_VISION_SPACE_URL:
            "https://developer0hye-qwen2-5-vl-7b-instruct.hf.space",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let output = "";
    server.stdout?.on("data", (chunk) => {
      output += chunk;
    });
    server.stderr?.on("data", (chunk) => {
      output += chunk;
    });
    let cookie = "";
    const photo = await sharp({
      create: { width: 128, height: 128, channels: 3, background: "#749661" },
    })
      .jpeg()
      .toBuffer();
    async function submit(
      excluded: string[] = [],
      consent = "true",
      color = "Celeste",
    ) {
      const body = new FormData();
      body.set(
        "image",
        new Blob([new Uint8Array(photo)], { type: "image/jpeg" }),
        "isolated-space.jpg",
      );
      body.set("consent", consent);
      body.set(
        "preference",
        JSON.stringify(
          color === "auto" ? { mode: "auto" } : { mode: "selected", color },
        ),
      );
      body.set("excluded", JSON.stringify(excluded));
      const response = await fetch(`${origin}/api/personalization`, {
        method: "POST",
        headers: { origin, ...(cookie ? { cookie } : {}) },
        body,
      });
      if (response.headers.getSetCookie().length)
        cookie = response.headers
          .getSetCookie()
          .map((c) => c.split(";")[0])
          .join("; ");
      return { status: response.status, data: await response.json() };
    }
    async function poll(id: string) {
      const response = await fetch(`${origin}/api/personalization/${id}`, {
        headers: { cookie },
      });
      assert.equal(response.status, 200, await response.clone().text());
      return response.json();
    }
    try {
      let ready = false;
      for (let i = 0; i < 100; i++) {
        try {
          if ((await fetch(`${origin}/api/personalization`)).ok) {
            ready = true;
            break;
          }
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      assert.ok(ready, output);
      const capabilities = await (
        await fetch(`${origin}/api/personalization`)
      ).json();
      assert.equal(capabilities.available, true);
      assert.equal((await submit([], "false")).status, 400);
      assert.equal((await submit([], "true", "Verde naturaleza")).status, 400);
      const first = await submit([], "true", "auto");
      assert.equal(first.status, 200, JSON.stringify(first.data));
      assert.equal(first.data.status, "pending");
      assert.equal((await submit()).status, 409);
      const finished = await poll(first.data.id);
      assert.equal(finished.status, "ready");
      assert.ok(
        ["Negro carbón", "Tomate", "Celeste"].includes(
          finished.proposal.selection.color,
        ),
      );
      assert.equal(
        finished.proposal.product.price_cents,
        planterCollection.find(
          (p) => p.id === finished.proposal.selection.product_id,
        )?.price_cents,
      );
      const image = await fetch(`${origin}${finished.proposal.image_url}`, {
        headers: { cookie },
      });
      assert.equal(image.status, 200);
      assert.equal(image.headers.get("cache-control"), "private, no-store");
      assert.equal(
        (await sharp(Buffer.from(await image.arrayBuffer())).metadata()).format,
        "webp",
      );
      assert.equal(
        (await fetch(`${origin}${finished.proposal.image_url}`)).status,
        404,
      );
      assert.equal(
        (await fetch(`${origin}/api/personalization/${first.data.id}`)).status,
        404,
      );
      const second = await submit([finished.proposal.selection.product_id]);
      assert.equal(second.status, 200);
      const regenerated = await poll(second.data.id);
      assert.equal(regenerated.status, "ready");
      assert.notEqual(
        regenerated.proposal.selection.product_id,
        finished.proposal.selection.product_id,
      );
      assert.equal(regenerated.proposal.selection.color, "Celeste");
      const used = [
        finished.proposal.selection.product_id,
        regenerated.proposal.selection.product_id,
      ];
      const third = await submit(used, "true", "auto");
      assert.equal(third.status, 200);
      const another = await poll(third.data.id);
      assert.equal(another.status, "ready");
      assert.ok(!used.includes(another.proposal.selection.product_id));
      const exhausted = await submit(planterCollection.map((p) => p.id));
      assert.equal(exhausted.status, 409);
      assert.match(exhausted.data.error, /exploraste/);
    } finally {
      server.kill();
      await new Promise<void>((resolve) => {
        if (server.exitCode !== null) return resolve();
        server.once("exit", () => resolve());
        setTimeout(resolve, 5000).unref();
      });
    }
  },
);
