export type CartItem = { product_id: string; color: string; quantity: number };
export type CartSnapshot = { revision: string; items: CartItem[] };
export const cartStorageKey = "plastimad.cart.v1";
export const emptyCart: CartSnapshot = { revision: "", items: [] };
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function cartItemKey(item: Pick<CartItem, "product_id" | "color">) {
  return `${item.product_id}:${item.color}`;
}
export function normalizeCartItems(value: unknown): CartItem[] {
  if (!Array.isArray(value) || value.length > 30) return [];
  const grouped = new Map<string, CartItem>();
  for (const item of value) {
    if (
      !item ||
      !uuid.test(item.product_id) ||
      typeof item.color !== "string" ||
      !item.color.trim() ||
      item.color.length > 40 ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 99
    )
      return [];
    const key = cartItemKey(item),
      previous = grouped.get(key);
    grouped.set(key, {
      product_id: item.product_id,
      color: item.color,
      quantity: Math.min(99, (previous?.quantity || 0) + item.quantity),
    });
  }
  return [...grouped.values()];
}
export function parseCart(raw: string): CartSnapshot {
  try {
    const value = JSON.parse(raw);
    if (!uuid.test(value.revision)) return emptyCart;
    return { revision: value.revision, items: normalizeCartItems(value.items) };
  } catch {
    return emptyCart;
  }
}
export function addCartItem(items: CartItem[], item: CartItem): CartItem[] {
  const matching = items.find(
    (line) => cartItemKey(line) === cartItemKey(item),
  );
  if (matching && matching.quantity + item.quantity > 99)
    throw new Error(
      "Puedes agregar hasta 99 unidades de la misma maceta y color.",
    );
  const result = normalizeCartItems([
    ...items.filter((line) => cartItemKey(line) !== cartItemKey(item)),
    { ...item, quantity: (matching?.quantity || 0) + item.quantity },
  ]);
  if (!result.length)
    throw new Error("Revisa el producto, color y cantidad del carrito.");
  return result;
}
