"use client";
import { useState, type FormEvent } from "react";
import { api, errorMessage, useResource } from "./api";
import { money, type Analysis, type ChatMessage } from "@/lib/platform";
import { Empty, Notice } from "./Shared";
import { Icon } from "@/components/ui/Icons";
import { PlanterPersonalization } from "@/components/personalization/PlanterPersonalization";
export function AnalysisPanel() {
  const { data, error } = useResource<{ analyses: Analysis[] }>("analyses");
  return (
    <>
      <PlanterPersonalization />
      <h2 className="p-subtitle">Tus análisis guardados</h2>
      {error && <Notice error>{error}</Notice>}
      {data?.analyses.map((a) => (
        <article className="p-card" key={a.id}>
          <div className="p-card-heading">
            <span className="p-kicker">
              {new Date(a.created_at).toLocaleDateString("es-EC")}
            </span>
            <strong>
              {a.result.items.length &&
              a.result.items.every((i) => i.unit_price_cents > 0)
                ? `${money(a.total_cents)} estimados`
                : "Costo por confirmar"}
            </strong>
          </div>
          <p className="p-prewrap">{a.result.summary}</p>
          <div className="p-table-wrap">
            <table className="p-table">
              <thead>
                <tr>
                  <th>Producto recomendado</th>
                  <th>Cantidad</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {a.result.items.map((item) => (
                  <tr key={item.product_id}>
                    <td>
                      {item.name}
                      <small>{item.reason}</small>
                      {item.calculation && <small>{item.calculation}</small>}
                    </td>
                    <td>{item.quantity}</td>
                    <td>
                      {item.unit_price_cents
                        ? money(item.subtotal_cents)
                        : "Por confirmar"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="p-notice">{a.result.limitations}</p>
          <div className="p-inline">
            <a
              className="p-link"
              href={`/api/analyses/${a.id}/image`}
              target="_blank"
              rel="noreferrer"
            >
              Ver imagen ↗
            </a>
          </div>
        </article>
      ))}
      {data?.analyses.length === 0 && (
        <Empty>Tus recomendaciones quedarán guardadas aquí.</Empty>
      )}
    </>
  );
}
export function ChatPanel() {
  const { data, error, refresh } = useResource<{ messages: ChatMessage[] }>(
    "chat",
  );
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    setNotice("");
    try {
      await api("chat", "POST", { message: new FormData(form).get("message") });
      form.reset();
      refresh();
    } catch (e) {
      setNotice(errorMessage(e));
    } finally {
      setPending(false);
    }
  }
  async function clear() {
    setNotice("");
    try {
      await api("chat", "DELETE");
      refresh();
    } catch (e) {
      setNotice(errorMessage(e));
    }
  }
  return (
    <section className="p-card p-chat">
      <div className="p-card-heading">
        <div>
          <span className="p-kicker">ASESOR DE PRODUCTOS</span>
          <h2>Conversemos sobre tu espacio.</h2>
        </div>
        <button className="p-link" onClick={clear}>
          Borrar historial
        </button>
      </div>
      <p className="p-notice">
        El asistente usa el catálogo disponible. Puede equivocarse: confirma
        condiciones con el equipo comercial. Tus consultas se envían a OpenAI;
        evita compartir información sensible.
      </p>
      <div className="p-chat-messages" aria-live="polite">
        {!data?.messages.length && (
          <Empty>
            Pregunta por materiales, colores, usos o productos para tu proyecto.
          </Empty>
        )}
        {data?.messages.map((m) => (
          <article className={`p-chat-message ${m.role}`} key={m.id}>
            <small>{m.role === "user" ? "TÚ" : "PLASTIMAD · IA"}</small>
            <p>{m.content}</p>
          </article>
        ))}
        {pending && <p role="status">Preparando respuesta…</p>}
      </div>
      {(notice || error) && <Notice error>{notice || error}</Notice>}
      <form className="p-chat-input" onSubmit={send}>
        <input
          name="message"
          aria-label="Tu consulta"
          placeholder="¿Qué producto sería adecuado para una terraza?"
          maxLength={2000}
          required
        />
        <button className="p-button" disabled={pending}>
          Enviar <Icon />
        </button>
      </form>
    </section>
  );
}
