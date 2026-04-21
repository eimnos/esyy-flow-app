import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { CommessaDetailTabs } from "@/app/(app)/commesse/_components/commessa-detail-tabs";
import { getTenantCommessaEconomics } from "@/lib/domain/commessa-economics";
import { getTenantCommessaOverviewById } from "@/lib/domain/commesse";
import { ACTIVE_TENANT_COOKIE } from "@/lib/tenant/constants";

export const dynamic = "force-dynamic";

type CommessaEconomicsPageProps = {
  params: Promise<{
    commessaId: string;
  }>;
  searchParams: Promise<{
    q?: string | string[];
    category?: string | string[];
  }>;
};

const normalizeParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? (value[0] ?? "") : (value ?? "");

const formatCurrency = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return "N/D";
  }
  return value.toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatPercent = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return "N/D";
  }
  return `${value.toLocaleString("it-IT", { maximumFractionDigits: 2 })}%`;
};

const deltaStyle = (value: number | null) => {
  if (value === null) {
    return { color: "#334155", label: "N/D" };
  }
  if (value > 0) {
    return { color: "#991b1b", label: "Aumento costi" };
  }
  if (value < 0) {
    return { color: "#166534", label: "Riduzione costi" };
  }
  return { color: "#334155", label: "In linea" };
};

const marginStyle = (value: number | null) => {
  if (value === null) {
    return "#334155";
  }
  return value >= 0 ? "#166534" : "#991b1b";
};

export default async function CommessaEconomicsPage({
  params,
  searchParams,
}: CommessaEconomicsPageProps) {
  const cookieStore = await cookies();
  const selectedTenantId = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value ?? "";
  if (!selectedTenantId) {
    redirect("/select-tenant");
  }

  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const q = normalizeParam(resolvedSearchParams.q);
  const category = normalizeParam(resolvedSearchParams.category) || "all";

  const overview = await getTenantCommessaOverviewById(selectedTenantId, resolvedParams.commessaId);
  if (!overview.commessa && !overview.error) {
    notFound();
  }

  const economics = await getTenantCommessaEconomics(selectedTenantId, resolvedParams.commessaId, {
    q,
    category,
  });

  const categories = [...new Set(economics.breakdown.map((entry) => entry.categoryLabel))];
  const canShowDesignCosts =
    economics.kpi.designCostsPlanned !== null ||
    economics.kpi.designCostsActual !== null ||
    economics.breakdown.some((entry) => entry.includesDesign);

  return (
    <section style={{ display: "grid", gap: "1rem", maxWidth: "1320px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "grid", gap: "0.3rem" }}>
          <h1 style={{ margin: 0 }}>Commesse / Costi e fatturato</h1>
          <p style={{ margin: 0, color: "#475569" }}>
            Cabina di regia economica read-only con previsto vs consuntivo, breakdown costi e margine.
          </p>
        </div>
        <Link href={`/commesse/${resolvedParams.commessaId}`}>Torna a overview commessa</Link>
      </header>

      <CommessaDetailTabs commessaId={resolvedParams.commessaId} activeTab="costi-fatturato" />

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

      {economics.error ? (
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
          {economics.error}
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
          gridTemplateColumns: "minmax(220px,2fr) minmax(220px,1fr) auto",
          gap: "0.55rem",
          alignItems: "end",
          border: "1px solid #d1d5db",
          borderRadius: "0.75rem",
          background: "#fff",
          padding: "0.8rem",
        }}
      >
        <label style={{ display: "grid", gap: "0.3rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#334155" }}>Ricerca categoria/origine</span>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="materiali, produzione, progettazione, origine"
            style={{ padding: "0.5rem 0.6rem" }}
          />
        </label>

        <label style={{ display: "grid", gap: "0.3rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#334155" }}>Categoria costi</span>
          <select name="category" defaultValue={category} style={{ padding: "0.5rem 0.6rem" }}>
            <option value="all">Tutte</option>
            {categories.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
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
        <strong>KPI economici sintetici</strong>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: "0.6rem",
          }}
        >
          {[
            ["Ricavi previsti", formatCurrency(economics.kpi.plannedRevenue)],
            ["Ricavi consuntivi", formatCurrency(economics.kpi.actualRevenue)],
            ["Costi previsti", formatCurrency(economics.kpi.plannedCosts)],
            ["Costi consuntivi", formatCurrency(economics.kpi.actualCosts)],
            ["Margine previsto", formatCurrency(economics.kpi.plannedMargin)],
            ["Margine consuntivo", formatCurrency(economics.kpi.actualMargin)],
            ["Margine % previsto", formatPercent(economics.kpi.plannedMarginPct)],
            ["Margine % consuntivo", formatPercent(economics.kpi.actualMarginPct)],
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
              <strong
                style={{
                  color: label.includes("Margine") ? marginStyle(
                    label.includes("consuntivo")
                      ? economics.kpi.actualMargin
                      : economics.kpi.plannedMargin,
                  ) : "#0f172a",
                }}
              >
                {value}
              </strong>
            </div>
          ))}
          {canShowDesignCosts ? (
            <>
              <div
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "0.65rem",
                  background: "#f8fafc",
                  padding: "0.65rem",
                  display: "grid",
                  gap: "0.2rem",
                }}
              >
                <span style={{ fontSize: "0.82rem", color: "#475569" }}>
                  Costi progettazione previsti
                </span>
                <strong>{formatCurrency(economics.kpi.designCostsPlanned)}</strong>
              </div>
              <div
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "0.65rem",
                  background: "#f8fafc",
                  padding: "0.65rem",
                  display: "grid",
                  gap: "0.2rem",
                }}
              >
                <span style={{ fontSize: "0.82rem", color: "#475569" }}>
                  Costi progettazione consuntivi
                </span>
                <strong>{formatCurrency(economics.kpi.designCostsActual)}</strong>
              </div>
            </>
          ) : null}
        </div>
        <div style={{ display: "grid", gap: "0.3rem", fontSize: "0.85rem", color: "#334155" }}>
          <span>
            Sorgente snapshot: <strong>{economics.snapshotSource ?? "N/D"}</strong>
          </span>
          <span>
            Origine dato:{" "}
            <strong>{economics.origins.length > 0 ? economics.origins.join(", ") : "N/D"}</strong>
          </span>
          <span>
            Segnale margine:{" "}
            <strong>
              {economics.summary.positiveMargin === null
                ? "N/D"
                : economics.summary.positiveMargin
                  ? "Positivo"
                  : "Negativo"}
            </strong>
          </span>
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
        <header
          style={{
            padding: "0.85rem",
            borderBottom: "1px solid #e2e8f0",
            display: "grid",
            gap: "0.25rem",
          }}
        >
          <strong>Breakdown costi per categoria</strong>
          <p style={{ margin: 0, color: "#475569", fontSize: "0.9rem" }}>
            Vista sintetica previsto vs consuntivo con scostamento e peso sul totale costi consuntivi.
          </p>
        </header>

        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1160px" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {[
                "Categoria",
                "Previsto",
                "Consuntivo",
                "Scostamento",
                "Peso costi",
                "Progettazione",
                "Origine dato",
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
            {economics.breakdown.map((entry) => {
              const delta = deltaStyle(entry.deltaCost);
              return (
                <tr key={entry.categoryKey}>
                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "grid", gap: "0.2rem" }}>
                      <strong>{entry.categoryLabel}</strong>
                      <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                        key: {entry.categoryKey}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    {formatCurrency(entry.plannedCost)}
                  </td>
                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    {formatCurrency(entry.actualCost)}
                  </td>
                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "grid", gap: "0.2rem", color: delta.color }}>
                      <strong>{formatCurrency(entry.deltaCost)}</strong>
                      <span style={{ fontSize: "0.8rem" }}>{delta.label}</span>
                    </div>
                  </td>
                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    {formatPercent(entry.actualSharePct)}
                  </td>
                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <span
                      style={{
                        display: "inline-block",
                        borderRadius: "999px",
                        padding: "0.15rem 0.5rem",
                        fontSize: "0.78rem",
                        background: entry.includesDesign ? "#dbeafe" : "#e2e8f0",
                        color: entry.includesDesign ? "#1d4ed8" : "#334155",
                      }}
                    >
                      {entry.includesDesign ? "Inclusa" : "No"}
                    </span>
                  </td>
                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "grid", gap: "0.2rem" }}>
                      <span>{entry.origins.length > 0 ? entry.origins.join(", ") : "N/D"}</span>
                      <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                        {entry.sourceTables.join(", ")}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {economics.breakdown.length === 0 ? (
          <section style={{ margin: 0, padding: "1rem", display: "grid", gap: "0.4rem" }}>
            <strong>Nessun dato economico disponibile</strong>
            <p style={{ margin: 0, color: "#475569" }}>
              {economics.emptyStateHint ??
                "Il dominio non espone ancora un breakdown economico per la commessa selezionata."}
            </p>
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
          <Link href={`/commesse/${resolvedParams.commessaId}/approvvigionamenti`}>
            Apri approvvigionamenti commessa
          </Link>
          <Link href={`/commesse/${resolvedParams.commessaId}/conto-lavoro`}>
            Apri conto lavoro commessa
          </Link>
          <Link href="/odp">Apri area ODP (placeholder)</Link>
        </div>
      </section>

      {economics.sourceTables.length > 0 ? (
        <p style={{ margin: 0, color: "#334155", fontSize: "0.85rem" }}>
          Sorgenti DB: <strong>{economics.sourceTables.join(", ")}</strong>
        </p>
      ) : null}

      {economics.warnings.length > 0 ? (
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
          {economics.warnings.map((warning) => (
            <span key={warning} style={{ fontSize: "0.85rem", color: "#78350f" }}>
              {warning}
            </span>
          ))}
        </section>
      ) : null}
    </section>
  );
}

