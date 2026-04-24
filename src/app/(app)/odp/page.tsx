import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  getTenantOdpCatalog,
  type OdpBinaryFilter,
  type OdpDelayFilter,
} from "@/lib/domain/odp";
import { ACTIVE_TENANT_COOKIE } from "@/lib/tenant/constants";

export const dynamic = "force-dynamic";

type OdpPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    status?: string | string[];
    delay?: string | string[];
    criticality?: string | string[];
    linked_project?: string | string[];
    origin?: string | string[];
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

const formatNumber = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return "N/D";
  }
  return value.toLocaleString("it-IT", { maximumFractionDigits: 2 });
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

const criticalityLabel = (blocked: boolean, openIssues: number | null, critical: boolean) => {
  if (!critical) {
    return "No";
  }

  if (blocked && openIssues !== null && openIssues > 0) {
    return `Blocco + criticita (${Math.floor(openIssues)})`;
  }
  if (blocked) {
    return "Blocco";
  }
  if (openIssues !== null && openIssues > 0) {
    return `Criticita (${Math.floor(openIssues)})`;
  }
  return "Si";
};

export default async function OdpPage({ searchParams }: OdpPageProps) {
  const cookieStore = await cookies();
  const selectedTenantId = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value ?? "";
  if (!selectedTenantId) {
    redirect("/select-tenant");
  }

  const params = await searchParams;
  const q = normalizeParam(params.q);
  const status = normalizeParam(params.status) || "all";
  const delay = normalizeDelayFilter(normalizeParam(params.delay));
  const criticality = normalizeBinaryFilter(normalizeParam(params.criticality));
  const linkedProject = normalizeBinaryFilter(normalizeParam(params.linked_project));
  const origin = normalizeParam(params.origin) || "all";

  const catalog = await getTenantOdpCatalog(selectedTenantId, {
    q,
    status,
    delay,
    criticality,
    linkedProject,
    origin,
  });

  return (
    <section style={{ display: "grid", gap: "1rem" }}>
      <header style={{ display: "grid", gap: "0.45rem" }}>
        <h1 style={{ margin: 0 }}>Ordini di Produzione / Elenco ODP</h1>
        <p style={{ margin: 0, color: "#4b5563" }}>
          Lista tenant-scoped read-only con evidenza di avanzamento, ritardo, criticita,
          legame commessa e origine.
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
            placeholder="codice, descrizione, origine, commessa"
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
          <span style={{ fontSize: "0.85rem", color: "#334155" }}>Ritardo</span>
          <select name="delay" defaultValue={delay} style={{ padding: "0.5rem 0.6rem" }}>
            <option value="all">Tutti</option>
            <option value="late">In ritardo</option>
            <option value="on-time">In linea</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: "0.3rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#334155" }}>Criticita</span>
          <select
            name="criticality"
            defaultValue={criticality}
            style={{ padding: "0.5rem 0.6rem" }}
          >
            <option value="all">Tutte</option>
            <option value="yes">Con criticita</option>
            <option value="no">Senza criticita</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: "0.3rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#334155" }}>Legame commessa</span>
          <select
            name="linked_project"
            defaultValue={linkedProject}
            style={{ padding: "0.5rem 0.6rem" }}
          >
            <option value="all">Tutti</option>
            <option value="yes">Con commessa</option>
            <option value="no">Senza commessa</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: "0.3rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#334155" }}>Origine</span>
          <select name="origin" defaultValue={origin} style={{ padding: "0.5rem 0.6rem" }}>
            <option value="all">Tutte</option>
            {catalog.origins.map((originValue) => (
              <option key={originValue} value={originValue}>
                {originValue}
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
        <strong>Situazione sintetica elenco ODP</strong>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "0.6rem",
          }}
        >
          {[
            ["ODP visibili", `${catalog.summary.total}`],
            ["Avanzamento medio", formatPercent(catalog.summary.avgProgressPct)],
            ["In ritardo", `${catalog.summary.delayed}`],
            ["Bloccati", `${catalog.summary.blocked}`],
            ["Con criticita", `${catalog.summary.critical}`],
            ["Con legame commessa", `${catalog.summary.linkedToCommessa}`],
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

      <section
        style={{
          border: "1px solid #d1d5db",
          borderRadius: "0.75rem",
          background: "#fff",
          overflowX: "auto",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1500px" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {[
                "ODP",
                "Stato",
                "Avanzamento",
                "Ritardo",
                "Criticita",
                "Legame commessa",
                "Origine",
                "Fasi",
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
            {catalog.orders.map((order) => {
              const phaseCount = formatNumber(order.phaseCount);
              const completedPhases = formatNumber(order.completedPhases);
              const linkedCommessaHref = order.commessaId ? `/commesse/${order.commessaId}` : null;

              return (
                <tr key={`${order.sourceTable}-${order.id}`}>
                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "grid", gap: "0.2rem" }}>
                      <strong>{order.code}</strong>
                      <span style={{ color: "#475569", fontSize: "0.85rem" }}>{order.name}</span>
                      <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                        Sorgente: {order.sourceTable}
                      </span>
                    </div>
                  </td>

                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    {order.status}
                  </td>

                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    {formatPercent(order.progressPct)}
                  </td>

                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    {delayLabel(order.isDelayed, order.delayDays)}
                  </td>

                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    {criticalityLabel(order.isBlocked, order.openIssues, order.hasCriticality)}
                  </td>

                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    {linkedCommessaHref ? (
                      <span style={{ display: "grid", gap: "0.2rem" }}>
                        <Link href={linkedCommessaHref}>
                          {order.commessaCode ?? order.commessaId ?? "Apri commessa"}
                        </Link>
                        <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                          ID: {order.commessaId}
                        </span>
                      </span>
                    ) : (
                      <span style={{ color: "#475569" }}>N/D</span>
                    )}
                  </td>

                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    {order.origin}
                  </td>

                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ display: "grid", gap: "0.2rem" }}>
                      <span>
                        Completate: {completedPhases}
                      </span>
                      <span>Totali: {phaseCount}</span>
                    </span>
                  </td>

                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ display: "grid", gap: "0.2rem" }}>
                      <span>Inizio: {formatDateTime(order.startedAt)}</span>
                      <span>Scadenza: {formatDateTime(order.dueDate)}</span>
                      <span>Fine: {formatDateTime(order.completedAt)}</span>
                    </span>
                  </td>

                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "grid", gap: "0.35rem" }}>
                      <Link href={`/odp/${order.id}`}>Dettaglio ODP</Link>
                      <Link href={`/odp/${order.id}/fasi`}>Fasi ODP</Link>
                      {order.commessaId ? (
                        <Link href={`/commesse/${order.commessaId}/approvvigionamenti`}>
                          Materiali
                        </Link>
                      ) : (
                        <Link href={`/odp/${order.id}?section=materiali`}>
                          Materiali (placeholder)
                        </Link>
                      )}
                      {order.commessaId ? (
                        <Link href={`/commesse/${order.commessaId}/conto-lavoro`}>Conto lavoro</Link>
                      ) : (
                        <Link href={`/odp/${order.id}?section=conto-lavoro`}>
                          Conto lavoro (placeholder)
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {catalog.orders.length === 0 ? (
          <section style={{ margin: 0, padding: "1rem", display: "grid", gap: "0.4rem" }}>
            <strong>Nessun ODP disponibile</strong>
            <p style={{ margin: 0, color: "#475569" }}>
              {catalog.emptyStateHint ??
                "La sorgente dominio non espone ancora ODP per il tenant corrente."}
            </p>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <Link href="/odp">Reset filtri</Link>
              <Link href="/dashboard">Torna a dashboard</Link>
              <Link href="/commesse">Apri commesse</Link>
            </div>
          </section>
        ) : null}
      </section>
    </section>
  );
}

