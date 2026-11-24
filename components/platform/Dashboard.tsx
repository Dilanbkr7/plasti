"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrandMark } from "@/components/ui/Icons";
import { api, errorMessage } from "./api";
import { CatalogPanel } from "./CatalogPanel";
import { RequestsPanel } from "./RequestsPanel";
import { ProfilePanel, UsersPanel } from "./PeoplePanel";
import { FeedbackPanel } from "./FeedbackPanel";
import { AnalysisPanel, ChatPanel } from "./AIPanel";
import { Notice } from "./Shared";
import { DatabasePanel } from "./DatabasePanel";
import type { User } from "@/lib/platform";
import s from "./Dashboard.module.css";

const views: Record<string, [string, string]> = {
  requests: [
    "Pedidos y mensajes",
    "Selecciona un pedido para ver sus productos y conversar.",
  ],
  catalog: ["Productos", "Administra las macetas, sus colores y precios."],
  users: [
    "Clientes y cuentas",
    "Consulta los registros, últimos accesos y permisos.",
  ],
  database: ["Base de datos", "Consulta las tablas y registros del sistema."],
  profile: ["Mi cuenta", "Actualiza tus datos y contraseña."],
  feedback: ["Quejas y sugerencias", "Consulta los mensajes y sus respuestas."],
  analysis: ["Tu espacio", "Visualiza una maceta en tu espacio."],
  chat: ["Asistente", "Consulta la información del catálogo."],
};

export function Dashboard({
  initialUser,
  initialView = "requests",
  initialRequest = "",
}: {
  initialUser: User;
  initialView?: string;
  initialRequest?: string;
}) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const admin = user.role === "administrator";
  const allowed = admin
    ? ["requests", "catalog", "users", "database", "profile", "feedback"]
    : ["requests", "profile", "feedback", "analysis", "chat"];
  // Existing overview links now open the order inbox; secondary URLs still work.
  const [view, setView] = useState(
    allowed.includes(initialView) ? initialView : "requests",
  );
  const [notice, setNotice] = useState("");
  const [request, setRequest] = useState(initialRequest);
  function navigate(next: string, requestId = "") {
    setView(next);
    setNotice("");
    setRequest(requestId);
    window.history.replaceState(
      null,
      "",
      `${admin ? "/admin" : "/panel"}?view=${next}${requestId ? `&pedido=${encodeURIComponent(requestId)}` : ""}`,
    );
  }
  async function logout() {
    try {
      await api("auth/logout", "POST", {});
      router.replace("/acceso");
      router.refresh();
    } catch (e) {
      setNotice(errorMessage(e));
    }
  }
  return (
    <div className={`p-shell ${s.shell}`}>
      <header className={s.header}>
        <Link
          className={s.brand}
          href="/"
          aria-label="PLASTIMAD, ir a la tienda"
        >
          <BrandMark /> <span>PLASTIMAD</span>
        </Link>
        <span className={s.identity}>
          {user.name} <small>{admin ? "Administración" : "Cliente"}</small>
        </span>
        <nav className={s.account} aria-label="Cuenta y tienda">
          <Link className={s.store} href="/#coleccion">
            Ver tienda ↗
          </Link>
          <button type="button" onClick={() => navigate("profile")}>
            Mi cuenta
          </button>
          <button type="button" onClick={logout}>
            Salir
          </button>
        </nav>
      </header>
      <main className={s.main}>
        <div className={s.navigation}>
          <nav
            className={s.tabs}
            aria-label={admin ? "Administración de la tienda" : "Mi panel"}
          >
            {(admin ? ["requests", "catalog"] : ["requests", "feedback"]).map(
              (id) => (
                <button
                  type="button"
                  key={id}
                  className={view === id ? s.active : undefined}
                  aria-current={view === id ? "page" : undefined}
                  onClick={() => navigate(id)}
                >
                  {!admin && id === "requests" ? "Mis pedidos" : views[id][0]}
                </button>
              ),
            )}
          </nav>
          {admin && (
            <details className={s.tools}>
              <summary>Gestión</summary>
              <div>
                {["users", "database", "feedback"].map((id) => (
                  <button
                    type="button"
                    key={id}
                    aria-current={view === id ? "page" : undefined}
                    onClick={(event) => {
                      navigate(id);
                      event.currentTarget
                        .closest("details")
                        ?.removeAttribute("open");
                    }}
                  >
                    {views[id][0]}
                  </button>
                ))}
              </div>
            </details>
          )}
        </div>
        <div className={s.heading}>
          <div>
            <h1>
              {view === "requests" && !admin ? "Mis pedidos" : views[view][0]}
            </h1>
            <p>
              {view === "requests" && !admin
                ? "Abre un pedido para ver tus productos o escribir a PLASTIMAD."
                : views[view][1]}
            </p>
          </div>
        </div>
        {notice && <Notice error>{notice}</Notice>}
        {view === "requests" && (
          <RequestsPanel
            key={request || "orders"}
            admin={admin}
            userId={user.id}
            initialRequest={request}
          />
        )}
        {view === "catalog" && admin && <CatalogPanel admin />}
        {view === "users" && admin && <UsersPanel />}
        {view === "database" && admin && <DatabasePanel />}
        {view === "profile" && <ProfilePanel user={user} onUpdate={setUser} />}
        {view === "feedback" && <FeedbackPanel admin={admin} />}
        {view === "analysis" && !admin && <AnalysisPanel />}
        {view === "chat" && !admin && <ChatPanel />}
      </main>
    </div>
  );
}
