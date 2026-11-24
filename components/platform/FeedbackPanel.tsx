"use client";
import { useState, type FormEvent } from "react";
import type { Feedback } from "@/lib/platform";
import { api, errorMessage, useResource } from "./api";
import { Empty, Loading, Notice } from "./Shared";
export function FeedbackPanel({ admin }: { admin: boolean }) {
  const { data, error, loading, refresh } = useResource<{
    feedback: Feedback[];
  }>("feedback");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  async function save(event: FormEvent<HTMLFormElement>, id?: string) {
    event.preventDefault();
    setPending(true);
    setNotice("");
    const form = event.currentTarget;
    try {
      await api(
        `feedback${id ? `/${id}` : ""}`,
        id ? "PATCH" : "POST",
        Object.fromEntries(new FormData(form)),
      );
      form.reset();
      setSelected(null);
      refresh();
    } catch (e) {
      setNotice(errorMessage(e));
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      {error && <Notice error>{error}</Notice>}
      {notice && <Notice error>{notice}</Notice>}
      {loading && <Loading />}
      {!admin && (
        <section className="p-card">
          <h2>Queremos escucharte</h2>
          <form className="p-form" onSubmit={(e) => save(e)}>
            <div className="p-two">
              <label>
                Tipo
                <select name="kind">
                  <option value="suggestion">Sugerencia</option>
                  <option value="complaint">Queja</option>
                </select>
              </label>
              <label>
                Asunto
                <input name="subject" minLength={3} maxLength={150} required />
              </label>
            </div>
            <label>
              Tu mensaje
              <textarea
                name="message"
                minLength={10}
                maxLength={3000}
                required
              />
            </label>
            <button className="p-button" disabled={pending}>
              {pending ? "Enviando…" : "Enviar al equipo"}
            </button>
          </form>
        </section>
      )}
      <div className="p-feedback-list">
        {data?.feedback.map((f) => (
          <article className="p-card" key={f.id}>
            <div className="p-card-heading">
              <span className="p-kicker">
                {f.kind === "complaint" ? "QUEJA" : "SUGERENCIA"}
                {admin ? ` · ${f.customer_name}` : ""}
              </span>
              <span className="p-badge">
                {
                  {
                    open: "Abierta",
                    reviewing: "En revisión",
                    resolved: "Resuelta",
                  }[f.status]
                }
              </span>
            </div>
            <h3>{f.subject}</h3>
            <p className="p-prewrap">{f.message}</p>
            {f.response && (
              <div className="p-response">
                <strong>Respuesta de PLASTIMAD</strong>
                <p>{f.response}</p>
              </div>
            )}
            {admin &&
              (selected !== f.id ? (
                <button className="p-link" onClick={() => setSelected(f.id)}>
                  Responder y gestionar ↗
                </button>
              ) : (
                <form className="p-form" onSubmit={(e) => save(e, f.id)}>
                  <label>
                    Respuesta
                    <textarea
                      name="response"
                      defaultValue={f.response}
                      minLength={3}
                      maxLength={3000}
                      required
                    />
                  </label>
                  <label>
                    Estado
                    <select name="status" defaultValue={f.status}>
                      <option value="open">Abierta</option>
                      <option value="reviewing">En revisión</option>
                      <option value="resolved">Resuelta</option>
                    </select>
                  </label>
                  <button className="p-button" disabled={pending}>
                    Guardar respuesta
                  </button>
                </form>
              ))}
          </article>
        ))}
      </div>
      {!loading && !data?.feedback.length && (
        <Empty>Tus quejas, sugerencias y respuestas aparecerán aquí.</Empty>
      )}
    </>
  );
}
