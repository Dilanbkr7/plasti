"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { api, errorMessage, useResource } from "@/components/platform/api";
import type { Product, User } from "@/lib/platform";
import { Icon } from "@/components/ui/Icons";
import s from "./LandingFeatures.module.css";

import { PlanterPersonalization } from "@/components/personalization/PlanterPersonalization";
function FeedbackForm() {
  const session = useResource<{ user: User | null }>("auth/session");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");
    try {
      await api(
        "feedback",
        "POST",
        Object.fromEntries(new FormData(e.currentTarget)),
      );
      setSaved(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  }
  if (saved)
    return (
      <div className={s.success} role="status">
        <h3>Gracias por compartir tu experiencia.</h3>
        <p>Tu mensaje está guardado.</p>
        <Link href="/panel?view=feedback" className={s.textLink}>
          Consultar respuesta y estado ↗
        </Link>
      </div>
    );
  return session.loading ? (
    <p role="status">Comprobando tu cuenta…</p>
  ) : session.error ? (
    <p role="alert" className={s.error}>
      {session.error}
    </p>
  ) : !session.data?.user ? (
    <p>
      Para consultas sobre las macetas, utiliza el asistente de la página. Las
      sugerencias de clientes se gestionan desde su panel.
    </p>
  ) : (
    <form className={s.form} onSubmit={send}>
      <label>
        Tipo de mensaje
        <select name="kind">
          <option value="suggestion">Sugerencia</option>
          <option value="complaint">Queja</option>
        </select>
      </label>
      <label>
        Asunto
        <input name="subject" required minLength={3} maxLength={150} />
      </label>
      <label>
        Tu mensaje
        <textarea name="message" required minLength={10} maxLength={3000} />
      </label>
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      <button className={s.button} disabled={pending}>
        {pending ? "Enviando…" : "Enviar mensaje"}
        <Icon />
      </button>
    </form>
  );
}
export function LandingServices(props: { product: Product }) {
  return (
    <>
      <PlanterPersonalization />
      <section className={s.serviceGrid}>
        <article id="asesoria">
          <span className={s.kicker}>ATENCIÓN COMERCIAL</span>
          <h2>
            Tu idea merece
            <br />
            <em>una conversación.</em>
          </h2>
          <p>
            Consulta las medidas, el precio y las opciones de entrega. Nuestro
            equipo te acompaña desde tu primera solicitud.
          </p>
          <a href="#coleccion" className={s.button}>
            Explorar macetas <Icon />
          </a>
        </article>
        <article id="te-escuchamos">
          <span className={s.kicker}>QUEJAS Y SUGERENCIAS</span>
          <h2>
            Te escuchamos.
            <br />
            <em>Así seguimos creciendo.</em>
          </h2>
          <p>
            Comparte tu experiencia y consulta la respuesta del equipo en tu
            cuenta.
          </p>
          <FeedbackForm />
        </article>
      </section>
      <section className={s.faq}>
        <span className={s.kicker}>ANTES DE DAR EL SIGUIENTE PASO</span>
        <h2>Preguntas frecuentes</h2>
        {[
          [
            "¿Cómo consulto el precio?",
            "El precio publicado es referencial. Si aparece ‘Precio a consultar’, aún debe confirmarlo el equipo. El asistente y el formulario de asesoría te ayudan a continuar.",
          ],
          [
            "¿Qué colores puedo elegir?",
            props.product.colors.join(", ") +
              ". La selección visual no garantiza existencias; confírmalas al solicitar tu propuesta.",
          ],
          [
            "¿Puedo dar seguimiento a mi solicitud?",
            "Al continuar con Comprar ahora se vincula la solicitud a tu cuenta. Después puedes consultar sus estados y respuestas en Mis solicitudes.",
          ],
          [
            "¿La imagen permite conocer las medidas exactas?",
            "No. La personalización será una propuesta visual a partir de tu foto y de productos reales. La generación de imágenes está pendiente de conexión; las dimensiones y condiciones se confirman con el equipo.",
          ],
        ].map(([q, a]) => (
          <details key={q}>
            <summary>
              {q}
              <span>+</span>
            </summary>
            <p>{a}</p>
          </details>
        ))}
      </section>
    </>
  );
}
