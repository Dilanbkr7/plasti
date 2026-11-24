"use client";
import { useEffect, useRef } from "react";
import { CommercialContact } from "@/components/storefront/CommercialContact";
import type { PersonalizationProposal } from "@/lib/personalization/types";
import s from "./PlanterPersonalization.module.css";

export function ProductPurchaseDialog({
  proposal,
  onClose,
}: {
  proposal: Pick<PersonalizationProposal, "product" | "selection"> | null;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (proposal) dialog.current?.showModal();
    else dialog.current?.close();
  }, [proposal]);
  return (
    <dialog
      ref={dialog}
      className={s.dialog}
      aria-label="Comprar la maceta recomendada"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialog.current?.close();
      }}
    >
      <button
        className={s.close}
        type="button"
        aria-label="Cerrar compra"
        onClick={() => dialog.current?.close()}
      >
        ×
      </button>
      <span className={s.kicker}>TU PROPUESTA, UN PASO MÁS CERCA</span>
      <h2>Tu maceta elegida.</h2>
      {proposal && (
        <CommercialContact
          key={`${proposal.selection.product_id}:${proposal.selection.color}`}
          product={proposal.product}
          published
          color={proposal.selection.color}
          quantity={1}
        />
      )}
    </dialog>
  );
}
