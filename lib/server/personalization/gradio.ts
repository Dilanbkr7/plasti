import { HttpError } from "../security";

export type GradioFile = {
  path: string;
  orig_name: string;
  meta: { _type: "gradio.FileData" };
};

/** Only dedicated HTTPS Space origins. Never accept a URL supplied by a customer. */
export function spaceOrigin(value: string) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    !/^[a-z0-9-]+\.hf\.space$/.test(url.hostname) ||
    url.username ||
    url.password ||
    url.port ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error(
      "Configura una dirección HTTPS de Hugging Face Spaces válida.",
    );
  return url.origin;
}

export function providerFailure(text: string, status = 502): HttpError {
  if (/illegal duration|requested GPU duration.*larger than/i.test(text))
    return new HttpError(
      503,
      "Este Space solicita más tiempo de GPU del permitido por Hugging Face. PLASTIMAD debe configurar la versión rápida del generador.",
    );
  if (/quota|exceeded|limit|GPU duration/i.test(text) || status === 429)
    return new HttpError(
      429,
      "Hugging Face agotó la cuota gratuita de GPU o está ocupado. Espera a que se renueve la cuota e intenta después; no se ha realizado ninguna compra.",
    );
  if (
    status === 401 ||
    status === 403 ||
    /invalid.*token|unauthorized/i.test(text)
  )
    return new HttpError(
      503,
      "Revisa HF_TOKEN: Hugging Face no autorizó el acceso al Space.",
    );
  return new HttpError(
    502,
    "El Space de Hugging Face no pudo completar la propuesta. Puede estar iniciándose o temporalmente ocupado. Intenta más tarde.",
  );
}

export class GradioSpace {
  readonly origin: string;
  constructor(
    origin: string,
    private token: string,
    private transport: typeof fetch = fetch,
  ) {
    this.origin = spaceOrigin(origin);
  }
  private async request(
    path: string,
    options: RequestInit = {},
    timeout = 18000,
  ) {
    try {
      const response = await this.transport(
        `${this.origin}/gradio_api/${path}`,
        {
          ...options,
          redirect: "error",
          cache: "no-store",
          headers: {
            ...options.headers,
            ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
          },
          signal: AbortSignal.timeout(timeout),
        },
      );
      if (!response.ok)
        throw providerFailure(
          (await response.text()).slice(0, 2000),
          response.status,
        );
      return response;
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw providerFailure("");
    }
  }
  async upload(image: Uint8Array, name: string): Promise<GradioFile> {
    const body = new FormData();
    body.set(
      "files",
      new Blob([new Uint8Array(image)], { type: "image/webp" }),
      name,
    );
    const response = await this.request("upload", { method: "POST", body });
    const data = await response.json();
    if (
      !Array.isArray(data) ||
      typeof data[0] !== "string" ||
      data[0].length > 2000
    )
      throw providerFailure("");
    return {
      path: data[0],
      orig_name: name,
      meta: { _type: "gradio.FileData" },
    };
  }
  async submit(endpoint: string, data: unknown[]) {
    const response = await this.request(`call/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    });
    const value = await response.json();
    if (
      typeof value.event_id !== "string" ||
      !/^[a-zA-Z0-9_-]{1,100}$/.test(value.event_id)
    )
      throw providerFailure("");
    return value.event_id as string;
  }
  /** Read the provider's event stream until completion or the request deadline. */
  async result(
    endpoint: string,
    event: string,
    waitMs = 10000,
  ): Promise<unknown[]> {
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(event)) throw providerFailure("");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), waitMs);
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
      const response = await this.transport(
        `${this.origin}/gradio_api/call/${endpoint}/${event}`,
        {
          headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
          signal: controller.signal,
          cache: "no-store",
          redirect: "error",
        },
      );
      if (!response.ok)
        throw providerFailure(
          (await response.text()).slice(0, 2000),
          response.status,
        );
      reader = response.body?.getReader();
      if (!reader) throw providerFailure("");
      const decoder = new TextDecoder();
      let buffer = "",
        bytes = 0;
      while (true) {
        const part = await reader.read();
        if (part.done)
          throw new HttpError(
            502,
            "Hugging Face cerró la conexión antes de entregar la imagen. Puedes volver a generar con la misma foto.",
          );
        bytes += part.value.byteLength;
        if (bytes > 512000) throw providerFailure("");
        buffer += decoder
          .decode(part.value, { stream: true })
          .replace(/\r\n/g, "\n");
        let split: number;
        while ((split = buffer.indexOf("\n\n")) !== -1) {
          const frame = buffer.slice(0, split);
          buffer = buffer.slice(split + 2);
          const kind = frame.match(/^event:\s*(\w+)/m)?.[1];
          const raw = frame
            .split("\n")
            .filter((l) => l.startsWith("data:"))
            .map((l) => l.slice(5).trim())
            .join("\n");
          if (kind === "error") throw providerFailure(raw);
          if (kind === "complete") {
            const data = JSON.parse(raw);
            if (!Array.isArray(data)) throw providerFailure("");
            return data;
          }
        }
      }
    } catch (error) {
      if (controller.signal.aborted)
        throw new HttpError(
          504,
          "Hugging Face superó el tiempo de espera de esta propuesta. Tu foto sigue en el formulario para que puedas volver a generar.",
        );
      if (error instanceof HttpError) throw error;
      throw providerFailure("");
    } finally {
      clearTimeout(timer);
      await reader?.cancel().catch(() => {});
    }
  }
  async download(value: unknown): Promise<Uint8Array> {
    const image = value as { url?: unknown; path?: unknown };
    // File URLs must belong to the same Space, never arbitrary provider output.
    let url: URL;
    try {
      url = new URL(
        typeof image?.url === "string"
          ? image.url
          : `${this.origin}/gradio_api/file=${encodeURIComponent(String(image?.path || ""))}`,
      );
    } catch {
      throw providerFailure("");
    }
    if (
      url.origin !== this.origin ||
      !/^\/(?:gradio_api\/)?file=/.test(url.pathname)
    )
      throw providerFailure("");
    const response = await this.request(
      url.pathname.replace(/^\/(?:gradio_api\/)?/, "") + url.search,
    );
    if (!response.body) throw providerFailure("");
    const reader = response.body.getReader(),
      chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 12000000) throw providerFailure("");
        chunks.push(value);
      }
    } finally {
      await reader.cancel().catch(() => {});
    }
    return new Uint8Array(Buffer.concat(chunks));
  }
}
