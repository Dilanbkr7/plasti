"use client";
import { useState } from "react";
import { useResource } from "./api";
import { Loading, Notice } from "./Shared";
interface Snapshot {
  engine: string;
  schema: string;
  table: string;
  limit: number;
  tables: {
    name: string;
    count: number;
    browsable: boolean;
    columns: { column_name: string; data_type: string }[];
  }[];
  rows: Record<string, unknown>[];
}
export function DatabasePanel() {
  const [table, setTable] = useState("products");
  const { data, error, loading, refresh } = useResource<Snapshot>(
    `database?table=${encodeURIComponent(table)}`,
  );
  const metadata = data?.tables.find((t) => t.name === table);
  return (
    <section className="p-card">
      <div className="p-card-heading">
        <div>
          <h2>Tablas de la base de datos</h2>
          <p className="p-muted">
            {data?.engine} · esquema {data?.schema || "plastimad"}. Consulta de
            solo lectura.
          </p>
        </div>
        <button className="p-button p-secondary" onClick={refresh}>
          Actualizar
        </button>
      </div>
      <label>
        Tabla
        <select value={table} onChange={(e) => setTable(e.target.value)}>
          {(data?.tables || [{ name: "products", count: 0 }]).map((t) => (
            <option key={t.name} value={t.name}>
              {t.name} · {t.count} registros
            </option>
          ))}
        </select>
      </label>
      {loading && <Loading />}
      {error && <Notice error>{error}</Notice>}
      {metadata && (
        <details>
          <summary>
            Estructura de {table} · {metadata.columns.length} columnas
          </summary>
          <ul>
            {metadata.columns.map((c) => (
              <li key={c.column_name}>
                <code>{c.column_name}</code> — {c.data_type}
              </li>
            ))}
          </ul>
        </details>
      )}
      {metadata && !metadata.browsable ? (
        <p className="p-notice">
          Se muestra su estructura y cantidad de registros. Las credenciales,
          sesiones, imágenes privadas y conversaciones con IA no se exponen en
          este visor.
        </p>
      ) : (
        data && (
          <div style={{ overflowX: "auto", marginTop: 20 }}>
            <table className="p-db-table">
              <thead>
                <tr>
                  {Object.keys(data.rows[0] || {}).map((k) => (
                    <th key={k}>{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, i) => (
                  <tr key={String(row.id || i)}>
                    {Object.entries(row).map(([k, v]) => (
                      <td key={k}>
                        <pre>
                          {v === null
                            ? "—"
                            : typeof v === "object"
                              ? JSON.stringify(v, null, 2)
                              : String(v)}
                        </pre>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.rows.length && <p>No hay registros.</p>}
          </div>
        )
      )}
      <p className="p-muted">
        Hasta 50 registros por tabla. Los precios se guardan en centavos: 3500
        equivale a USD 35,00. Los pedidos y mensajes se vinculan por sus
        identificadores.
      </p>
    </section>
  );
}
