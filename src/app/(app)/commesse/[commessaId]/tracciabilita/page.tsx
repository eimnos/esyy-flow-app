import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { CommessaDetailTabs } from "@/app/(app)/commesse/_components/commessa-detail-tabs";
import { getTenantCommessaTraceability } from "@/lib/domain/commessa-traceability";
import { getTenantCommessaOverviewById } from "@/lib/domain/commesse";
import { ACTIVE_TENANT_COOKIE } from "@/lib/tenant/constants";

export const dynamic = "force-dynamic";

type CommessaTraceabilityPageProps = {
  params: Promise<{
    commessaId: string;
  }>;
  searchParams: Promise<{
    q?: string | string[];
    anomaly?: string | string[];
  }>;
};

const normalizeParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? (value[0] ?? "") : (value ?? "");

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "N/D";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("it-IT", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

const formatNumber = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return "N/D";
  }
  return value.toLocaleString("it-IT", { maximumFractionDigits: 3 });
};

const externalLabel = (value: boolean | null) => {
  if (value === null) {
    return "N/D";
  }
  return value ? "Esterna" : "Interna";
};

const anomalyBadgeStyle = (hasAnomaly: boolean) => {
  if (hasAnomaly) {
    return {
      background: "#fee2e2",
      color: "#991b1b",
      text: "Anomalia",
    };
  }

  return {
    background: "#dcfce7",
    color: "#166534",
    text: "OK",
  };
};

export default async function CommessaTraceabilityPage({
  params,
  searchParams,
}: CommessaTraceabilityPageProps) {
  const cookieStore = await cookies();
  const selectedTenantId = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value ?? "";
  if (!selectedTenantId) {
    redirect("/select-tenant");
  }

  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const q = normalizeParam(resolvedSearchParams.q);
  const anomaly = normalizeParam(resolvedSearchParams.anomaly) || "all";

  const overview = await getTenantCommessaOverviewById(selectedTenantId, resolvedParams.commessaId);
  if (!overview.commessa && !overview.error) {
    notFound();
  }

  const traceability = await getTenantCommessaTraceability(selectedTenantId, resolvedParams.commessaId, {
    q,
    anomaly,
  });

  return (
    <section style={{ display: "grid", gap: "1rem", maxWidth: "1360px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "grid", gap: "0.3rem" }}>
          <h1 style={{ margin: 0 }}>Commesse / Tracciabilita commessa</h1>
          <p style={{ margin: 0, color: "#475569" }}>
            Doppia vista read-only Timeline/Genealogia con evidenza lotti, semilavorati, fasi esterne
            e anomalie di tracciabilita.
          </p>
        </div>
        <Link href={`/commesse/${resolvedParams.commessaId}`}>Torna a overview commessa</Link>
      </header>

      <CommessaDetailTabs commessaId={resolvedParams.commessaId} activeTab="tracciabilita" />

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

      {traceability.error ? (
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
          {traceability.error}
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
          gridTemplateColumns: "minmax(220px,2fr) minmax(180px,1fr) auto",
          gap: "0.55rem",
          alignItems: "end",
          border: "1px solid #d1d5db",
          borderRadius: "0.75rem",
          background: "#fff",
          padding: "0.8rem",
        }}
      >
        <label style={{ display: "grid", gap: "0.3rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#334155" }}>
            Ricerca timeline/genealogia
          </span>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="lotto, semilavorato, fase, documento, anomalia"
            style={{ padding: "0.5rem 0.6rem" }}
          />
        </label>

        <label style={{ display: "grid", gap: "0.3rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#334155" }}>Anomalie</span>
          <select name="anomaly" defaultValue={anomaly} style={{ padding: "0.5rem 0.6rem" }}>
            <option value="all">Tutte</option>
            <option value="with">Con anomalia</option>
            <option value="without">Senza anomalia</option>
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
        <strong>Situazione attuale tracciabilita</strong>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: "0.6rem",
          }}
        >
          {[
            ["Eventi timeline", `${traceability.summary.timelineEventsTotal}`],
            ["Relazioni genealogia", `${traceability.summary.genealogyLinksTotal}`],
            ["Lotti coinvolti", `${traceability.summary.lotsTotal}`],
            ["Semilavorati", `${traceability.summary.semiFinishedTotal}`],
            ["Fasi esterne", `${traceability.summary.externalPhasesTotal}`],
            ["Anomalie aperte", `${traceability.summary.openAnomalies}`],
            ["Stato sintetico", traceability.summary.statusLabel],
            ["Ultimo evento", formatDateTime(traceability.summary.lastEventAt)],
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
        <header
          style={{
            padding: "0.85rem",
            borderBottom: "1px solid #e2e8f0",
            display: "grid",
            gap: "0.25rem",
          }}
        >
          <strong>Timeline tracciabilita</strong>
          <p style={{ margin: 0, color: "#475569", fontSize: "0.9rem" }}>
            Cronologia sintetica di eventi, lotti, semilavorati e fase associata.
          </p>
        </header>

        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1280px" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {[
                "Data evento",
                "Evento",
                "Lotto/Semilavorato",
                "Fase",
                "Stato/Anomalia",
                "Documento/Note",
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
            {traceability.timeline.map((item) => {
              const anomalyStyle = anomalyBadgeStyle(item.hasAnomaly);
              return (
                <tr key={`${item.sourceTable}-${item.id}`}>
                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <span>{formatDateTime(item.occurredAt)}</span>
                  </td>

                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "grid", gap: "0.2rem" }}>
                      <strong>{item.eventType}</strong>
                      <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                        Sorgente: {item.sourceTable}
                      </span>
                    </div>
                  </td>

                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ display: "grid", gap: "0.2rem" }}>
                      <span>Lotto: {item.lotCode ?? "N/D"}</span>
                      <span>Semilavorato: {item.semiFinishedCode ?? "N/D"}</span>
                    </span>
                  </td>

                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ display: "grid", gap: "0.2rem" }}>
                      <span>{item.phaseCode ?? "N/D"}</span>
                      <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                        Tipo: {externalLabel(item.isExternalPhase)}
                      </span>
                    </span>
                  </td>

                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "grid", gap: "0.25rem" }}>
                      <span>{item.status}</span>
                      <span
                        style={{
                          display: "inline-block",
                          width: "fit-content",
                          borderRadius: "999px",
                          padding: "0.15rem 0.5rem",
                          fontSize: "0.78rem",
                          background: anomalyStyle.background,
                          color: anomalyStyle.color,
                        }}
                      >
                        {item.anomalyLabel ?? anomalyStyle.text}
                      </span>
                    </div>
                  </td>

                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ display: "grid", gap: "0.2rem" }}>
                      <span>Documento: {item.sourceDocument ?? "N/D"}</span>
                      <span style={{ color: "#475569", fontSize: "0.85rem" }}>
                        {item.note ?? "Nessuna nota"}
                      </span>
                    </span>
                  </td>

                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "grid", gap: "0.35rem" }}>
                      <Link href={`/commesse/${resolvedParams.commessaId}/documenti`}>
                        Apri documenti commessa
                      </Link>
                      <Link href={`/commesse/${resolvedParams.commessaId}/produzione`}>
                        Apri fasi produzione
                      </Link>
                      <span style={{ color: "#475569" }}>Apri lotto (placeholder)</span>
                      <span style={{ color: "#475569" }}>Apri NC (placeholder)</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {traceability.timeline.length === 0 ? (
          <section style={{ margin: 0, padding: "1rem", display: "grid", gap: "0.4rem" }}>
            <strong>Timeline non disponibile</strong>
            <p style={{ margin: 0, color: "#475569" }}>
              Nessun evento timeline di tracciabilita disponibile con i filtri correnti.
            </p>
          </section>
        ) : null}
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
          <strong>Genealogia sintetica lotti/semilavorati/fasi</strong>
          <p style={{ margin: 0, color: "#475569", fontSize: "0.9rem" }}>
            Collegamenti principali tra lotti, semilavorati e fase operativa.
          </p>
        </header>

        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1280px" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {[
                "Relazione",
                "Lotto padre",
                "Lotto figlio",
                "Semilavorato",
                "Fase",
                "Quantita",
                "Stato/Anomalia",
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
            {traceability.genealogy.map((item) => {
              const anomalyStyle = anomalyBadgeStyle(item.hasAnomaly);
              return (
                <tr key={`${item.sourceTable}-${item.id}`}>
                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "grid", gap: "0.2rem" }}>
                      <strong>
                        {(item.parentLotCode ?? "N/D")} {"->"} {(item.childLotCode ?? "N/D")}
                      </strong>
                      <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                        Sorgente: {item.sourceTable}
                      </span>
                    </div>
                  </td>

                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    {item.parentLotCode ?? "N/D"}
                  </td>

                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    {item.childLotCode ?? "N/D"}
                  </td>

                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    {item.semiFinishedCode ?? "N/D"}
                  </td>

                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ display: "grid", gap: "0.2rem" }}>
                      <span>{item.phaseCode ?? "N/D"}</span>
                      <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                        Tipo: {externalLabel(item.isExternalPhase)}
                      </span>
                    </span>
                  </td>

                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <span>
                      {formatNumber(item.qty)} {item.unit ?? ""}
                    </span>
                  </td>

                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "grid", gap: "0.25rem" }}>
                      <span>{item.status}</span>
                      <span
                        style={{
                          display: "inline-block",
                          width: "fit-content",
                          borderRadius: "999px",
                          padding: "0.15rem 0.5rem",
                          fontSize: "0.78rem",
                          background: anomalyStyle.background,
                          color: anomalyStyle.color,
                        }}
                      >
                        {item.anomalyLabel ?? anomalyStyle.text}
                      </span>
                      <span style={{ color: "#475569", fontSize: "0.85rem" }}>
                        Doc: {item.sourceDocument ?? "N/D"}
                      </span>
                    </div>
                  </td>

                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "grid", gap: "0.35rem" }}>
                      <Link href={`/commesse/${resolvedParams.commessaId}/produzione`}>
                        Apri fasi produzione
                      </Link>
                      <Link href={`/commesse/${resolvedParams.commessaId}/documenti`}>
                        Apri documenti commessa
                      </Link>
                      <span style={{ color: "#475569" }}>Apri lotto (placeholder)</span>
                      <span style={{ color: "#475569" }}>Apri NC (placeholder)</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {traceability.genealogy.length === 0 ? (
          <section style={{ margin: 0, padding: "1rem", display: "grid", gap: "0.4rem" }}>
            <strong>Genealogia non disponibile</strong>
            <p style={{ margin: 0, color: "#475569" }}>
              Nessun collegamento genealogico disponibile con i filtri correnti.
            </p>
          </section>
        ) : null}
      </section>

      {traceability.timeline.length === 0 && traceability.genealogy.length === 0 ? (
        <section
          style={{
            border: "1px solid #cbd5e1",
            borderRadius: "0.75rem",
            background: "#f8fafc",
            padding: "0.95rem",
            display: "grid",
            gap: "0.45rem",
          }}
        >
          <strong>Tracciabilita non disponibile</strong>
          <p style={{ margin: 0, color: "#334155" }}>
            {traceability.emptyStateHint ??
              "Nessun dato di tracciabilita disponibile per la commessa selezionata nel tenant corrente."}
          </p>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link href={`/commesse/${resolvedParams.commessaId}/tracciabilita`}>Reset filtri</Link>
            <Link href={`/commesse/${resolvedParams.commessaId}`}>Torna a overview</Link>
            <Link href={`/commesse/${resolvedParams.commessaId}/documenti`}>Apri documenti commessa</Link>
            <Link href={`/commesse/${resolvedParams.commessaId}/produzione`}>Apri produzione commessa</Link>
          </div>
        </section>
      ) : null}

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
          <Link href={`/commesse/${resolvedParams.commessaId}/costi-fatturato`}>
            Apri costi/fatturato commessa
          </Link>
          <span style={{ color: "#475569" }}>Apri lotti (placeholder)</span>
          <span style={{ color: "#475569" }}>Apri NC (placeholder)</span>
          <Link href="/odp">Apri area ODP (placeholder)</Link>
        </div>
      </section>

      {traceability.sourceTables.length > 0 ? (
        <p style={{ margin: 0, color: "#334155", fontSize: "0.85rem" }}>
          Sorgenti DB: <strong>{traceability.sourceTables.join(", ")}</strong>
        </p>
      ) : null}

      {traceability.warnings.length > 0 ? (
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
          {traceability.warnings.map((warning) => (
            <span key={warning} style={{ fontSize: "0.85rem", color: "#78350f" }}>
              {warning}
            </span>
          ))}
        </section>
      ) : null}
    </section>
  );
}
