import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  getTenantOdpPhases,
  type OdpBinaryFilter,
  type OdpDelayFilter,
} from "@/lib/domain/odp";
import { ACTIVE_TENANT_COOKIE } from "@/lib/tenant/constants";

export const dynamic = "force-dynamic";

type OdpPhasesPageProps = {
  params: Promise<{
    odpId: string;
  }>;
  searchParams: Promise<{
    q?: string | string[];
    status?: string | string[];
    delay?: string | string[];
    blocked?: string | string[];
    external?: string | string[];
    quality?: string | string[];
  }>;
};

const normalizeParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? (value[0] ?? "") : (value ?? "");

const normalizeBinaryFilter = (value: string): OdpBinaryFilter =>
  value === "yes" || value === "no" ? value : "all";

const normalizeDelayFilter = (value: string): OdpDelayFilter =>
  value === "late" || value === "on-time" ? value : "all";

const formatPercent = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return "N/D";
  }
  return `${Math.round(value)}%`;
};

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

const delayLabel = (isDelayed: boolean, delayDays: number | null) => {
  if (!isDelayed) {
    return "No";
  }
  if (delayDays === null) {
    return "Si";
  }
  return `Si (${delayDays} gg)`;
};

const blockedLabel = (isBlocked: boolean) => (isBlocked ? "Bloccata" : "No");

const externalLabel = (value: boolean | null) => {
  if (value === null) {
    return "N/D";
  }
  return value ? "Esterna" : "Interna";
};

const qualityLabel = (value: boolean | null) => {
  if (value === null) {
    return "N/D";
  }
  return value ? "Si" : "No";
};

export default async function OdpPhasesPage({ params, searchParams }: OdpPhasesPageProps) {
  const cookieStore = await cookies();
  const selectedTenantId = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value ?? "";
  if (!selectedTenantId) {
    redirect("/select-tenant");
  }

  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const q = normalizeParam(resolvedSearchParams.q);
  const status = normalizeParam(resolvedSearchParams.status) || "all";
  const delay = normalizeDelayFilter(normalizeParam(resolvedSearchParams.delay));
  const blocked = normalizeBinaryFilter(normalizeParam(resolvedSearchParams.blocked));
  const external = normalizeBinaryFilter(normalizeParam(resolvedSearchParams.external));
  const quality = normalizeBinaryFilter(normalizeParam(resolvedSearchParams.quality));

  const phases = await getTenantOdpPhases(selectedTenantId, resolvedParams.odpId, {
    q,
    status,
    delay,
    blocked,
    external,
    quality,
  });

  const orderCode = phases.order?.code ?? resolvedParams.odpId;

  return (
    <section style={{ display: "grid", gap: "1rem", maxWidth: "1280px" }}>
      <header style={{ display: "grid", gap: "0.35rem" }}>
        <h1 style={{ margin: 0 }}>Ordini di Produzione / Fasi ODP</h1>
        <p style={{ margin: 0, color: "#475569" }}>
          Vista read-only tenant-scoped delle fasi operative dell&apos;ordine con timeline
          semplificata, stato avanzamento e criticita.
        </p>
      </header>

      {phases.error ? (
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
          {phases.error}
        </p>
      ) : null}

      <section
        style={{
          border: "1px solid #d1d5db",
          borderRadius: "0.75rem",
          background: "#fff",
          padding: "0.85rem",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "0.65rem",
        }}
      >
        <div style={{ display: "grid", gap: "0.2rem" }}>
          <span style={{ fontSize: "0.82rem", color: "#475569" }}>ODP</span>
          <strong>{orderCode}</strong>
        </div>
        <div style={{ display: "grid", gap: "0.2rem" }}>
          <span style={{ fontSize: "0.82rem", color: "#475569" }}>Descrizione</span>
          <span>{phases.order?.name ?? "N/D"}</span>
        </div>
        <div style={{ display: "grid", gap: "0.2rem" }}>
          <span style={{ fontSize: "0.82rem", color: "#475569" }}>Stato ODP</span>
          <span>{phases.order?.status ?? "N/D"}</span>
        </div>
        <div style={{ display: "grid", gap: "0.2rem" }}>
          <span style={{ fontSize: "0.82rem", color: "#475569" }}>Origine</span>
          <span>{phases.order?.origin ?? "N/D"}</span>
        </div>
      </section>

      <form
        method="get"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(220px,2fr) repeat(5,minmax(130px,1fr)) auto",
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
            placeholder="codice fase o descrizione"
            style={{ padding: "0.5rem 0.6rem" }}
          />
        </label>

        <label style={{ display: "grid", gap: "0.3rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#334155" }}>Stato</span>
          <select name="status" defaultValue={status} style={{ padding: "0.5rem 0.6rem" }}>
            <option value="all">Tutti</option>
            {phases.statuses.map((statusValue) => (
              <option key={statusValue} value={statusValue}>
                {statusValue}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: "0.3rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#334155" }}>Ritardo</span>
          <select name="delay" defaultValue={delay} style={{ padding: "0.5rem 0.6rem" }}>
            <option value="all">Tutte</option>
            <option value="late">In ritardo</option>
            <option value="on-time">In linea</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: "0.3rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#334155" }}>Blocco</span>
          <select name="blocked" defaultValue={blocked} style={{ padding: "0.5rem 0.6rem" }}>
            <option value="all">Tutte</option>
            <option value="yes">Bloccate</option>
            <option value="no">Non bloccate</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: "0.3rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#334155" }}>Tipo fase</span>
          <select name="external" defaultValue={external} style={{ padding: "0.5rem 0.6rem" }}>
            <option value="all">Tutte</option>
            <option value="yes">Esterne</option>
            <option value="no">Interne</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: "0.3rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#334155" }}>Qualita</span>
          <select name="quality" defaultValue={quality} style={{ padding: "0.5rem 0.6rem" }}>
            <option value="all">Tutte</option>
            <option value="yes">Con qualita</option>
            <option value="no">Senza qualita</option>
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
        <strong>Situazione sintetica fasi ODP</strong>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: "0.6rem",
          }}
        >
          {[
            ["Fasi visibili", `${phases.summary.total}`],
            ["Avanzamento medio", formatPercent(phases.summary.avgProgressPct)],
            ["In ritardo", `${phases.summary.delayed}`],
            ["Bloccate", `${phases.summary.blocked}`],
            ["Esterne", `${phases.summary.external}`],
            ["Con qualita", `${phases.summary.withQuality}`],
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
        <header style={{ padding: "0.85rem", borderBottom: "1px solid #e2e8f0", display: "grid", gap: "0.25rem" }}>
          <strong>Tabella fasi ODP</strong>
          <p style={{ margin: 0, color: "#475569", fontSize: "0.9rem" }}>
            Stato fase, avanzamento, ritardi/blocchi, fase esterna e qualita, con legame diretto all&apos;ODP.
          </p>
        </header>

        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1300px" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {[
                "ODP",
                "Fase",
                "Stato",
                "Avanzamento",
                "Ritardo",
                "Blocco",
                "Tipo fase",
                "Qualita",
                "Date",
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
            {phases.phases.map((phase) => (
              <tr key={`${phase.sourceTable}-${phase.id}`}>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ display: "grid", gap: "0.2rem" }}>
                    <strong>{phase.odpCode ?? orderCode}</strong>
                    <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                      Sorgente: {phase.sourceTable}
                    </span>
                  </span>
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ display: "grid", gap: "0.2rem" }}>
                    <strong>
                      {phase.phaseNo ?? "-"} - {phase.phaseCode}
                    </strong>
                    <span style={{ color: "#475569", fontSize: "0.85rem" }}>{phase.phaseName}</span>
                  </span>
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>{phase.status}</td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  {formatPercent(phase.progressPct)}
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  {delayLabel(phase.isDelayed, phase.delayDays)}
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  {blockedLabel(phase.isBlocked)}
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  {externalLabel(phase.isExternal)}
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  {qualityLabel(phase.hasQuality)}
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ display: "grid", gap: "0.2rem" }}>
                    <span>Avvio: {formatDateTime(phase.startedAt)}</span>
                    <span>Scadenza: {formatDateTime(phase.dueDate)}</span>
                    <span>Fine: {formatDateTime(phase.completedAt)}</span>
                  </span>
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ display: "grid", gap: "0.35rem" }}>
                    <Link href={`/odp/${resolvedParams.odpId}`}>Dettaglio ODP</Link>
                    <Link href={`/odp/${resolvedParams.odpId}?section=materiali`}>
                      Materiali (placeholder)
                    </Link>
                    <Link href={`/odp/${resolvedParams.odpId}?section=conto-lavoro`}>
                      Conto lavoro (placeholder)
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {phases.phases.length === 0 ? (
          <section style={{ margin: 0, padding: "1rem", display: "grid", gap: "0.4rem" }}>
            <strong>Nessuna fase ODP disponibile</strong>
            <p style={{ margin: 0, color: "#475569" }}>
              {phases.emptyStateHint ??
                "Il dominio non espone ancora fasi per l'ODP selezionato nel tenant corrente."}
            </p>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <Link href={`/odp/${resolvedParams.odpId}/fasi`}>Reset filtri</Link>
              <Link href={`/odp/${resolvedParams.odpId}`}>Torna a dettaglio ODP</Link>
              <Link href="/odp">Torna a elenco ODP</Link>
            </div>
          </section>
        ) : null}
      </section>

      <section
        style={{
          border: "1px solid #d1d5db",
          borderRadius: "0.75rem",
          background: "#fff",
          padding: "0.85rem",
          display: "grid",
          gap: "0.65rem",
        }}
      >
        <strong>Timeline fasi (semplificata)</strong>
        {phases.timeline.length > 0 ? (
          <div style={{ display: "grid", gap: "0.55rem" }}>
            {phases.timeline.map((event) => (
              <article
                key={event.id}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "0.65rem",
                  background: "#f8fafc",
                  padding: "0.6rem",
                  display: "grid",
                  gap: "0.2rem",
                }}
              >
                <strong>{event.title}</strong>
                <span style={{ color: "#334155", fontSize: "0.9rem" }}>{event.detail}</span>
                <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                  {formatDateTime(event.at)} · sorgente: {event.sourceTable}
                </span>
              </article>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, color: "#475569" }}>
            Timeline temporale non disponibile con il dataset corrente.
          </p>
        )}
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
          <Link href={`/odp/${resolvedParams.odpId}`}>Torna a dettaglio ODP</Link>
          <Link href="/odp">Torna a elenco ODP</Link>
          <Link href={`/odp/${resolvedParams.odpId}?section=materiali`}>
            Materiali ODP (placeholder)
          </Link>
          <Link href={`/odp/${resolvedParams.odpId}?section=conto-lavoro`}>
            Conto lavoro ODP (placeholder)
          </Link>
          <Link href="/mes">MES (placeholder)</Link>
        </div>
      </section>

      {phases.sourceTables.length > 0 ? (
        <p style={{ margin: 0, color: "#334155", fontSize: "0.85rem" }}>
          Sorgenti DB: <strong>{phases.sourceTables.join(", ")}</strong>
        </p>
      ) : null}

      {phases.warnings.length > 0 ? (
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
          {phases.warnings.map((warning) => (
            <span key={warning} style={{ fontSize: "0.85rem", color: "#78350f" }}>
              {warning}
            </span>
          ))}
        </section>
      ) : null}
    </section>
  );
}
