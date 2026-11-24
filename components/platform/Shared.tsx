import type { ReactNode } from "react";
export function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <p
      className={error ? "p-error" : "p-success"}
      role={error ? "alert" : "status"}
    >
      {children}
    </p>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="p-empty">
      <span>↗</span>
      <p>{children}</p>
    </div>
  );
}
export function Loading() {
  return (
    <p className="p-muted" role="status">
      Cargando información…
    </p>
  );
}
export function SectionTitle({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="p-section-title">
      <div>
        <span className="p-kicker">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
