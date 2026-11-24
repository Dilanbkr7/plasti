import { test } from "node:test";
import assert from "node:assert/strict";
import type { Product } from "../lib/platform";
import { planterCollection } from "../lib/catalog/planter-collection";
import {
  buildPersonalizationCatalog,
  resolveProposal,
} from "../lib/personalization/catalog";

// Isolated fixtures: never inserted in the application catalog or shown in the UI.
const product = (i: number): Product => ({
  id: planterCollection[i]?.id || `excluded-${i}`,
  name: `Fixture ${i}`,
  description: "Test",
  category: "Macetas",
  price_cents: 1234,
  unit: "unidad",
  colors: ["Negro carbón", "Tomate", "Celeste", "Verde naturaleza"],
  sizes: [],
  image_url: `/images/coleccion/${planterCollection[i]?.slug}.webp`,
  model_url: "",
  active: true,
  demo: false,
});
const six = Array.from({ length: 6 }, (_, i) => product(i));

test("only real active planters contribute references and approved catalog colors", () => {
  const catalog = buildPersonalizationCatalog([
    ...six,
    { ...product(6), demo: true },
    { ...product(7), active: false },
    { ...product(8), category: "Mobiliario" },
  ]);
  assert.equal(catalog.complete, true);
  assert.equal(catalog.candidates.length, 6);
  assert.deepEqual(
    catalog.colors.map((c) => c.name),
    ["Negro carbón", "Tomate", "Celeste"],
  );
  assert.equal(
    catalog.candidates[0].references.find((r) => r.color === "Negro carbón")
      ?.image_url,
    "/images/coleccion/semiesferica.webp",
  );
});
test("missing collection and ambiguous original photos do not become ready", () => {
  assert.equal(buildPersonalizationCatalog([]).complete, false);
  assert.equal(buildPersonalizationCatalog(six.slice(0, 5)).complete, false);
  assert.equal(
    buildPersonalizationCatalog([...six, product(6)]).complete,
    true,
  );
  const catalog = buildPersonalizationCatalog(
    six.map((p) => ({
      ...p,
      image_url: "/photos/generic-multiple-colors.jpg",
    })),
  );
  assert.equal(catalog.complete, false);
  assert.deepEqual(catalog.colors, []);
});
test("proposal must preserve product ID, exact variant and user color; prices come from catalog", () => {
  const catalog = buildPersonalizationCatalog(six);
  const selection = { product_id: six[2].id, color: "Negro carbón" };
  const preference = { mode: "selected" as const, color: "Negro carbón" };
  const resolved = resolveProposal(
    catalog,
    selection,
    preference,
    "/generated/proposal.webp",
  )!;
  assert.equal(resolved.product.id, selection.product_id);
  assert.equal(resolved.product.price_cents, 1234);
  assert.equal(resolved.selection.color, "Negro carbón");
  assert.equal(
    resolveProposal(
      catalog,
      selection,
      { mode: "selected", color: "Celeste" },
      "/proposal.webp",
    ),
    null,
  );
  assert.equal(
    resolveProposal(
      catalog,
      { product_id: "fake", color: "Tomate" },
      preference,
      "/proposal.webp",
    ),
    null,
  );
  assert.equal(
    resolveProposal(
      catalog,
      { product_id: six[2].id, color: "Verde naturaleza" },
      { mode: "auto" },
      "/proposal.webp",
    ),
    null,
  );
  assert.equal(
    resolveProposal(catalog, selection, preference, "javascript:alert(1)"),
    null,
  );
  assert.equal(
    resolveProposal(
      catalog,
      selection,
      preference,
      "//external.test/image.jpg",
    ),
    null,
  );
  assert.equal(
    resolveProposal(
      catalog,
      selection,
      preference,
      "data:image/png;base64,test",
    ),
    null,
  );
});

test("six supplied black product photographs form a ready catalog without fabricated variants", () => {
  const products = six.map((p, i) => ({
    ...p,
    colors: ["Negro carbón"],
    image_url: `/images/coleccion/${planterCollection[i].slug}.webp`,
  }));
  const catalog = buildPersonalizationCatalog(products);
  assert.equal(catalog.complete, true);
  assert.deepEqual(
    catalog.colors.map((c) => c.name),
    ["Negro carbón"],
  );
  assert.equal(
    catalog.candidates[0].references[0].image_url,
    products[0].image_url,
  );
  assert.equal(
    resolveProposal(
      catalog,
      { product_id: products[0].id, color: "Celeste" },
      { mode: "auto" },
      "/proposal.webp",
    ),
    null,
  );
});

test("approved colors explicitly use the black original as a recoloring reference", () => {
  const products = six.map((p, i) => ({
    ...p,
    colors: ["Negro carbón", "Tomate", "Celeste"],
    image_url: `/images/coleccion/${planterCollection[i].slug}.webp`,
  }));
  const catalog = buildPersonalizationCatalog(products);
  assert.deepEqual(
    catalog.colors.map((c) => c.name),
    ["Negro carbón", "Tomate", "Celeste"],
  );
  assert.equal(catalog.candidates[0].references.length, 3);
  assert.equal(catalog.candidates[0].references[0].color, "Negro carbón");
  assert.equal(
    catalog.candidates[0].references[2].source_color,
    "Negro carbón",
  );
  assert.equal(
    resolveProposal(
      catalog,
      { product_id: products[0].id, color: "Celeste" },
      { mode: "selected", color: "Celeste" },
      "/proposal.webp",
    )?.selection.color,
    "Celeste",
  );
});
