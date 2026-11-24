export function safeDestination(value: string, fallback: string) {
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\"))
    return fallback;
  const url = new URL(value, "https://plastimad.invalid");
  return url.origin === "https://plastimad.invalid" &&
    ["/", "/panel", "/admin", "/carrito"].includes(url.pathname)
    ? `${url.pathname}${url.search}${url.hash}`
    : fallback;
}
