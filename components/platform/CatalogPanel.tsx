"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { api, errorMessage, useResource } from "./api";
import { money, type Product } from "@/lib/platform";
import { Empty, Loading, Notice } from "./Shared";
import { Icon } from "@/components/ui/Icons";
import { dimensions } from "@/lib/storefront";
import { planterCollection } from "@/lib/catalog/planter-collection";
const blank: Product = {
  id: "",
  name: "",
  description: "",
  category: "Macetas",
  price_cents: 0,
  unit: "unidad",
  colors: ["Nogal", "Carbón", "Arena"],
  sizes: ["S", "M", "L"],
  model_url: "",
  image_url: "",
  active: true,
  demo: false,
};
export function CatalogPanel({ admin = false }: { admin?: boolean }) {
  const { data, error, loading, refresh } = useResource<{
    products: Product[];
  }>(admin ? "products?all=true" : "products");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [edit, setEdit] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!edit) return;
    setSaving(true);
    setNotice("");
    const form = new FormData(event.currentTarget);
    const input = {
      ...edit,
      name: form.get("name"),
      description: form.get("description"),
      category: form.get("category"),
      price_cents: Math.round(Number(form.get("price")) * 100),
      unit: form.get("unit"),
      colors: String(form.get("colors"))
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      sizes: String(form.get("sizes"))
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      model_url: form.get("model_url"),
      image_url: form.get("image_url"),
      active: form.get("active") === "on",
      demo: form.get("demo") === "on",
      featured: form.get("featured") === "on",
      length_cm: form.get("length_cm") ? Number(form.get("length_cm")) : null,
      width_cm: form.get("width_cm") ? Number(form.get("width_cm")) : null,
      height_cm: form.get("height_cm") ? Number(form.get("height_cm")) : null,
    };
    try {
      await api(
        `products${edit.id ? `/${edit.id}` : ""}`,
        edit.id ? "PATCH" : "POST",
        input,
      );
      setEdit(null);
      refresh();
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }
  const products =
    data?.products.filter(
      (p) =>
        (!category || p.category === category) &&
        `${p.name} ${p.description}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    ) || [];
  return (
    <>
      <div className="p-toolbar">
        <input
          aria-label="Buscar productos"
          placeholder="Buscar en la colección…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Categoría"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Todas las categorías</option>
          {[...new Set(data?.products.map((p) => p.category))].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        {admin && (
          <button
            className="p-button"
            onClick={() => {
              setEdit({ ...blank });
              setNotice("");
            }}
          >
            + Nuevo producto
          </button>
        )}
      </div>
      {error && <Notice error>{error}</Notice>}
      {loading && <Loading />}
      {edit && (
        <section className="p-card">
          <div className="p-card-heading">
            <h2>{edit.id ? "Editar producto" : "Nuevo producto"}</h2>
            <button className="p-link" onClick={() => setEdit(null)}>
              Cerrar ✕
            </button>
          </div>
          <form className="p-form" key={edit.id} onSubmit={save}>
            <div className="p-two">
              <label>
                Nombre
                <input
                  name="name"
                  defaultValue={edit.name}
                  required
                  maxLength={150}
                />
              </label>
              <label>
                Categoría
                <input
                  name="category"
                  defaultValue={edit.category}
                  required
                  maxLength={80}
                />
              </label>
            </div>
            <label>
              Descripción
              <textarea
                name="description"
                defaultValue={edit.description}
                required
                minLength={10}
                maxLength={3000}
              />
            </label>
            <div className="p-two">
              <label>
                Precio unitario USD · 0 para consultar
                <input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  max="1000000"
                  defaultValue={edit.price_cents / 100}
                  required
                />
              </label>
              <label>
                Unidad
                <input name="unit" defaultValue={edit.unit} required />
              </label>
            </div>
            <div className="p-two">
              <label>
                Colores separados por coma
                <input
                  name="colors"
                  defaultValue={edit.colors.join(", ")}
                  required
                />
              </label>
              <label>
                Tamaños separados por coma
                <input
                  name="sizes"
                  defaultValue={edit.sizes.join(", ")}
                  required
                />
              </label>
            </div>
            <div className="p-two">
              <label>
                Modelo local GLB (opcional)
                <input name="model_url" defaultValue={edit.model_url} />
              </label>
              <label>
                Imagen local opcional
                <input
                  name="image_url"
                  defaultValue={edit.image_url}
                  placeholder="/images/producto.webp"
                />
              </label>
            </div>
            <div className="p-inline">
              <label className="p-check">
                <input
                  name="featured"
                  type="checkbox"
                  defaultChecked={edit.featured}
                />
                Producto destacado en portada y asistente
              </label>
              <label className="p-check">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={edit.active}
                />
                Visible en catálogo
              </label>
              <label className="p-check">
                <input type="checkbox" name="demo" defaultChecked={edit.demo} />
                Producto de demostración
              </label>
            </div>
            {notice && <Notice error>{notice}</Notice>}
            <div className="p-three">
              <label>
                Largo (cm)
                <input
                  name="length_cm"
                  type="number"
                  min="0.1"
                  max="1000"
                  step="0.1"
                  defaultValue={edit.length_cm || ""}
                />
              </label>
              <label>
                Ancho (cm)
                <input
                  name="width_cm"
                  type="number"
                  min="0.1"
                  max="1000"
                  step="0.1"
                  defaultValue={edit.width_cm || ""}
                />
              </label>
              <label>
                Alto (cm)
                <input
                  name="height_cm"
                  type="number"
                  min="0.1"
                  max="1000"
                  step="0.1"
                  defaultValue={edit.height_cm || ""}
                />
              </label>
            </div>
            <p className="p-muted">
              Deja las medidas vacías si no están confirmadas. El producto
              destacado comparte sus datos con la portada y el asistente. Para
              usar las fotos del catálogo, por ejemplo
              /images/coleccion/semiesferica.webp y los colores Negro carbón,
              Tomate, Verde naturaleza y Celeste.
            </p>
            <button className="p-button" disabled={saving}>
              {saving ? "Guardando…" : "Guardar producto"}
            </button>
          </form>
        </section>
      )}
      <div className="p-product-grid">
        {products.map((p) => (
          <article className="p-product" key={p.id}>
            <div className="p-product-image">
              {p.image_url && (
                <Image
                  src={p.image_url}
                  alt={`Maceta ${p.name}`}
                  fill
                  sizes="(max-width:760px) 90vw, (max-width:1100px) 42vw, 28vw"
                  style={{ objectFit: "contain" }}
                />
              )}
              {!p.image_url && (
                <>
                  <Icon name="leaf" width="60" height="60" />
                  <span>{p.category}</span>
                </>
              )}
              <span className="p-product-badge">
                {!p.active ? "INACTIVO" : p.demo ? "DEMOSTRACIÓN" : "PLASTIMAD"}
              </span>
            </div>
            <div className="p-product-body">
              <span className="p-kicker">{p.category}</span>
              <h3>{p.name}</h3>
              <p>{p.description}</p>
              <p>{dimensions(p)}</p>
              <div className="p-product-meta">
                <strong>
                  {p.price_cents ? money(p.price_cents) : "Consultar precio"}
                </strong>
                <span>/{p.unit}</span>
              </div>
              {p.demo && <small>Precio referencial de demostración.</small>}
              <div className="p-product-actions">
                {admin ? (
                  <button
                    className="p-link"
                    onClick={() => {
                      setEdit(p);
                      setNotice("");
                    }}
                  >
                    Editar producto ↗
                  </button>
                ) : planterCollection.some((item) => item.id === p.id) ? (
                  <Link
                    className="p-link"
                    href={`/?producto=${p.id}&vista=producto#coleccion`}
                  >
                    Ver maceta y comprar ↗
                  </Link>
                ) : null}
                {p.model_url && (
                  <Link
                    className="p-link"
                    href={`/?producto=${p.id}&vista=3d#coleccion`}
                  >
                    Ver en 3D
                  </Link>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
      {!loading && !error && !products.length && (
        <Empty>
          No hay productos que coincidan.{" "}
          {admin
            ? "Crea el primer producto para iniciar tu catálogo."
            : "La colección se publicará aquí cuando esté disponible."}
        </Empty>
      )}
    </>
  );
}
