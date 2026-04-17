import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  getTenantCycleCatalog,
  type BinaryFilter,
  type CycleProcessTypeFilter,
  type CycleVersionFilter,
} from "@/lib/domain/cycles";
import { ACTIVE_TENANT_COOKIE } from "@/lib/tenant/constants";

export const dynamic = "force-dynamic";

type ElencoDistinteCicloPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    status?: string | string[];
    version?: string | string[];
    process_type?: string | string[];
    quality?: string | string[];
    model_link?: string | string[];
  }>;
};

const normalizeParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? (value[0] ?? "") : (value ?? "");

const normalizeBinaryFilter = (value: string): BinaryFilter =>
  value === "yes" || value === "no" ? value : "all";

const normalizeVersionFilter = (value: string): CycleVersionFilter =>
  value === "versioned" || value === "no-version" ? value : "all";

const normalizeProcessTypeFilter = (value: string): CycleProcessTypeFilter =>
  value === "interno" || value === "misto" || value === "esterno" || value === "n/d"
    ? value
    : "all";

const qualityLabel = (value: boolean | null) => {
  if (value === true) {
    return "Si";
  }
  if (value === false) {
    return "No";
  }
  return "N/D";
};

const processTypeLabel = (value: string) => {
  if (value === "interno") {
    return "Interno";
  }
  if (value === "misto") {
    return "Misto";
  }
  if (value === "esterno") {
    return "Esterno";
  }
  return "N/D";
};

export default async function ElencoDistinteCicloPage({
  searchParams,
}: ElencoDistinteCicloPageProps) {
  const cookieStore = await cookies();
  const selectedTenantId = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value ?? "";
  if (!selectedTenantId) {
    redirect("/select-tenant");
  }

  const params = await searchParams;
  const q = normalizeParam(params.q);
  const status = normalizeParam(params.status) || "all";
  const version = normalizeVersionFilter(normalizeParam(params.version));
  const processType = normalizeProcessTypeFilter(normalizeParam(params.process_type));
  const quality = normalizeBinaryFilter(normalizeParam(params.quality));
  const modelLink = normalizeBinaryFilter(normalizeParam(params.model_link));

  const catalog = await getTenantCycleCatalog(selectedTenantId, {
    q,
    status,
    version,
    processType,
    quality,
    modelLink,
  });

  return (
    <section style={{ display: "grid", gap: "1rem" }}>
      <header style={{ display: "grid", gap: "0.45rem" }}>
        <h1 style={{ margin: 0 }}>Anagrafiche / Elenco distinte ciclo</h1>
        <p style={{ margin: 0, color: "#4b5563" }}>
          Libreria cicli tenant-scoped in sola lettura con versione, stato, numero fasi, tipo
          processo, presenza qualita e accesso rapido al modello produttivo.
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

        <label style={{ display: "grid", gap: "0.3rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#334155" }}>Tipo processo</span>
          <select
            name="process_type"
            defaultValue={processType}
            style={{ padding: "0.5rem 0.6rem" }}
          >
            <option value="all">Tutti</option>
            <option value="interno">Interno</option>
            <option value="misto">Misto</option>
            <option value="esterno">Esterno</option>
            <option value="n/d">N/D</option>
          </select>
        </label>

        {[
          { name: "quality", label: "Qualita", value: quality },
          { name: "model_link", label: "Modello", value: modelLink },
        ].map((filter) => (
          <label key={filter.name} style={{ display: "grid", gap: "0.3rem" }}>
            <span style={{ fontSize: "0.85rem", color: "#334155" }}>{filter.label}</span>
            <select
              name={filter.name}
              defaultValue={filter.value}
              style={{ padding: "0.5rem 0.6rem" }}
            >
              <option value="all">Tutti</option>
              <option value="yes">Si</option>
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
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1080px" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {[
                "Codice",
                "Descrizione",
                "Stato",
                "Versione",
                "N. fasi",
                "Tipo processo",
                "Qualita",
                "Modello produttivo",
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
            {catalog.cycles.map((cycle) => (
              <tr key={cycle.id}>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  <strong>{cycle.code}</strong>
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  {cycle.name}
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  {cycle.status}
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  {cycle.versionLabel}
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  {cycle.phaseCount ?? "N/D"}
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  {processTypeLabel(cycle.processType)}
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  {qualityLabel(cycle.hasQuality)}
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  {cycle.productionModelId ? (
                    <Link href={`/anagrafiche/elenco-distinte-ciclo/${cycle.id}/modello`}>
                      {cycle.productionModelCode
                        ? cycle.productionModelName
                          ? `${cycle.productionModelCode} - ${cycle.productionModelName}`
                          : cycle.productionModelCode
                        : cycle.productionModelId}
                    </Link>
                  ) : (
                    <span>N/D</span>
                  )}
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  <Link href={`/anagrafiche/elenco-distinte-ciclo/${cycle.id}/modello`}>
                    Modello
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {catalog.cycles.length === 0 ? (
          <p style={{ margin: 0, padding: "0.9rem", color: "#475569" }}>
            Nessuna distinta ciclo trovata con i filtri correnti.
          </p>
        ) : null}
      </div>
    </section>
  );
}

