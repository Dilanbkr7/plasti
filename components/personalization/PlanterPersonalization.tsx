"use client";
import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Icon } from "@/components/ui/Icons";
import { errorMessage, useResource } from "@/components/platform/api";
import { money } from "@/lib/platform";
import { generatePersonalization } from "@/lib/personalization/client";
import { resolveProposal } from "@/lib/personalization/catalog";
import type {
  PersonalizationCapabilities,
  PersonalizationProposal,
} from "@/lib/personalization/types";
import { ProductPurchaseDialog } from "./ProductPurchaseDialog";
import s from "./PlanterPersonalization.module.css";

export function PlanterPersonalization({
  initialColor = "auto",
  sectionId = "analiza",
}: { initialColor?: string; sectionId?: string } = {}) {
  const catalog = useResource<PersonalizationCapabilities>("personalization");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [preference, setPreference] = useState(initialColor);
  const [imageReady, setImageReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [consent, setConsent] = useState(false);
  const [seenProducts, setSeenProducts] = useState<string[]>([]);
  const controller = useRef<AbortController | null>(null);
  const [proposal, setProposal] = useState<PersonalizationProposal | null>(
    null,
  );
  const [purchase, setPurchase] = useState<PersonalizationProposal | null>(
    null,
  );
  const fileInput = useRef<HTMLInputElement>(null);
  const revision = useRef(0);
  const result = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  useEffect(
    () => () => {
      revision.current++;
      controller.current?.abort();
    },
    [],
  );
  const colors = catalog.data?.catalog.colors || [];
  const selectedColor = colors.some((c) => c.name === preference)
    ? preference
    : "auto";
  const currentProposal =
    proposal && catalog.data
      ? resolveProposal(
          catalog.data.catalog,
          proposal.selection,
          selectedColor === "auto"
            ? { mode: "auto" }
            : { mode: "selected", color: selectedColor },
          proposal.image_url,
        )
      : null;

  function clearResult() {
    revision.current++;
    setProposal(null);
    setPurchase(null);
    setNotice("");
    setError("");
    setSeenProducts([]);
  }
  function changePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    clearResult();
    setConsent(false);
    setImageReady(false);
    setPhoto(null);
    setPreview(null);
    if (
      file.size === 0 ||
      file.size > 4_000_000 ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    ) {
      setError("Selecciona una foto JPG, PNG o WebP de hasta 4 MB.");
      event.target.value = "";
      return;
    }
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  }
  async function generate(event?: FormEvent, restart = false) {
    event?.preventDefault();
    if (
      inFlight.current ||
      !photo ||
      !imageReady ||
      !catalog.data ||
      !consent ||
      !catalog.data.available
    )
      return;
    inFlight.current = true;
    const generation = ++revision.current;
    setPending(true);
    setError("");
    setNotice("");
    controller.current = new AbortController();
    const excludedProducts = restart ? [] : seenProducts;
    const preference =
      selectedColor === "auto"
        ? { mode: "auto" as const }
        : { mode: "selected" as const, color: selectedColor };
    try {
      const response = await generatePersonalization(
        { photo, preference, excludedProducts, consent },
        catalog.data,
        {
          signal: controller.current.signal,
          onProgress: (message) => {
            if (generation === revision.current) setNotice(message);
          },
        },
      );
      if (generation !== revision.current) return;
      if (response.status === "unavailable") setNotice(response.message);
      else if (response.status === "ready") {
        const resolved = resolveProposal(
          catalog.data.catalog,
          response.proposal.selection,
          preference,
          response.proposal.image_url,
        );
        if (!resolved)
          throw new Error(
            "La propuesta no coincide con un producto y color disponibles. Intenta nuevamente.",
          );
        setProposal({ ...resolved, reason: response.proposal.reason });
        setSeenProducts([
          ...new Set([...excludedProducts, resolved.selection.product_id]),
        ]);
        setNotice(
          "Tu propuesta está lista. La imagen es una visualización generada; consulta las características reales en la ficha del producto.",
        );
      }
      result.current?.focus({ preventScroll: true });
    } catch (e) {
      if (generation === revision.current) {
        setNotice("");
        setError(
          e instanceof DOMException && e.name === "TimeoutError"
            ? "La cola gratuita está tardando demasiado. Intenta de nuevo más tarde."
            : errorMessage(e),
        );
      }
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }
  return (
    <section
      className={s.section}
      id={sectionId}
      aria-label="Personalización de macetas"
    >
      <header className={s.header}>
        <div>
          <span className={s.kicker}>
            PLASTIMAD · TU ESPACIO, OTRA POSIBILIDAD
          </span>
          <h2>
            Imagina lo que <em>puede florecer.</em>
          </h2>
          <p>
            Tu jardín, patio o terraza. Una fotografía como punto de partida
            para encontrar la maceta que conecte con tu espacio.
          </p>
        </div>
        <span className={s.badge}>
          <span />{" "}
          {catalog.data?.available
            ? "Qwen · Hugging Face"
            : "IA pendiente de activar"}
        </span>
      </header>
      <div className={s.workspace}>
        <form
          className={s.editor}
          onSubmit={generate}
          aria-label="Preparar mi personalización"
        >
          <div className={s.step}>
            <span>01</span>
            <h3>Muéstranos tu espacio</h3>
          </div>
          <p>Elige una foto clara de tu espacio vacío, con buena luz.</p>
          <div className={`${s.upload} ${preview ? s.hasPhoto : ""}`}>
            {preview ? (
              <Image
                key={preview}
                src={preview}
                fill
                unoptimized
                sizes="(max-width: 760px) 90vw, 42vw"
                alt="Fotografía original de tu espacio"
                onLoad={() => setImageReady(true)}
                onError={() => {
                  clearResult();
                  setImageReady(false);
                  setPhoto(null);
                  setPreview(null);
                  if (fileInput.current) fileInput.current.value = "";
                  setError(
                    "No pudimos abrir esa imagen. Prueba con otra fotografía.",
                  );
                }}
              />
            ) : (
              <div className={s.uploadContent}>
                <span className={s.uploadIcon}>
                  <Icon name="upload" width={28} height={28} />
                </span>
                <strong>El comienzo de una nueva idea.</strong>
                <span>Sube una fotografía de tu espacio</span>
                <small>JPG, PNG o WebP · hasta 4 MB</small>
              </div>
            )}
            <input
              ref={fileInput}
              type="file"
              aria-label="Fotografía de tu espacio"
              accept="image/jpeg,image/png,image/webp"
              onChange={changePhoto}
              disabled={pending}
            />
          </div>
          <div className={s.photoActions}>
            <button
              type="button"
              className={s.secondary}
              disabled={pending}
              onClick={() => fileInput.current?.click()}
            >
              {preview ? "Cambiar fotografía" : "Seleccionar fotografía"}{" "}
              <Icon name="upload" />
            </button>
            {preview && (
              <button
                type="button"
                className={s.textButton}
                disabled={pending}
                onClick={() => {
                  clearResult();
                  setPhoto(null);
                  setPreview(null);
                  setImageReady(false);
                  if (fileInput.current) fileInput.current.value = "";
                }}
              >
                Quitar foto
              </button>
            )}
          </div>
          {preview && imageReady ? (
            <fieldset className={s.colorField} disabled={pending}>
              <legend>
                <span className={s.stepNumber}>02</span> Colores disponibles
                para tu propuesta
              </legend>
              <div className={s.colorOptions}>
                {colors.map((color) => (
                  <label
                    key={color.name}
                    className={selectedColor === color.name ? s.selected : ""}
                  >
                    <input
                      type="radio"
                      name="personalization-color"
                      value={color.name}
                      checked={selectedColor === color.name}
                      onChange={() => {
                        clearResult();
                        setPreference(color.name);
                      }}
                    />
                    {color.hex && (
                      <span
                        className={s.swatch}
                        style={{ background: color.hex }}
                      />
                    )}
                    {color.name}
                  </label>
                ))}
                <label
                  className={`${s.autoColor} ${selectedColor === "auto" ? s.selected : ""}`}
                >
                  <input
                    type="radio"
                    name="personalization-color"
                    value="auto"
                    checked={selectedColor === "auto"}
                    onChange={() => {
                      clearResult();
                      setPreference("auto");
                    }}
                  />
                  <span aria-hidden="true">✦</span> Modelo y color al azar
                </label>
              </div>
            </fieldset>
          ) : (
            <p className={s.note}>
              Después de subir tu foto podrás elegir negro, tomate o celeste, o
              probar un modelo y color al azar.
            </p>
          )}
          {catalog.loading && (
            <p role="status">Consultando los colores del catálogo…</p>
          )}
          {catalog.error && (
            <div className={s.error} role="alert">
              No pudimos consultar el catálogo.{" "}
              <button type="button" onClick={catalog.refresh}>
                Volver a intentar
              </button>
            </div>
          )}
          {catalog.data && !catalog.data.catalog.complete && (
            <p className={s.note}>
              Estamos preparando la colección y sus fotografías definitivas para
              las propuestas personalizadas.
            </p>
          )}
          {error && (
            <p className={s.error} role="alert">
              {error}
            </p>
          )}
          {preview && imageReady && (
            <label className={s.consent}>
              <input
                type="checkbox"
                checked={consent}
                disabled={pending}
                onChange={(event) => setConsent(event.target.checked)}
              />
              <span>
                Autorizo enviar esta foto al editor de imágenes de Hugging Face
                para generar la propuesta.
              </span>
            </label>
          )}
          {catalog.data && !catalog.data.available && (
            <p className={s.note} role="status">
              {catalog.data.message}
            </p>
          )}
          <button
            className={s.primary}
            disabled={
              !photo ||
              !imageReady ||
              !catalog.data ||
              Boolean(catalog.error) ||
              !catalog.data.available ||
              !consent ||
              seenProducts.length >=
                (catalog.data.catalog.candidates.length || 6) ||
              pending
            }
          >
            {pending ? "Personalizando tu espacio…" : "Personalizar mi espacio"}{" "}
            <Icon />
          </button>
          <p className={s.privacy}>
            Solo al generar se envía una copia optimizada al Space de Qwen Image
            Edit en Hugging Face. La propuesta se puede consultar durante 24
            horas. Las copias locales caducadas se eliminan al iniciar otra
            generación. El Space gestiona sus propias copias.
          </p>
        </form>
        <div
          className={s.result}
          ref={result}
          tabIndex={-1}
          aria-label="Propuesta personalizada"
          aria-busy={pending}
        >
          <div className={s.resultTop}>
            <span className={s.kicker}>03 / TU PRÓXIMO ESPACIO</span>
            <span className={s.resultTag}>
              {currentProposal ? "Propuesta" : "Vista previa"}
            </span>
          </div>
          {currentProposal ? (
            <>
              <div className={s.generatedImage}>
                <Image
                  src={currentProposal.image_url}
                  alt="Propuesta personalizada para tu espacio"
                  fill
                  unoptimized
                  sizes="(max-width:760px) 90vw, 42vw"
                />
              </div>
              <article className={s.product}>
                <span className={s.kicker}>LA MACETA DE TU PROPUESTA</span>
                <h3>{currentProposal.product.name}</h3>
                <p>{currentProposal.product.description}</p>
                {proposal?.reason && (
                  <p className={s.reason}>
                    <strong>Por qué esta maceta</strong>
                    <br />
                    {proposal.reason}
                  </p>
                )}
                <div>
                  <span>Color: {currentProposal.selection.color}</span>
                  <strong>
                    {currentProposal.product.price_cents
                      ? money(currentProposal.product.price_cents)
                      : "Precio a consultar"}
                  </strong>
                </div>
              </article>
            </>
          ) : (
            <div className={s.empty}>
              <div className={s.emptyArt} aria-hidden="true">
                <Icon name="leaf" width={48} height={48} />
                <span>✦</span>
              </div>
              <h3>
                {pending
                  ? "Tu espacio está tomando forma"
                  : "Aquí empieza otra posibilidad."}
              </h3>
              <p>
                {pending
                  ? "Estamos integrando una maceta del catálogo en tu fotografía."
                  : "Aquí verás una maceta del catálogo integrada en tu espacio, con su color y precio."}
              </p>
              <span className={s.emptyLabel}>
                Sin propuesta generada todavía
              </span>
            </div>
          )}
          <div className={s.information} role="status" aria-live="polite">
            <Icon name="sun" />
            <p>
              {notice ||
                catalog.data?.message ||
                "La propuesta utilizará una maceta real del catálogo y respetará el color que elijas."}
            </p>
          </div>
          <div className={s.resultActions}>
            <button
              type="button"
              className={s.secondary}
              disabled={!currentProposal || pending}
              onClick={() =>
                generate(
                  undefined,
                  seenProducts.length >=
                    (catalog.data?.catalog.candidates.length || 6),
                )
              }
            >
              <Icon name="rotate" />{" "}
              {seenProducts.length >=
              (catalog.data?.catalog.candidates.length || 6)
                ? "Volver a explorar"
                : "Probar otra maceta"}
            </button>
            <button
              type="button"
              className={s.primary}
              disabled={!currentProposal || pending}
              onClick={() => setPurchase(currentProposal)}
            >
              Comprar ahora <Icon />
            </button>
          </div>
          <small className={s.note}>
            Visualización orientativa: el entorno y el tono pueden variar.
            Comprar conserva el producto y color reales del catálogo.
          </small>
        </div>
      </div>
      <ProductPurchaseDialog
        proposal={purchase}
        onClose={() => setPurchase(null)}
      />
    </section>
  );
}
