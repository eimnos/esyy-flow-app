import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  getTenantCommesseCatalog,
  type BinaryFilter,
  type DelayFilter,
} from "@/lib/domain/commesse";
import { ACTIVE_TENANT_COOKIE } from "@/lib/tenant/constants";

export const dynamic = "force-dynamic";

type CommessePageProps = {
  searchParams: Promise<{
    q?: string | string[];
    status?: string | string[];
    priority?: string | string[];
    delay?: string | string[];
    multi_actor?: string | string[];
  }>;
};

const normalizeParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? (value[0] ?? "") : (value ?? "");

const normalizeBinaryFilter = (value: string): BinaryFilter =>
  value === "yes" || value === "no" ? value : "all";

const normalizeDelayFilter = (value: string): DelayFilter =>
  value === "late" || value === "on-time" ? value : "all";

const formatNumber = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return "N/D";
  }
  return value.toLocaleString("it-IT", { maximumFractionDigits: 2 });
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

const multiActorLabel = (isMultiActor: boolean, actorCount: number | null) => {
  if (!isMultiActor) {
    return "No";
  }
  if (actorCount !== null && actorCount > 0) {
    return `Si (${actorCount})`;
  }
  return "Si";
};

export default async function CommessePage({ searchParams }: CommessePageProps) {
  const cookieStore = await cookies();
  const selectedTenantId = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value ?? "";
  if (!selectedTenantId) {
    redirect("/select-tenant");
  }

  const params = await searchParams;
  const q = normalizeParam(params.q);
  const status = normalizeParam(params.status) || "all";
  const priority = normalizeParam(params.priority) || "all";
  const delay = normalizeDelayFilter(normalizeParam(params.delay));
  const multiActor = normalizeBinaryFilter(normalizeParam(params.multi_actor));

  const catalog = await getTenantCommesseCatalog(selectedTenantId, {
    q,
    status,
    priority,
    delay,
    multiActor,
  });

  return (
    <section style={{ display: "grid", gap: "1rem" }}>
      <header style={{ display: "grid", gap: "0.45rem" }}>
        <h1 style={{ margin: 0 }}>Commesse / Elenco commesse</h1>
        <p style={{ margin: 0, color: "#4b5563" }}>
          Lista tenant-scoped in sola lettura con evidenza di stato, priorita, ritardo, natura
          multi-attore e progressivi sintetici.
        </p>
      </header>

      <form
        method="get"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(220px,2fr) repeat(4,minmax(120px,1fr)) auto",
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
          <span style={{ fontSize: "0.85rem", color: "#334155" }}>Priorita</span>
          <select name="priority" defaultValue={priority} style={{ padding: "0.5rem 0.6rem" }}>
            <option value="all">Tutte</option>
            {catalog.priorities.map((priorityValue) => (
              <option key={priorityValue} value={priorityValue}>
                {priorityValue}
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
          <span style={{ fontSize: "0.85rem", color: "#334155" }}>Multi-attore</span>
          <select
            name="multi_actor"
            defaultValue={multiActor}
            style={{ padding: "0.5rem 0.6rem" }}
          >
            <option value="all">Tutte</option>
            <option value="yes">Si</option>
            <option value="no">No</option>
          </select>
        </label>

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
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1360px" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {[
                "Codice",
                "Descrizione",
                "Stato",
                "Priorita",
                "Ritardo",
                "Multi-attore",
                "Ordinato",
                "Prodotto",
                "Spedito",
                "Acquistato",
                "Fatturato",
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
            {catalog.commesse.map((commessa) => (
              <tr key={commessa.id}>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  <Link href={`/commesse/${commessa.id}`}>
                    <strong>{commessa.code}</strong>
                  </Link>
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  {commessa.name}
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  {commessa.status}
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  {commessa.priority}
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  {delayLabel(commessa.isDelayed, commessa.delayDays)}
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  {multiActorLabel(commessa.multiActor, commessa.actorCount)}
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  {formatNumber(commessa.progressives.ordered)}
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  {formatNumber(commessa.progressives.produced)}
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  {formatNumber(commessa.progressives.shipped)}
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  {formatNumber(commessa.progressives.purchased)}
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  {formatNumber(commessa.progressives.invoiced)}
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                    <Link href={`/commesse/${commessa.id}`}>Dettaglio</Link>
                    <Link href={`/commesse/${commessa.id}/documenti`}>Documenti</Link>
                    <Link href={`/commesse/${commessa.id}/produzione`}>Produzione</Link>
                    <Link href="/odp">ODP</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {catalog.commesse.length === 0 ? (
          <section style={{ margin: 0, padding: "1rem", display: "grid", gap: "0.4rem" }}>
            <strong>Nessuna commessa disponibile</strong>
            <p style={{ margin: 0, color: "#475569" }}>
              {catalog.emptyStateHint ??
                "La sorgente dominio non espone ancora record commessa per il tenant corrente."}
            </p>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <Link href="/commesse">Reset filtri</Link>
              <Link href="/dashboard">Torna a dashboard</Link>
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
}
