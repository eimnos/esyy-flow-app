import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { CommessaDetailTabs } from "@/app/(app)/commesse/_components/commessa-detail-tabs";
import {
  getTenantCommessaProcurement,
  type CommessaProcurementExecutionMode,
} from "@/lib/domain/commessa-procurement";
import { getTenantCommessaOverviewById } from "@/lib/domain/commesse";
import { ACTIVE_TENANT_COOKIE } from "@/lib/tenant/constants";

export const dynamic = "force-dynamic";

type CommessaProcurementPageProps = {
  params: Promise<{
    commessaId: string;
  }>;
  searchParams: Promise<{
    q?: string | string[];
    coverage?: string | string[];
    material?: string | string[];
    execution_mode?: string | string[];
    status?: string | string[];
  }>;
};

const normalizeParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? (value[0] ?? "") : (value ?? "");

const formatNumber = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return "N/D";
  }
  return value.toLocaleString("it-IT", { maximumFractionDigits: 2 });
};

const formatPercent = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return "N/D";
  }
  return `${Math.round(value * 100) / 100}%`;
};

const formatDate = (value: string | null) => {
  if (!value) {
    return "N/D";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("it-IT");
};

const coverageLabel = (value: "covered" | "partial" | "uncovered") => {
  if (value === "covered") {
    return "Coperto";
  }
  if (value === "partial") {
    return "Parziale";
  }
  return "Scoperto";
};

const coverageBadgeStyle = (value: "covered" | "partial" | "uncovered") => {
  if (value === "covered") {
    return { background: "#dcfce7", color: "#166534" };
  }
  if (value === "partial") {
    return { background: "#fef9c3", color: "#854d0e" };
  }
  return { background: "#fee2e2", color: "#991b1b" };
};

const criticalLabel = (value: boolean) => (value ? "Critico" : "Standard");

const executionLabel = (value: CommessaProcurementExecutionMode) => {
  if (value === "interno") {
    return "Interno";
  }
  if (value === "conto_lavoro") {
    return "Conto lavoro";
  }
  if (value === "misto") {
    return "Misto";
  }
  return "N/D";
};

const relatedLinks = (
  commessaId: string,
  documentCode: string | null,
  orderCode: string | null,
  phaseCode: string | null,
  supplierCode: string | null,
  supplierName: string | null,
) => {
  return (
    <div style={{ display: "grid", gap: "0.35rem" }}>
      <Link href={`/commesse/${commessaId}`}>Overview commessa</Link>
      <Link href={`/commesse/${commessaId}/documenti`}>Documenti commessa</Link>
      <Link href={`/commesse/${commessaId}/produzione`}>Produzione commessa</Link>
      {documentCode ? (
        <span style={{ color: "#334155" }}>Documento: {documentCode}</span>
      ) : (
        <span style={{ color: "#475569" }}>Documento: N/D</span>
      )}
      {orderCode ? <span style={{ color: "#334155" }}>ODP: {orderCode}</span> : <Link href="/odp">ODP (placeholder)</Link>}
      {phaseCode ? (
        <span style={{ color: "#334155" }}>Fase: {phaseCode}</span>
      ) : (
        <span style={{ color: "#475569" }}>Fase: N/D</span>
      )}
      {supplierCode || supplierName ? (
        <span style={{ color: "#334155" }}>
          Fornitore: {supplierCode ?? "N/D"} {supplierName ? `- ${supplierName}` : ""}
        </span>
      ) : (
        <span style={{ color: "#475569" }}>Fornitore: N/D</span>
      )}
    </div>
  );
};

export default async function CommessaProcurementPage({
  params,
  searchParams,
}: CommessaProcurementPageProps) {
  const cookieStore = await cookies();
  const selectedTenantId = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value ?? "";
  if (!selectedTenantId) {
    redirect("/select-tenant");
  }

  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const q = normalizeParam(resolvedSearchParams.q);
  const coverage = normalizeParam(resolvedSearchParams.coverage) || "all";
  const material = normalizeParam(resolvedSearchParams.material) || "all";
  const executionMode = normalizeParam(resolvedSearchParams.execution_mode) || "all";
  const status = normalizeParam(resolvedSearchParams.status) || "all";

  const overview = await getTenantCommessaOverviewById(selectedTenantId, resolvedParams.commessaId);
  if (!overview.commessa && !overview.error) {
    notFound();
  }

  const procurement = await getTenantCommessaProcurement(selectedTenantId, resolvedParams.commessaId, {
    q,
    coverage,
    material,
    executionMode,
    status,
  });

  return (
    <section style={{ display: "grid", gap: "1rem", maxWidth: "1320px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "grid", gap: "0.3rem" }}>
          <h1 style={{ margin: 0 }}>Commesse / Approvvigionamenti commessa</h1>
          <p style={{ margin: 0, color: "#475569" }}>
            Cabina di regia read-only del fabbisogno con copertura/scopertura, materiali critici e
            distinzione interno/conto lavoro.
          </p>
        </div>
        <Link href={`/commesse/${resolvedParams.commessaId}`}>Torna a overview commessa</Link>
      </header>

      <CommessaDetailTabs commessaId={resolvedParams.commessaId} activeTab="approvvigionamenti" />

      {overview.error ? (
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
          {overview.error}
        </p>
      ) : null}

      {procurement.error ? (
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
          {procurement.error}
        </p>
      ) : null}

      {overview.commessa ? (
        <section
          style={{
            border: "1px solid #d1d5db",
            borderRadius: "0.75rem",
            background: "#fff",
            padding: "0.85rem",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "0.7rem",
          }}
        >
          <div style={{ display: "grid", gap: "0.25rem" }}>
            <span style={{ fontSize: "0.82rem", color: "#475569" }}>Codice commessa</span>
            <strong>{overview.commessa.code}</strong>
          </div>
          <div style={{ display: "grid", gap: "0.25rem" }}>
            <span style={{ fontSize: "0.82rem", color: "#475569" }}>Descrizione</span>
            <span>{overview.commessa.name}</span>
          </div>
          <div style={{ display: "grid", gap: "0.25rem" }}>
            <span style={{ fontSize: "0.82rem", color: "#475569" }}>Stato</span>
            <span>{overview.commessa.status}</span>
          </div>
          <div style={{ display: "grid", gap: "0.25rem" }}>
            <span style={{ fontSize: "0.82rem", color: "#475569" }}>Priorita</span>
            <span>{overview.commessa.priority}</span>
          </div>
        </section>
      ) : null}

      <form
        method="get"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(220px,2fr) repeat(4,minmax(140px,1fr)) auto",
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
            placeholder="materiale, fornitore, documento, ODP"
            style={{ padding: "0.5rem 0.6rem" }}
          />
        </label>

        <label style={{ display: "grid", gap: "0.3rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#334155" }}>Copertura</span>
          <select name="coverage" defaultValue={coverage} style={{ padding: "0.5rem 0.6rem" }}>
            <option value="all">Tutte</option>
            <option value="covered">Coperto</option>
            <option value="partial">Parziale</option>
            <option value="uncovered">Scoperto</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: "0.3rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#334155" }}>Materiale</span>
          <select name="material" defaultValue={material} style={{ padding: "0.5rem 0.6rem" }}>
            <option value="all">Tutti</option>
            <option value="critical">Critici</option>
            <option value="standard">Standard</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: "0.3rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#334155" }}>Modalita</span>
          <select
            name="execution_mode"
            defaultValue={executionMode}
            style={{ padding: "0.5rem 0.6rem" }}
          >
            <option value="all">Tutte</option>
            <option value="interno">Interno</option>
            <option value="conto_lavoro">Conto lavoro</option>
            <option value="misto">Misto</option>
            <option value="nd">N/D</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: "0.3rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#334155" }}>Stato</span>
          <select name="status" defaultValue={status} style={{ padding: "0.5rem 0.6rem" }}>
            <option value="all">Tutti</option>
            {procurement.statuses.map((statusValue) => (
              <option key={statusValue} value={statusValue}>
                {statusValue}
              </option>
            ))}
          </select>
        </label>

        <button type="submit" style={{ padding: "0.5rem 0.75rem", cursor: "pointer" }}>
          Filtra
        </button>
      </form>

      <section
        style={{
          border: "1px solid #d1d5db",
          borderRadius: "0.75rem",
          background: "#fff",
          padding: "0.85rem",
          display: "grid",
          gap: "0.7rem",
        }}
      >
        <strong>Situazione sintetica approvvigionamenti</strong>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: "0.6rem",
          }}
        >
          {[
            ["Righe fabbisogno", `${procurement.summary.itemsTotal}`],
            ["Coperti", `${procurement.summary.coveredItems}`],
            ["Parziali", `${procurement.summary.partialItems}`],
            ["Scoperti", `${procurement.summary.uncoveredItems}`],
            ["Materiali critici", `${procurement.summary.criticalItems}`],
            ["Interno", `${procurement.summary.internalItems}`],
            ["Conto lavoro", `${procurement.summary.subcontractItems}`],
            ["Misto", `${procurement.summary.mixedItems}`],
            ["Copertura media", formatPercent(procurement.summary.avgCoveragePct)],
            ["Qt richiesta", formatNumber(procurement.summary.requiredQtyTotal)],
            ["Qt coperta", formatNumber(procurement.summary.coveredQtyTotal)],
            ["Qt scoperta", formatNumber(procurement.summary.uncoveredQtyTotal)],
          ].map(([label, value]) => (
            <div
              key={label}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "0.65rem",
                background: "#f8fafc",
                padding: "0.65rem",
                display: "grid",
                gap: "0.2rem",
              }}
            >
              <span style={{ fontSize: "0.82rem", color: "#475569" }}>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section
        style={{
          border: "1px solid #d1d5db",
          borderRadius: "0.75rem",
          background: "#fff",
          overflowX: "auto",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1320px" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {[
                "Materiale",
                "Copertura",
                "Criticita",
                "Modalita",
                "Stato",
                "Scadenza",
                "Collegamenti",
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
            {procurement.items.map((item) => {
              const coverageStyle = coverageBadgeStyle(item.coverageStatus);
              return (
                <tr key={`${item.sourceTable}-${item.id}-${item.materialCode}`}>
                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "grid", gap: "0.2rem" }}>
                      <strong>{item.materialCode}</strong>
                      <span style={{ color: "#475569", fontSize: "0.85rem" }}>{item.materialName}</span>
                      <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                        Sorgente: {item.sourceTable}
                      </span>
                    </div>
                  </td>

                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "grid", gap: "0.35rem" }}>
                      <span
                        style={{
                          display: "inline-block",
                          width: "fit-content",
                          borderRadius: "999px",
                          padding: "0.15rem 0.5rem",
                          fontSize: "0.78rem",
                          background: coverageStyle.background,
                          color: coverageStyle.color,
                        }}
                      >
                        {coverageLabel(item.coverageStatus)}
                      </span>
                      <span style={{ color: "#334155", fontSize: "0.85rem" }}>
                        Copertura: {formatPercent(item.coveragePct)}
                      </span>
                      <span style={{ color: "#334155", fontSize: "0.85rem" }}>
                        Qt richiesta: {formatNumber(item.requiredQty)}
                      </span>
                      <span style={{ color: "#334155", fontSize: "0.85rem" }}>
                        Qt coperta: {formatNumber(item.coveredQty)}
                      </span>
                      <span style={{ color: "#334155", fontSize: "0.85rem" }}>
                        Qt scoperta: {formatNumber(item.uncoveredQty)}
                      </span>
                    </div>
                  </td>

                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <span
                      style={{
                        display: "inline-block",
                        borderRadius: "999px",
                        padding: "0.15rem 0.5rem",
                        fontSize: "0.78rem",
                        background: item.isCritical ? "#fee2e2" : "#e2e8f0",
                        color: item.isCritical ? "#991b1b" : "#334155",
                      }}
                    >
                      {criticalLabel(item.isCritical)}
                    </span>
                  </td>

                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    {executionLabel(item.executionMode)}
                  </td>

                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "grid", gap: "0.2rem" }}>
                      <span>{item.status}</span>
                      {item.note ? (
                        <span style={{ color: "#64748b", fontSize: "0.8rem" }}>{item.note}</span>
                      ) : null}
                    </div>
                  </td>

                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    {formatDate(item.dueDate)}
                  </td>

                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    {relatedLinks(
                      resolvedParams.commessaId,
                      item.documentCode,
                      item.orderCode,
                      item.phaseCode,
                      item.supplierCode,
                      item.supplierName,
                    )}
                  </td>

                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "grid", gap: "0.35rem" }}>
                      <Link href={`/commesse/${resolvedParams.commessaId}/documenti`}>
                        Apri documenti
                      </Link>
                      <Link href={`/commesse/${resolvedParams.commessaId}/produzione`}>
                        Apri produzione
                      </Link>
                      <Link href={`/commesse/${resolvedParams.commessaId}/conto-lavoro`}>
                        Apri conto lavoro commessa
                      </Link>
                      <Link href="/mes">Apri MES (placeholder)</Link>
                      <Link href="/conto-lavoro">Apri area conto lavoro (modulo)</Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {procurement.items.length === 0 ? (
          <section style={{ margin: 0, padding: "1rem", display: "grid", gap: "0.4rem" }}>
            <strong>Nessun fabbisogno disponibile</strong>
            <p style={{ margin: 0, color: "#475569" }}>
              {procurement.emptyStateHint ??
                "Il dominio non espone ancora righe approvvigionamenti per la commessa selezionata."}
            </p>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <Link href={`/commesse/${resolvedParams.commessaId}/approvvigionamenti`}>
                Reset filtri
              </Link>
              <Link href={`/commesse/${resolvedParams.commessaId}`}>Torna a overview</Link>
              <Link href={`/commesse/${resolvedParams.commessaId}/documenti`}>
                Apri documenti commessa
              </Link>
              <Link href={`/commesse/${resolvedParams.commessaId}/produzione`}>
                Apri produzione commessa
              </Link>
              <Link href={`/commesse/${resolvedParams.commessaId}/costi-fatturato`}>
                Apri costi/fatturato commessa
              </Link>
              <Link href={`/commesse/${resolvedParams.commessaId}/tracciabilita`}>
                Apri tracciabilita commessa
              </Link>
            </div>
          </section>
        ) : null}
      </section>

      <section
        style={{
          borderTop: "1px solid #e2e8f0",
          paddingTop: "0.8rem",
          display: "grid",
          gap: "0.45rem",
        }}
      >
        <strong>Accessi rapidi</strong>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link href={`/commesse/${resolvedParams.commessaId}`}>Torna a overview commessa</Link>
          <Link href={`/commesse/${resolvedParams.commessaId}/documenti`}>Apri documenti commessa</Link>
          <Link href={`/commesse/${resolvedParams.commessaId}/produzione`}>Apri produzione commessa</Link>
          <Link href={`/commesse/${resolvedParams.commessaId}/conto-lavoro`}>
            Apri conto lavoro commessa
          </Link>
          <Link href={`/commesse/${resolvedParams.commessaId}/costi-fatturato`}>
            Apri costi/fatturato commessa
          </Link>
          <Link href={`/commesse/${resolvedParams.commessaId}/tracciabilita`}>
            Apri tracciabilita commessa
          </Link>
          <Link href="/odp">Apri area ODP (placeholder)</Link>
          <Link href="/mes">Apri area MES (placeholder)</Link>
          <Link href="/conto-lavoro">Apri area conto lavoro (modulo)</Link>
        </div>
      </section>

      {procurement.sourceTables.length > 0 ? (
        <p style={{ margin: 0, color: "#334155", fontSize: "0.85rem" }}>
          Sorgenti DB: <strong>{procurement.sourceTables.join(", ")}</strong>
        </p>
      ) : null}

      {procurement.warnings.length > 0 ? (
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
          {procurement.warnings.map((warning) => (
            <span key={warning} style={{ fontSize: "0.85rem", color: "#78350f" }}>
              {warning}
            </span>
          ))}
        </section>
      ) : null}
    </section>
  );
}
