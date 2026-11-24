// Isolated test process only. Not imported by application code or deployed.
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
const original = globalThis.fetch;
const events = new Map();
globalThis.fetch = async (input, options) => {
  const url = new URL(String(input));
  if (
    ![
      "qwen-qwen-image-edit-2511.hf.space",
      "linoyts-qwen-image-edit-2511-fast.hf.space",
      "lpx55-qwen-image-edit-2511-turbo-lightning.hf.space",
      "developer0hye-qwen2-5-vl-7b-instruct.hf.space",
    ].includes(url.hostname)
  )
    return original(input, options);
  if (url.pathname.endsWith("/upload"))
    return Response.json(["/tmp/gradio/isolated-fixture.webp"]);
  if (url.pathname.startsWith("/gradio_api/file="))
    return new Response(
      await readFile(
        new URL(
          "../../public/images/coleccion/semiesferica.webp",
          import.meta.url,
        ),
      ),
    );
  if (options?.method === "POST") {
    const { data } = JSON.parse(options.body);
    const id = randomUUID();
    if (url.pathname.endsWith("/qwen_vl_inference")) {
      return new Response("A new job must call only the editor", {
        status: 400,
      });
    } else {
      if (
        ![9, 12].includes(data.length) ||
        data[0].length !== 2 ||
        data[8] !== false
      )
        return new Response("Invalid edit input contract", { status: 400 });
      events.set(id, [
        [{ image: { url: `${url.origin}/gradio_api/file=fixture.webp` } }],
        42,
      ]);
    }
    return Response.json({ event_id: id });
  }
  const id = url.pathname.split("/").pop();
  return new Response(
    `event: complete\ndata: ${JSON.stringify(events.get(id))}\n\n`,
    { headers: { "Content-Type": "text/event-stream" } },
  );
};
