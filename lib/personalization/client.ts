import type {
  PersonalizationCapabilities,
  PersonalizationRequest,
  PersonalizationResponse,
} from "./types";

// Provider-independent transport: the UI never imports an image-generation SDK.
export async function generatePersonalization(
  request: PersonalizationRequest,
  capabilities: PersonalizationCapabilities,
  options: {
    signal?: AbortSignal;
    onProgress?: (message: string) => void;
  } = {},
): Promise<PersonalizationResponse> {
  if (!capabilities.available)
    return { status: "unavailable", message: capabilities.message };
  const body = new FormData();
  body.set("image", request.photo);
  body.set("preference", JSON.stringify(request.preference));
  body.set("excluded", JSON.stringify(request.excludedProducts || []));
  body.set("consent", String(request.consent));
  const signal = AbortSignal.any([
    AbortSignal.timeout(12 * 60 * 1000),
    ...(options.signal ? [options.signal] : []),
  ]);
  async function call(
    url: string,
    init?: RequestInit,
  ): Promise<PersonalizationResponse> {
    const response = await fetch(`/api/${url}`, {
      ...init,
      signal,
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error || "No se pudo completar la propuesta.");
    return data;
  }
  let response = await call("personalization", { method: "POST", body });
  while (response.status === "pending") {
    options.onProgress?.(response.message);
    const id = response.id;
    await new Promise<void>((resolve, reject) => {
      if (signal.aborted) return reject(signal.reason);
      const done = () => {
        signal.removeEventListener("abort", abort);
        resolve();
      };
      const timer = setTimeout(done, 1800);
      const abort = () => {
        clearTimeout(timer);
        reject(signal.reason);
      };
      signal.addEventListener("abort", abort, { once: true });
    });
    response = await call(`personalization/${encodeURIComponent(id)}`);
  }
  return response;
}
