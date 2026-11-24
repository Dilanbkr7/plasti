"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, errorMessage, useResource } from "./api";
import {
  money,
  requestStatuses,
  requestTransitions,
  type CommercialRequest,
  type Product,
  type RequestEvent,
  type User,
} from "@/lib/platform";
import { Empty, Loading, Notice } from "./Shared";
import s from "./Orders.module.css";
export function RequestsPanel({
  admin,
  userId,
  initialRequest = "",
}: {
  admin: boolean;
  userId: string;
  initialRequest?: string;
}) {
  const { data, error, loading, refresh } = useResource<{
    requests: CommercialRequest[];
  }>("requests");
  const [creating, setCreating] = useState(false);
  const catalog = useResource<{ products: Product[] }>(
    creating ? "products" : null,
  );
  const customers = useResource<{ users: User[] }>(creating ? "users" : null);
  const [productId, setProductId] = useState("");
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(
    initialRequest || null,
  );
  const [mobileDetail, setMobileDetail] = useState(Boolean(initialRequest));
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) refresh();
    }, 5000);
    return () => clearInterval(timer);
  }, [refresh]);
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [edit, setEdit] = useState<CommercialRequest | null>(null);
  const product = catalog.data?.products.find((p) => p.id === productId);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setNotice("");
    const form = new FormData(event.currentTarget);
    try {
      const saved = await api<{ id: string }>(
        `requests${edit ? `/${edit.id}` : ""}`,
        edit ? "PUT" : "POST",
        {
          title: form.get("title"),
          description: form.get("description"),
          quantity: Number(form.get("quantity")),
          product_id: productId || null,
          analysis_id: edit?.analysis_id || null,
          color: form.get("color") || "",
          size: form.get("size") || "",
          finish: form.get("finish") || "",
          ...(admin && !edit ? { customer_id: form.get("customer_id") } : {}),
        },
      );
      setCreating(false);
      setEdit(null);
      setSelected(saved.id);
      setMobileDetail(true);
      refresh();
    } catch (e) {
      setNotice(errorMessage(e));
    } finally {
      setPending(false);
    }
  }
  const rows =
    data?.requests.filter(
      (r) =>
        (!filter || r.status === filter) &&
        `${r.title} ${r.customer_name} ${r.customer_email}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    ) || [];
  // Remember the first result so a poll cannot switch conversations while typing.
  if (selected === null && rows.length > 0) setSelected(rows[0].id);
  const activeRequest = selected;
  function exportCsv() {
    const escape = (value: string) =>
      `"${value.replace(/^[=+@\-]/, "'$&").replaceAll('"', '""')}"`;
    const csv = [
      "Referencia,Proyecto,Cliente,Estado,Estimación USD",
      ...rows.map((r) =>
        [
          r.id,
          r.title,
          r.customer_name,
          requestStatuses[r.status],
          String(r.estimated_total_cents / 100),
        ]
          .map(escape)
          .join(","),
      ),
    ].join("\n");
    const url = URL.createObjectURL(
      new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "solicitudes-plastimad.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className={`${s.root} ${mobileDetail ? s.conversationOpen : ""}`}>
      {admin && (
        <div className={`p-toolbar ${s.toolbar}`}>
          <input
            aria-label="Buscar pedidos"
            placeholder="Buscar pedido o cliente…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelected(null);
              setMobileDetail(false);
            }}
          />
          <select
            aria-label="Filtrar por estado"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setSelected(null);
              setMobileDetail(false);
            }}
          >
            <option value="">Todos los estados</option>
            {Object.entries(requestStatuses).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {!creating && (
            <button
              type="button"
              className="p-button p-secondary"
              onClick={() => {
                setCreating(true);
                setEdit(null);
                setProductId("");
              }}
            >
              Nueva consulta
            </button>
          )}
          {rows.length > 0 && (
            <details className={s.actions}>
              <summary>Más</summary>
              <div>
                <button className="p-link" onClick={exportCsv}>
                  Exportar CSV
                </button>
              </div>
            </details>
          )}
        </div>
      )}
      {error && <Notice error>{error}</Notice>}
      {loading && <Loading />}
      {admin && creating && (
        <section className="p-card">
          <div className="p-card-heading">
            <h2>{edit ? "Editar solicitud" : "Cuéntanos tu proyecto"}</h2>
            <button
              className="p-link"
              onClick={() => {
                setCreating(false);
                setEdit(null);
              }}
            >
              Cerrar ✕
            </button>
          </div>
          <form className="p-form" onSubmit={create} key={edit?.id || "new"}>
            {!edit && (
              <label>
                Cliente
                <select name="customer_id" required defaultValue="">
                  <option value="" disabled>
                    Selecciona un cliente activo
                  </option>
                  {customers.data?.users
                    ?.filter((u) => u.active && u.role === "customer")
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} · {u.email}
                      </option>
                    ))}
                </select>
                {customers.error && <span role="alert">{customers.error}</span>}
              </label>
            )}
            <label>
              Nombre del proyecto
              <input
                name="title"
                defaultValue={edit?.title || ""}
                required
                minLength={3}
                maxLength={150}
              />
            </label>
            <div className="p-two">
              <label>
                Producto
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                >
                  <option value="">Asesoría general</option>
                  {catalog.data?.products.map((p) => (
                    <option value={p.id} key={p.id}>
                      {p.name}
                      {p.demo ? " · Demo" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Cantidad
                <input
                  name="quantity"
                  type="number"
                  min="1"
                  max="10000"
                  defaultValue={edit?.quantity || 1}
                  required
                />
              </label>
            </div>
            {product && (
              <div className="p-three" key={product.id}>
                <label>
                  Color
                  <select name="color" defaultValue={edit?.color}>
                    {product.colors.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Tamaño
                  <select name="size" defaultValue={edit?.size}>
                    {product.sizes.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Acabado
                  <select name="finish" defaultValue={edit?.finish}>
                    <option>Natural</option>
                    <option>Cepillado</option>
                  </select>
                </label>
              </div>
            )}
            <label>
              ¿Qué necesitas?
              <textarea
                name="description"
                defaultValue={edit?.description}
                placeholder="Describe tu espacio, medidas conocidas y lo que quieres lograr."
                required
                minLength={10}
                maxLength={4000}
              />
            </label>
            <p className="p-muted">
              La estimación se calcula con los precios del catálogo. El valor
              final, impuestos, envío e instalación se confirman en la atención
              comercial.
            </p>
            {notice && <Notice error>{notice}</Notice>}
            <button className="p-button" disabled={pending}>
              {pending
                ? "Guardando…"
                : edit
                  ? "Guardar cambios"
                  : "Registrar solicitud"}
            </button>
          </form>
        </section>
      )}
      <div
        className={`p-request-layout ${s.layout} ${mobileDetail ? s.detailOpen : ""}`}
      >
        <div className={`p-request-list ${s.list}`}>
          <div className={s.listHeading}>
            <span>{admin ? "Bandeja de pedidos" : "Elige un pedido"}</span>
            <small>{data ? rows.length : "…"}</small>
          </div>
          {rows.map((r) => (
            <button
              className={`p-request-item ${activeRequest === r.id ? "selected" : ""}`}
              key={r.id}
              aria-pressed={activeRequest === r.id}
              onClick={() => {
                setSelected(r.id);
                setMobileDetail(true);
              }}
            >
              <div>
                <span className={`p-badge ${r.status}`}>
                  {requestStatuses[r.status]}
                </span>
                <small>
                  {new Date(r.created_at).toLocaleDateString("es-EC")}
                </small>
              </div>
              <h3>{r.title}</h3>
              <p>
                {admin
                  ? r.customer_name
                  : r.items?.length
                    ? `${r.items.length} opciones de macetas`
                    : r.product_name || "Asesoría general"}
              </p>
              <footer>
                <span>#{r.id.slice(0, 8).toUpperCase()}</span>
                <strong>
                  {r.estimated_total_cents
                    ? money(r.estimated_total_cents)
                    : "Por cotizar"}
                </strong>
              </footer>
            </button>
          ))}
          {!loading && !error && !rows.length && (
            <Empty>
              {search || filter
                ? "No hay pedidos que coincidan con la búsqueda."
                : "Todavía no hay pedidos. Al comprar, aparecerán aquí con su conversación."}
              {!admin && (
                <Link className="p-link" href="/#coleccion">
                  Ver macetas ↗
                </Link>
              )}
            </Empty>
          )}
        </div>
        {activeRequest && (
          <RequestDetail
            key={activeRequest}
            id={activeRequest}
            admin={admin}
            userId={userId}
            onBack={() => setMobileDetail(false)}
            onUpdate={refresh}
            onEdit={(r) => {
              setEdit(r);
              setProductId(
                (r as CommercialRequest & { product_id: string }).product_id ||
                  "",
              );
              setCreating(true);
            }}
          />
        )}
      </div>
    </div>
  );
}
function RequestDetail({
  id,
  admin,
  userId,
  onUpdate,
  onEdit,
  onBack,
}: {
  id: string;
  admin: boolean;
  userId: string;
  onUpdate: () => void;
  onEdit: (r: CommercialRequest) => void;
  onBack: () => void;
}) {
  const { data, error, loading, refresh } = useResource<{
    request: CommercialRequest;
    events: RequestEvent[];
  }>(`requests/${id}`);
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) refresh();
    }, 5000);
    return () => clearInterval(timer);
  }, [refresh]);
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const timeline = useRef<HTMLDivElement>(null);
  const followMessages = useRef(true);
  useEffect(() => {
    if (timeline.current && followMessages.current)
      timeline.current.scrollTop = timeline.current.scrollHeight;
  }, [data?.events.length]);
  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    setPending(true);
    setNotice("");
    try {
      await api(`requests/${id}`, "PATCH", {
        status: form.get("status") || undefined,
        message: form.get("message") || "",
        internal: form.get("internal") === "on",
      });
      element.reset();
      refresh();
      onUpdate();
    } catch (e) {
      setNotice(errorMessage(e));
    } finally {
      setPending(false);
    }
  }
  if (loading || error || !data)
    return (
      <section className={`p-card ${s.detail}`}>
        <button className={`p-link ${s.back}`} onClick={onBack}>
          ← Volver a pedidos
        </button>
        {loading ? <Loading /> : error ? <Notice error>{error}</Notice> : null}
      </section>
    );
  const r = data.request;
  const isOpen = !["closed", "cancelled"].includes(r.status);
  const canMessage = admin || isOpen;
  const statuses = admin
    ? requestTransitions[r.status]
    : r.payment_method !== "cod" ||
        !isOpen ||
        ["shipped", "delivered"].includes(r.status)
      ? []
      : ["cancelled" as const];
  return (
    <section
      className={`p-card p-detail ${s.detail}`}
      aria-label="Pedido y conversación"
    >
      <button className={`p-link ${s.back}`} onClick={onBack}>
        ← Volver a pedidos
      </button>
      <header className={s.detailHeading}>
        <div>
          <span className="p-kicker">
            PEDIDO · #{id.slice(0, 8).toUpperCase()}
          </span>
          <h2>{r.title}</h2>
          {admin && (
            <p className="p-muted">
              {r.customer_name} · {r.customer_email}
            </p>
          )}
        </div>
        <div className={s.total}>
          <strong>{money(r.estimated_total_cents)}</strong>
          <span className={`p-badge ${r.status}`}>
            {requestStatuses[r.status]}
          </span>
        </div>
      </header>
      <details className={s.orderInfo}>
        <summary>
          Ver productos y datos de {r.delivery ? "entrega" : "la solicitud"}
        </summary>
        <p className="p-prewrap">{r.description}</p>
        {r.delivery && (
          <div className="p-order-delivery">
            <h3>Entrega y resumen del pedido</h3>
            <p>
              <strong>{r.delivery.full_name}</strong> · {r.delivery.phone}
            </p>
            <p>
              {r.delivery.city} · {r.delivery.address}
            </p>
            <p>Referencia: {r.delivery.reference}</p>
            <p>
              Forma de pago: <strong>Contraentrega</strong> · pagas al recibir.
            </p>
            {r.items?.length ? (
              <div className="p-order-items">
                <h3>Productos del pedido</h3>
                {r.items.map((item) => (
                  <p key={`${item.product_id}:${item.color}`}>
                    <strong>{item.name}</strong> · {item.color}
                    <br />
                    {item.quantity} × {money(item.unit_price_cents)} ={" "}
                    {money(item.subtotal_cents)}
                  </p>
                ))}
              </div>
            ) : (
              <p>
                Precio unitario: {money(r.unit_price_cents || 0)} · Cantidad:{" "}
                {r.quantity}
              </p>
            )}
            <p>
              <strong>
                Total de productos: {money(r.estimated_total_cents)}
              </strong>
            </p>
            <p>
              Envío y condiciones de entrega por coordinar en esta conversación
              antes del despacho.
            </p>
          </div>
        )}
        {r.product_snapshot && !r.delivery && (
          <p className="p-notice">
            Producto al registrar la solicitud: {r.product_snapshot.name}.
            Precio unitario:{" "}
            {r.product_snapshot.price_cents
              ? money(r.product_snapshot.price_cents)
              : "Por confirmar"}
            . Estos datos se conservan aunque cambie el catálogo.
          </p>
        )}
        <div className="p-inline p-muted">
          <span>{r.quantity} unidades</span>
          <span>
            {r.color} {r.size} {r.finish}
          </span>
        </div>
        {r.analysis_id && (
          <a
            className="p-link"
            target="_blank"
            rel="noreferrer"
            href={`/api/analyses/${r.analysis_id}/image`}
          >
            Ver imagen del espacio ↗
          </a>
        )}
        {admin && r.status === "new" && r.payment_method !== "cod" && (
          <button className="p-link" onClick={() => onEdit(r)}>
            Editar los datos de esta solicitud
          </button>
        )}
      </details>
      <div className={s.conversationHeading}>
        <h3>{admin ? "Mensajes del cliente" : "Mensajes con PLASTIMAD"}</h3>
      </div>
      <div
        className={s.timeline}
        ref={timeline}
        role="log"
        aria-label="Mensajes del pedido"
        aria-live="polite"
        aria-relevant="additions"
        tabIndex={0}
        onScroll={(e) => {
          const el = e.currentTarget;
          followMessages.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < 60;
        }}
      >
        {data.events.length === 0 && (
          <p className="p-muted">Todavía no hay mensajes en este pedido.</p>
        )}
        {data.events.map((e) => (
          <article
            key={e.id}
            className={
              e.internal
                ? s.internal
                : e.system
                  ? s.system
                  : e.author_id === userId
                    ? s.sent
                    : undefined
            }
          >
            <div>
              <strong>
                {e.system
                  ? "PLASTIMAD · mensaje automático"
                  : e.author_id === userId
                    ? "Tú"
                    : e.author_name}
              </strong>
              <time>{new Date(e.created_at).toLocaleString("es-EC")}</time>
            </div>
            <p className="p-prewrap">{e.message}</p>
            {e.status && <small>{requestStatuses[e.status]}</small>}
            {e.internal && <small> · Nota interna</small>}
          </article>
        ))}
      </div>
      {canMessage && (
        <form className={`p-form ${s.composer}`} onSubmit={update}>
          <label>
            {admin ? "Responder al cliente" : "Escribir a PLASTIMAD"}
            <textarea
              name="message"
              maxLength={3000}
              placeholder="Escribe tu mensaje…"
              rows={2}
              required
            />
          </label>
          <button className="p-button" disabled={pending}>
            {pending ? "Guardando…" : "Enviar mensaje"}
          </button>
        </form>
      )}
      {(admin || statuses.length > 0) && (
        <details className={s.statusOptions}>
          <summary>
            {admin ? "Gestionar pedido" : "Opciones del pedido"}
          </summary>
          {statuses.length > 0 && (
            <form className="p-form" onSubmit={update}>
              <label>
                Nuevo estado
                <select name="status" defaultValue="" required>
                  <option value="" disabled>
                    Selecciona un estado
                  </option>
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {requestStatuses[s]}
                    </option>
                  ))}
                </select>
              </label>
              <button className="p-button p-secondary" disabled={pending}>
                Actualizar estado
              </button>
            </form>
          )}
          {admin && (
            <form className="p-form" onSubmit={update}>
              <input name="internal" type="hidden" value="on" />
              <label>
                Nota privada para el equipo
                <textarea name="message" rows={2} maxLength={3000} required />
              </label>
              <button className="p-button p-secondary" disabled={pending}>
                Guardar nota privada
              </button>
            </form>
          )}
        </details>
      )}
      {notice && <Notice error>{notice}</Notice>}
      {!admin && !isOpen && (
        <p className="p-notice">
          Esta solicitud está{" "}
          {r.status === "closed" ? "finalizada" : "cancelada"}. Puedes consultar
          el historial de mensajes.
        </p>
      )}
    </section>
  );
}
