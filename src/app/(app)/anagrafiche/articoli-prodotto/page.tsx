import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import CoverageBadge from "@/app/(app)/anagrafiche/articoli-prodotto/_components/coverage-badge";
import {
  type CoverageFilter,
  getTenantProductCatalog,
} from "@/lib/domain/products";
import { ACTIVE_TENANT_COOKIE } from "@/lib/tenant/constants";

export const dynamic = "force-dynamic";

type ArticoliProdottoPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    status?: string | string[];
    erp?: string | string[];
    diba?: string | string[];
    cycle?: string | string[];
    model?: string | string[];
  }>;
};

const normalizeParam = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
};

const normalizeCoverageFilter = (value: string): CoverageFilter => {
  if (value === "yes" || value === "no") {
    return value;
  }
  return "all";
};

export default async function ArticoliProdottoPage({
  searchParams,
}: ArticoliProdottoPageProps) {
  const cookieStore = await cookies();
  const selectedTenantId = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value ?? "";
  if (!selectedTenantId) {
    redirect("/select-tenant");
  }

  const params = await searchParams;
  const q = normalizeParam(params.q);
  const status = normalizeParam(params.status) || "all";
  const erp = normalizeCoverageFilter(normalizeParam(params.erp));
  const diba = normalizeCoverageFilter(normalizeParam(params.diba));
  const cycle = normalizeCoverageFilter(normalizeParam(params.cycle));
  const model = normalizeCoverageFilter(normalizeParam(params.model));

  const catalog = await getTenantProductCatalog(selectedTenantId, {
    q,
    status,
    erp,
    diba,
    cycle,
    model,
  });

  return (
    <section style={{ display: "grid", gap: "1rem" }}>
      <header style={{ display: "grid", gap: "0.45rem" }}>
        <h1 style={{ margin: 0 }}>Anagrafiche / Articoli prodotto</h1>
        <p style={{ margin: 0, color: "#4b5563" }}>
          Lista tenant-scoped in sola lettura con copertura configurazione ERP, DIBA, ciclo e
          modello produttivo.
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

        {[
          { name: "erp", label: "ERP", value: erp },
          { name: "diba", label: "DIBA", value: diba },
          { name: "cycle", label: "Ciclo", value: cycle },
          { name: "model", label: "Modello", value: model },
        ].map((filter) => (
          <label key={filter.name} style={{ display: "grid", gap: "0.3rem" }}>
            <span style={{ fontSize: "0.85rem", color: "#334155" }}>{filter.label}</span>
            <select
              name={filter.name}
              defaultValue={filter.value}
              style={{ padding: "0.5rem 0.6rem" }}
            >
              <option value="all">Tutti</option>
              <option value="yes">Configurato</option>
              <option value="no">Non configurato</option>
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
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "980px" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["Codice", "Descrizione", "Stato", "Copertura", "Azioni"].map((header) => (
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
            {catalog.products.map((product) => (
              <tr key={product.id}>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  <strong>{product.code}</strong>
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  {product.name}
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  {product.status}
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                    <CoverageBadge label="ERP" enabled={product.coverage.erp} />
                    <CoverageBadge label="DIBA" enabled={product.coverage.diba} />
                    <CoverageBadge label="Ciclo" enabled={product.coverage.cycle} />
                    <CoverageBadge label="Modello" enabled={product.coverage.model} />
                  </div>
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                    <Link href={`/anagrafiche/articoli-prodotto/${product.id}`}>Dettaglio</Link>
                    <Link href={`/anagrafiche/articoli-prodotto/${product.id}/diba`}>DIBA</Link>
                    <Link href={`/anagrafiche/articoli-prodotto/${product.id}/ciclo`}>Ciclo</Link>
                    <Link href={`/anagrafiche/articoli-prodotto/${product.id}/modello`}>
                      Modello
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {catalog.products.length === 0 ? (
          <p style={{ margin: 0, padding: "0.9rem", color: "#475569" }}>
            Nessun articolo trovato con i filtri correnti.
          </p>
        ) : null}
      </div>
    </section>
  );
}
