"use client";
import { useRef, useState, type FormEvent } from "react";
import { Icon } from "@/components/ui/Icons";
import { api, errorMessage } from "@/components/platform/api";
import type { Product } from "@/lib/platform";
import s from "./LandingFeatures.module.css";
type Reply = { content: string; mode: "catalog" | "ai"; notice: string };
export function VirtualAssistant({ product }: { product: Product }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; text: string; mode?: string }[]
  >([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [useAI, setUseAI] = useState(false);
  async function send(value: string) {
    if (pending || !value.trim()) return;
    setPending(true);
    setError("");
    setInput("");
    setMessages((old) => [...old, { role: "user", text: value }]);
    try {
      const result = await api<Reply>("assistant", "POST", {
        message: value,
        product_id: product.id,
        use_ai: useAI,
      });
      setMessages((old) => [
        ...old,
        { role: "assistant", text: result.content, mode: result.mode },
      ]);
      setNotice(result.notice);
    } catch (e) {
      setError(errorMessage(e));
      setInput(value);
    } finally {
      setPending(false);
      requestAnimationFrame(() => {
        log.current?.scrollTo({
          top: log.current.scrollHeight,
          behavior: "auto",
        });
      });
    }
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }
  return (
    <>
      <button
        className={s.launcher}
        onClick={() => dialog.current?.showModal()}
        aria-haspopup="dialog"
      >
        <span>✦</span>
        <span>
          Asistente PLASTIMAD<small>Hablemos de tu próxima maceta</small>
        </span>
        <Icon />
      </button>
      <dialog
        ref={dialog}
        className={s.chat}
        aria-labelledby="assistant-heading"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
      >
        <header className={s.chatHeader}>
          <span className={s.assistantMark}>✦</span>
          <div>
            <h2 id="assistant-heading">Tu asesor PLASTIMAD</h2>
            <small>Características, colores y precios</small>
          </div>
          <button
            aria-label="Cerrar asistente"
            onClick={() => dialog.current?.close()}
          >
            ×
          </button>
        </header>
        <div className={s.chatContext}>
          <Icon name="leaf" />
          <span>
            Consultando: <strong>{product.name}</strong>
          </span>
        </div>
        <div
          className={s.messages}
          ref={log}
          role="log"
          aria-live="polite"
          aria-relevant="additions text"
        >
          <article className={s.reply}>
            <small>PLASTIMAD · CATÁLOGO</small>
            <p>
              Hola. Te ayudo a conocer nuestras macetas y a elegir el siguiente
              paso para tu espacio. ¿Qué te gustaría saber?
            </p>
          </article>
          {messages.map((m, i) => (
            <article
              key={i}
              className={m.role === "user" ? s.question : s.reply}
            >
              <small>
                {m.role === "user"
                  ? "TÚ"
                  : m.mode === "ai"
                    ? "PLASTIMAD · IA + CATÁLOGO"
                    : "PLASTIMAD · CATÁLOGO"}
              </small>
              <p>{m.text}</p>
            </article>
          ))}
          {pending && (
            <p className={s.status} role="status">
              Consultando la información…
            </p>
          )}
        </div>
        <div className={s.suggestions}>
          {[
            "¿Qué características tiene?",
            "¿Cuál es el precio?",
            "¿Qué colores hay?",
            "¿Cuánto mide?",
          ].map((q) => (
            <button key={q} disabled={pending} onClick={() => void send(q)}>
              {q}
            </button>
          ))}
        </div>
        <div className={s.chatBottom}>
          {error && (
            <p role="alert" className={s.error}>
              {error}
            </p>
          )}
          {notice && <p className={s.note}>{notice}</p>}
          <form onSubmit={submit} className={s.chatForm}>
            <input
              autoComplete="off"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={1000}
              placeholder="Escribe tu pregunta…"
              aria-label="Pregunta al asistente"
              required
            />
            <button
              disabled={pending || !input.trim()}
              aria-label="Enviar pregunta"
            >
              <Icon />
            </button>
          </form>
          <label className={s.aiConsent}>
            <input
              type="checkbox"
              checked={useAI}
              onChange={(e) => setUseAI(e.target.checked)}
            />
            Permitir a OpenAI interpretar mi pregunta con IA.
          </label>
          <p className={s.note}>
            Sin activar IA, las respuestas consultan la ficha publicada. No
            incluyas datos personales. Esta conversación se conserva solo
            mientras permanezcas en esta página.
          </p>
          <a
            href="#asesoria"
            className={s.textLink}
            onClick={() => dialog.current?.close()}
          >
            Prefiero atención comercial ↗
          </a>
        </div>
      </dialog>
    </>
  );
}
