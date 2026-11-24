"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { BrandMark, Icon } from "@/components/ui/Icons";
import { api, errorMessage } from "./api";
import type { User } from "@/lib/platform";
import { safeDestination } from "@/lib/navigation";

export function AuthForm({
  mode,
  token = "",
  next = "",
}: {
  mode: "login" | "register" | "forgot" | "reset";
  token?: string;
  next?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const titles = {
    login: "Vuelve a tu espacio.",
    register: "Tu próximo comienzo.",
    forgot: "Recupera tu acceso.",
    reset: "Una nueva contraseña.",
  };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setPending(true);
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form);
    if (mode === "reset") body.token = token;
    try {
      const result = await api<{ user?: User; message?: string }>(
        `auth/${mode}`,
        "POST",
        body,
      );
      if (result.user) {
        router.replace(
          safeDestination(
            next,
            result.user.role === "administrator" ? "/admin" : "/panel",
          ),
        );
        router.refresh();
      } else setMessage(result.message || "Operación completada.");
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setPending(false);
    }
  }
  return (
    <main className="p-auth">
      <aside className="p-auth-story">
        <Link href="/" className="brand">
          <BrandMark />
          <span>
            PLASTIMAD<small>DISEÑO CONSCIENTE</small>
          </span>
        </Link>
        <div>
          <span className="eyebrow">UNA NUEVA VIDA, POR NATURALEZA</span>
          <h1>
            Grandes ideas.
            <br />
            <em>Espacios vivos.</em>
          </h1>
          <p>
            Explora materiales, imagina posibilidades y da seguimiento a cada
            paso de tu proyecto.
          </p>
        </div>
        <Link href="/">← Volver a la experiencia</Link>
      </aside>
      <section className="p-auth-main">
        <div className="p-auth-card">
          <span className="p-kicker">TU CUENTA PLASTIMAD</span>
          <h2>{titles[mode]}</h2>
          <p>
            {mode === "register"
              ? "Crea tu cuenta para comprar, seguir tus pedidos y conversar con PLASTIMAD."
              : mode === "login"
                ? "Accede a tus pedidos y conversaciones."
                : "Te ayudamos a recuperar el acceso a tu cuenta."}
          </p>
          <form onSubmit={submit} className="p-form">
            {mode === "register" && (
              <label>
                Nombre completo
                <input
                  name="name"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={100}
                />
              </label>
            )}
            {mode !== "reset" && (
              <label>
                Correo electrónico
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={200}
                />
              </label>
            )}
            {mode !== "forgot" && (
              <label>
                {mode === "reset" ? "Nueva contraseña" : "Contraseña"}
                <input
                  name="password"
                  type="password"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  minLength={mode === "login" ? 1 : 12}
                  maxLength={128}
                  required
                />
                {mode !== "login" && <small>Usa al menos 12 caracteres.</small>}
              </label>
            )}
            {mode === "login" && (
              <Link className="p-form-link" href="/recuperar">
                Olvidé mi contraseña
              </Link>
            )}
            {error && (
              <p className="p-error" role="alert">
                {error}
              </p>
            )}
            {message && (
              <p className="p-success" role="status">
                {message}
              </p>
            )}
            <button className="p-button" disabled={pending}>
              {pending
                ? "Un momento…"
                : mode === "login"
                  ? "Iniciar sesión"
                  : mode === "register"
                    ? "Crear mi cuenta"
                    : mode === "forgot"
                      ? "Enviar instrucciones"
                      : "Guardar contraseña"}
              <Icon />
            </button>
          </form>
          <p className="p-auth-switch">
            {mode === "login" ? (
              <>
                ¿Aún no tienes cuenta?{" "}
                <Link href={`/registro?next=${encodeURIComponent(next)}`}>
                  Regístrate
                </Link>
              </>
            ) : (
              <Link href={`/acceso?next=${encodeURIComponent(next)}`}>
                Volver a iniciar sesión
              </Link>
            )}
          </p>
          <div className="p-auth-note">
            <Icon name="leaf" />
            <span>Un solo acceso. Tu espacio según tu rol.</span>
          </div>
        </div>
      </section>
    </main>
  );
}
