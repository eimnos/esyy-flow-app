import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  type BinaryFilter,
  getTenantDibaCatalog,
  type VersionFilter,
} from "@/lib/domain/diba";
import { ACTIVE_TENANT_COOKIE } from "@/lib/tenant/constants";

export const dynamic = "force-dynamic";

type ElencoDibaPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    status?: string | string[];
    version?: string | string[];
    product_link?: string | string[];
    model_link?: string | string[];
    alternatives?: string | string[];
  }>;
};

const normalizeParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? (value[0] ?? "") : (value ?? "");

const normalizeBinaryFilter = (value: string): BinaryFilter =>
  value === "yes" || value === "no" ? value : "all";

const normalizeVersionFilter = (value: string): VersionFilter =>
  value === "versioned" || value === "no-version" ? value : "all";

export default async function ElencoDibaPage({ searchParams }: ElencoDibaPageProps) {
  const cookieStore = await cookies();
  const selectedTenantId = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value ?? "";
  if (!selectedTenantId) {
    redirect("/select-tenant");
  }

  const params = await searchParams;
  const q = normalizeParam(params.q);
  const status = normalizeParam(params.status) || "all";
  const version = normalizeVersionFilter(normalizeParam(params.version));
  const productLink = normalizeBinaryFilter(normalizeParam(params.product_link));
  const modelLink = normalizeBinaryFilter(normalizeParam(params.model_link));
  const alternatives = normalizeBinaryFilter(normalizeParam(params.alternatives));

  const catalog = await getTenantDibaCatalog(selectedTenantId, {
    q,
    status,
    version,
    productLink,
    modelLink,
    alternatives,
  });

  return (
    <section style={{ display: "grid", gap: "1rem" }}>
      <header style={{ display: "grid", gap: "0.45rem" }}>
        <h1 style={{ margin: 0 }}>Anagrafiche / Elenco DIBA</h1>
        <p style={{ margin: 0, color: "#4b5563" }}>
          Libreria DIBA tenant-scoped in sola lettura con versione, stato, collegamento rapido al
          modello produttivo ed evidenza di utilizzo articolo dove disponibile.
        </p>
      </header>

      <form
        method="get"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(220px,2fr) repeat(5,minmax(120px,1fr)) auto",
          gap: "0.55rem",
          alignItems: "end",
          border: "1px solid #d1d5db",
          borderRadius: "0.75rem",
          background: "#fff",
          padding: "0.8rem",
        }}
      >
        <label style={{ display: "grid", gap: "0.3rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#334155" }}>Ricerca</span>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="codice o descrizione"
            style={{ padding: "0.5rem 0.6rem" }}
          />
        </label>

        <label style={{ display: "grid", gap: "0.3rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#334155" }}>Stato</span>
          <select name="status" defaultValue={status} style={{ padding: "0.5rem 0.6rem" }}>
            <option value="all">Tutti</option>
            {catalog.statuses.map((statusValue) => (
              <option key={statusValue} value={statusValue}>
                {statusValue}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: "0.3rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#334155" }}>Versione</span>
          <select name="version" defaultValue={version} style={{ padding: "0.5rem 0.6rem" }}>
            <option value="all">Tutte</option>
            <option value="versioned">Con versione</option>
            <option value="no-version">Senza versione</option>
          </select>
        </label>

        {[
          { name: "product_link", label: "Articolo", value: productLink },
          { name: "model_link", label: "Modello", value: modelLink },
          { name: "alternatives", label: "Alternative", value: alternatives },
        ].map((filter) => (
          <label key={filter.name} style={{ display: "grid", gap: "0.3rem" }}>
            <span style={{ fontSize: "0.85rem", color: "#334155" }}>{filter.label}</span>
            <select
              name={filter.name}
              defaultValue={filter.value}
              style={{ padding: "0.5rem 0.6rem" }}
            >
              <option value="all">Tutti</option>
              <option value="yes">Sì</option>
              <option value="no">No</option>
            </select>
          </label>
        ))}

        <button type="submit" style={{ padding: "0.5rem 0.75rem", cursor: "pointer" }}>
          Filtra
        </button>
      </form>

      {catalog.sourceTable ? (
        <p style={{ margin: 0, color: "#334155", fontSize: "0.85rem" }}>
          Sorgente DB: <strong>{catalog.sourceTable}</strong>
        </p>
      ) : null}

      {catalog.error ? (
        <p
          role="alert"
          style={{
            margin: 0,
            border: "1px solid #fecaca",
            borderRadius: "0.65rem",
            background: "#fef2f2",
            color: "#991b1b",
            padding: "0.8rem",
          }}
        >
          {catalog.error}
        </p>
      ) : null}

      {catalog.warnings.length > 0 ? (
        <section
          style={{
            border: "1px solid #fde68a",
            borderRadius: "0.65rem",
            background: "#fffbeb",
            padding: "0.75rem",
            display: "grid",
            gap: "0.35rem",
          }}
        >
          <strong style={{ fontSize: "0.9rem" }}>Warning query</strong>
          {catalog.warnings.map((warning) => (
            <span key={warning} style={{ fontSize: "0.85rem", color: "#78350f" }}>
              {warning}
            </span>
          ))}
        </section>
      ) : null}

      <div
        style={{
          border: "1px solid #d1d5db",
          borderRadius: "0.75rem",
          background: "#fff",
          overflowX: "auto",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1100px" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {[
                "Codice",
                "Descrizione",
                "Stato",
                "Versione",
                "Articolo",
                "Modello produttivo",
                "Alternative / opzionali",
                "Azioni",
              ].map((header) => (
                <th
                  key={header}
                  style={{
                    textAlign: "left",
                    fontSize: "0.82rem",
                    letterSpacing: "0.02em",
                    color: "#334155",
                    padding: "0.65rem",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {catalog.dibas.map((diba) => (
              <tr key={diba.id}>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  <strong>{diba.code}</strong>
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  {diba.name}
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  {diba.status}
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  {diba.versionLabel}
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  {diba.productId ? (
                    <Link href={`/anagrafiche/articoli-prodotto/${diba.productId}`}>
                      {diba.usageEvidence}
                    </Link>
                  ) : (
                    <span>{diba.usageEvidence}</span>
                  )}
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  {diba.productionModelId ? (
                    <Link href={`/anagrafiche/elenco-diba/${diba.id}/modello`}>
                      {diba.productionModelCode
                        ? diba.productionModelName
                          ? `${diba.productionModelCode} · ${diba.productionModelName}`
                          : diba.productionModelCode
                        : diba.productionModelId}
                    </Link>
                  ) : (
                    <span>N/D</span>
                  )}
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  {diba.alternativesEvidence}
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                    <Link href={`/anagrafiche/elenco-diba/${diba.id}`}>Dettaglio</Link>
                    <Link href={`/anagrafiche/elenco-diba/${diba.id}/modello`}>Modello</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {catalog.dibas.length === 0 ? (
          <p style={{ margin: 0, padding: "0.9rem", color: "#475569" }}>
            Nessuna DIBA trovata con i filtri correnti.
          </p>
        ) : null}
      </div>
    </section>
  );
}
