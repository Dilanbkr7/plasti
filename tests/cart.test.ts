import { test } from "node:test";
import assert from "node:assert/strict";
import { addCartItem, normalizeCartItems, parseCart } from "../lib/cart";
import { safeDestination } from "../lib/navigation";
const id = "3cc67eb1-e5b8-4fc8-9d4f-100000000001";
const revision = "88a7e5e4-6fcb-4a4e-9969-416cc3a5bfaa";
test("cart merges the same product and color while keeping other colors separate", () => {
  let items = addCartItem([], { product_id: id, color: "Tomate", quantity: 2 });
  items = addCartItem(items, { product_id: id, color: "Celeste", quantity: 1 });
  items = addCartItem(items, { product_id: id, color: "Tomate", quantity: 3 });
  assert.equal(items.length, 2);
  assert.equal(items.find((item) => item.color === "Tomate")?.quantity, 5);
  assert.equal(items.find((item) => item.color === "Celeste")?.quantity, 1);
  assert.throws(
    () => addCartItem(items, { product_id: id, color: "Tomate", quantity: 99 }),
    /99/,
  );
});
test("stored cart restores IDs and quantities but never accepts persisted prices", () => {
  const result = parseCart(
    JSON.stringify({
      revision,
      items: [{ product_id: id, color: "Tomate", quantity: 2, price_cents: 1 }],
    }),
  );
  assert.equal(result.revision, revision);
  assert.deepEqual(result.items, [
    { product_id: id, color: "Tomate", quantity: 2 },
  ]);
  for (const bad of [
    "bad-json",
    "null",
    JSON.stringify({ revision: "bad", items: [] }),
    JSON.stringify({
      revision,
      items: [{ product_id: id, color: "Tomate", quantity: -1 }],
    }),
  ])
    assert.deepEqual(parseCart(bad).items, []);
  assert.deepEqual(
    normalizeCartItems([{ product_id: id, color: "Tomate", quantity: 1.5 }]),
    [],
  );
});
test("registration and login can return to the same local cart checkout", () => {
  assert.equal(
    safeDestination("/carrito?comprar=1#finalizar", "/panel"),
    "/carrito?comprar=1#finalizar",
  );
  assert.equal(safeDestination("//evil.test/carrito", "/panel"), "/panel");
});
