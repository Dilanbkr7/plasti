"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage, useResource } from "./api";
import type { User } from "@/lib/platform";
import { Empty, Loading, Notice } from "./Shared";
export function UsersPanel() {
  const { data, error, loading, refresh } = useResource<{ users: User[] }>(
    "users",
  );
  const [selected, setSelected] = useState<User | "new" | null>(null);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) refresh();
    }, 10000);
    return () => clearInterval(timer);
  }, [refresh]);
  const date = (value: string) =>
    new Date(value).toLocaleString("es-EC", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Guayaquil",
    });
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setNotice("");
    const form = new FormData(event.currentTarget);
    const user = selected !== "new" ? selected : null;
    try {
      await api(`users${user ? `/${user.id}` : ""}`, user ? "PATCH" : "POST", {
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
        role: form.get("role"),
        active: form.get("active") === "on",
      });
      setSelected(null);
      refresh();
    } catch (e) {
      setNotice(errorMessage(e));
    } finally {
      setPending(false);
    }
  }
  const user = selected !== "new" ? selected : null;
  return (
    <>
      <div className="p-toolbar">
        <input
          placeholder="Buscar nombre o correo…"
          aria-label="Buscar usuarios"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="p-button p-secondary" onClick={refresh}>
          Actualizar usuarios
        </button>
        <button
          className="p-button"
          onClick={() => {
            setSelected("new");
            setNotice("");
          }}
        >
          + Crear usuario
        </button>
      </div>
      <p className="p-notice">
        Las cuentas nuevas aparecen automáticamente. Puedes comprobar su fecha
        de registro y último acceso. Las contraseñas están protegidas y no se
        muestran.
      </p>
      {error && <Notice error>{error}</Notice>}
      {loading && <Loading />}
      {selected && (
        <section className="p-card">
          <div className="p-card-heading">
            <h2>{user ? "Gestionar usuario" : "Crear una cuenta"}</h2>
            <button className="p-link" onClick={() => setSelected(null)}>
              Cerrar ✕
            </button>
          </div>
          <form className="p-form" key={user?.id || "new"} onSubmit={save}>
            <label>
              Nombre
              <input
                name="name"
                defaultValue={user?.name}
                required
                minLength={2}
                maxLength={100}
              />
            </label>
            {!user && (
              <>
                <label>
                  Correo
                  <input name="email" type="email" required />
                </label>
                <label>
                  Contraseña inicial
                  <input
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={128}
                    required
                  />
                  <small>
                    Entrégala por un canal privado. El usuario puede cambiarla
                    desde su perfil.
                  </small>
                </label>
              </>
            )}
            <label>
              Rol
              <select name="role" defaultValue={user?.role || "customer"}>
                <option value="customer">Cliente</option>
                <option value="administrator">Administrador</option>
              </select>
            </label>
            {user && (
              <label className="p-check">
                <input
                  name="active"
                  type="checkbox"
                  defaultChecked={user.active}
                />
                Cuenta activa
              </label>
            )}
            {notice && <Notice error>{notice}</Notice>}
            <button className="p-button" disabled={pending}>
              {pending ? "Guardando…" : "Guardar usuario"}
            </button>
          </form>
        </section>
      )}
      <div className="p-table-wrap">
        <table className="p-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Contacto</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Registro / último acceso</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data?.users
              .filter((u) =>
                `${u.name} ${u.email}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.name}</strong>
                    <small>{u.company || "Sin empresa"}</small>
                  </td>
                  <td>
                    {u.email}
                    <small>{u.phone}</small>
                  </td>
                  <td>
                    {u.role === "administrator" ? "Administrador" : "Cliente"}
                  </td>
                  <td>
                    <span
                      className={`p-badge ${u.active ? "closed" : "cancelled"}`}
                    >
                      {u.active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td>
                    <time dateTime={u.created_at}>{date(u.created_at)}</time>
                    <small>
                      {u.last_login_at
                        ? `Acceso: ${date(u.last_login_at)}`
                        : "Sin accesos registrados desde esta actualización"}
                    </small>
                  </td>
                  <td>
                    <button
                      className="p-link"
                      onClick={() => {
                        setSelected(u);
                        setNotice("");
                      }}
                    >
                      Gestionar ↗
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {data?.users.length === 0 && <Empty>No hay usuarios registrados.</Empty>}
    </>
  );
}
export function ProfilePanel({
  user,
  onUpdate,
}: {
  user: User;
  onUpdate: (u: User) => void;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function save(
    event: FormEvent<HTMLFormElement>,
    kind: "profile" | "password",
  ) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");
    try {
      const result = await api<{ user: User }>(
        `auth/${kind}`,
        "POST",
        Object.fromEntries(new FormData(event.currentTarget)),
      );
      if (kind === "profile") {
        onUpdate(result.user);
        setMessage("Tu perfil se ha actualizado.");
      } else {
        router.replace("/acceso");
        router.refresh();
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="p-two p-align-start">
      <section className="p-card">
        <h2>Tu información</h2>
        <form className="p-form" onSubmit={(e) => save(e, "profile")}>
          <label>
            Nombre
            <input
              name="name"
              defaultValue={user.name}
              minLength={2}
              maxLength={100}
              required
            />
          </label>
          <label>
            Correo
            <input value={user.email} disabled />
            <small>
              El correo identifica tu cuenta y no se cambia desde este
              formulario.
            </small>
          </label>
          <label>
            Teléfono
            <input
              name="phone"
              type="tel"
              defaultValue={user.phone}
              maxLength={40}
            />
          </label>
          <label>
            Empresa
            <input name="company" defaultValue={user.company} maxLength={120} />
          </label>
          <button className="p-button" disabled={pending}>
            Guardar perfil
          </button>
        </form>
      </section>
      <section className="p-card">
        <h2>Seguridad de tu cuenta</h2>
        <p className="p-muted">
          Al cambiar la contraseña, se cierran todas tus sesiones.
        </p>
        <form className="p-form" onSubmit={(e) => save(e, "password")}>
          <label>
            Contraseña actual
            <input
              name="current"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <label>
            Nueva contraseña
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
            />
            <small>Al menos 12 caracteres.</small>
          </label>
          <button className="p-button p-secondary" disabled={pending}>
            Actualizar contraseña
          </button>
        </form>
        {message && <Notice>{message}</Notice>}
        {error && <Notice error>{error}</Notice>}
      </section>
    </div>
  );
}
