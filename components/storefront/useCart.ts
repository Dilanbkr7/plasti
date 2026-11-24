"use client";
import { useSyncExternalStore } from "react";
import {
  addCartItem,
  cartItemKey,
  cartStorageKey,
  emptyCart,
  normalizeCartItems,
  parseCart,
  type CartItem,
} from "@/lib/cart";
const eventName = "plastimad:cart";
let cachedRaw = "",
  cachedCart = emptyCart;
function read() {
  let raw = "";
  try {
    raw = localStorage.getItem(cartStorageKey) || "";
  } catch {
    /* Empty until storage becomes available. */
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedCart = parseCart(raw);
  }
  return cachedCart;
}
function subscribe(notify: () => void) {
  const storage = (event: StorageEvent) => {
    if (!event.key || event.key === cartStorageKey) notify();
  };
  window.addEventListener("storage", storage);
  window.addEventListener(eventName, notify);
  return () => {
    window.removeEventListener("storage", storage);
    window.removeEventListener(eventName, notify);
  };
}
function write(items: CartItem[]) {
  try {
    localStorage.setItem(
      cartStorageKey,
      JSON.stringify({
        revision: crypto.randomUUID(),
        items: normalizeCartItems(items),
      }),
    );
  } catch {
    throw new Error(
      "No pudimos guardar el carrito. Permite el almacenamiento de este sitio y vuelve a intentar.",
    );
  }
  window.dispatchEvent(new Event(eventName));
}
export function useCart() {
  const snapshot = useSyncExternalStore(subscribe, read, () => emptyCart);
  return {
    ...snapshot,
    count: snapshot.items.reduce((total, item) => total + item.quantity, 0),
    add: (item: CartItem) => write(addCartItem(read().items, item)),
    update: (item: CartItem, quantity: number) =>
      write(
        read().items.map((line) =>
          cartItemKey(line) === cartItemKey(item)
            ? {
                ...line,
                quantity: Math.max(1, Math.min(99, Math.floor(quantity) || 1)),
              }
            : line,
        ),
      ),
    remove: (item: CartItem) =>
      write(
        read().items.filter((line) => cartItemKey(line) !== cartItemKey(item)),
      ),
    clear: () => write([]),
    clearPurchased: (revision: string) => {
      if (read().revision === revision) {
        write([]);
        return true;
      }
      return false;
    },
  };
}
