import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { CommessaDetailTabs } from "@/app/(app)/commesse/_components/commessa-detail-tabs";
import {
  getTenantCommessaSubcontracting,
  type SubcontractingDirection,
  type SubcontractingMovementType,
} from "@/lib/domain/commessa-subcontracting";
import { getTenantCommessaOverviewById } from "@/lib/domain/commesse";
import { ACTIVE_TENANT_COOKIE } from "@/lib/tenant/constants";

export const dynamic = "force-dynamic";

type CommessaSubcontractingPageProps = {
  params: Promise<{
    commessaId: string;
  }>;
  searchParams: Promise<{
    q?: string | string[];
    direction?: string | string[];
    anomaly?: string | string[];
    status?: string | string[];
  }>;
};

const normalizeParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? (value[0] ?? "") : (value ?? "");

const formatNumber = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return "N/D";
  }
  return value.toLocaleString("it-IT", { maximumFractionDigits: 3 });
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

const directionLabel = (value: SubcontractingDirection) => {
  if (value === "passivo") {
    return "Passivo";
  }
  if (value === "attivo") {
    return "Attivo";
  }
  return "N/D";
};

const directionBadgeStyle = (value: SubcontractingDirection) => {
  if (value === "passivo") {
    return { background: "#dbeafe", color: "#1d4ed8" };
  }
  if (value === "attivo") {
    return { background: "#dcfce7", color: "#166534" };
  }
  return { background: "#e2e8f0", color: "#334155" };
};

const movementTypeLabel = (value: SubcontractingMovementType) => {
  if (value === "invio") {
    return "Invio";
  }
  if (value === "rientro") {
    return "Rientro";
  }
  if (value === "movimento") {
    return "Movimento";
  }
  return "N/D";
};

const anomalyLabel = (hasAnomaly: boolean, count: number | null) => {
  if (!hasAnomaly) {
    return "No";
  }
  if (count === null || Number.isNaN(count)) {
    return "Si";
  }
  return `Si (${Math.floor(count)})`;
};

const delayLabel = (isDelayed: boolean, delayDays: number | null) => {
  if (!isDelayed) {
    return "No";
  }
  if (delayDays === null || Number.isNaN(delayDays)) {
    return "Si";
  }
  return `Si (${delayDays} gg)`;
};

const lineLinkBlock = (
  commessaId: string,
  orderCode: string | null,
  phaseCode: string | null,
  documentCode: string | null,
) => (
  <div style={{ display: "grid", gap: "0.35rem" }}>
    <Link href={`/commesse/${commessaId}/produzione`}>Fase esterna (placeholder)</Link>
    {orderCode ? (
      <span style={{ color: "#334155" }}>ODP: {orderCode}</span>
    ) : (
      <Link href="/odp">ODP (placeholder)</Link>
    )}
    {phaseCode ? (
      <span style={{ color: "#334155" }}>Fase: {phaseCode}</span>
    ) : (
      <span style={{ color: "#475569" }}>Fase: N/D</span>
    )}
    {documentCode ? (
      <span style={{ color: "#334155" }}>Documento: {documentCode}</span>
    ) : (
      <span style={{ color: "#475569" }}>Documento: N/D</span>
    )}
  </div>
);

export default async function CommessaSubcontractingPage({
  params,
  searchParams,
}: CommessaSubcontractingPageProps) {
  const cookieStore = await cookies();
  const selectedTenantId = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value ?? "";
  if (!selectedTenantId) {
    redirect("/select-tenant");
  }

  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const q = normalizeParam(resolvedSearchParams.q);
  const direction = normalizeParam(resolvedSearchParams.direction) || "all";
  const anomaly = normalizeParam(resolvedSearchParams.anomaly) || "all";
  const status = normalizeParam(resolvedSearchParams.status) || "all";

  const overview = await getTenantCommessaOverviewById(selectedTenantId, resolvedParams.commessaId);
  if (!overview.commessa && !overview.error) {
    notFound();
  }

  const subcontracting = await getTenantCommessaSubcontracting(
    selectedTenantId,
    resolvedParams.commessaId,
    {
      q,
      direction,
      anomaly,
      status,
    },
  );

  return (
    <section style={{ display: "grid", gap: "1rem", maxWidth: "1360px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "grid", gap: "0.3rem" }}>
          <h1 style={{ margin: 0 }}>Commesse / Conto lavoro commessa</h1>
          <p style={{ margin: 0, color: "#475569" }}>
            Vista read-only fasi esterne/movimenti con quantita inviata-rientrata-residua,
            materiali presso terzista, ritardi e anomalie.
          </p>
        </div>
        <Link href={`/commesse/${resolvedParams.commessaId}`}>Torna a overview commessa</Link>
      </header>

      <CommessaDetailTabs commessaId={resolvedParams.commessaId} activeTab="conto-lavoro" />

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

      {subcontracting.error ? (
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
          {subcontracting.error}
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
          gridTemplateColumns: "minmax(220px,2fr) repeat(3,minmax(150px,1fr)) auto",
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
            placeholder="fase, materiale, documento, fornitore"
            style={{ padding: "0.5rem 0.6rem" }}
          />
        </label>

        <label style={{ display: "grid", gap: "0.3rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#334155" }}>Flusso</span>
          <select name="direction" defaultValue={direction} style={{ padding: "0.5rem 0.6rem" }}>
            <option value="all">Tutti</option>
            <option value="passivo">Passivo</option>
            <option value="attivo">Attivo</option>
            <option value="nd">N/D</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: "0.3rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#334155" }}>Anomalie</span>
          <select name="anomaly" defaultValue={anomaly} style={{ padding: "0.5rem 0.6rem" }}>
            <option value="all">Tutte</option>
            <option value="with">Con anomalie</option>
            <option value="without">Senza anomalie</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: "0.3rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#334155" }}>Stato</span>
          <select name="status" defaultValue={status} style={{ padding: "0.5rem 0.6rem" }}>
            <option value="all">Tutti</option>
            {subcontracting.statuses.map((statusValue) => (
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
        <strong>Situazione sintetica conto lavoro</strong>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: "0.6rem",
          }}
        >
          {[
            ["Fasi esterne", `${subcontracting.summary.phasesTotal}`],
            ["Movimenti", `${subcontracting.summary.movementsTotal}`],
            ["Passivo", `${subcontracting.summary.passiveItems}`],
            ["Attivo", `${subcontracting.summary.activeItems}`],
            ["Ritardi fase", `${subcontracting.summary.delayedPhases}`],
            ["Anomalie", `${subcontracting.summary.anomalousItems}`],
            ["Qt inviata", formatNumber(subcontracting.summary.qtySentTotal)],
            ["Qt rientrata", formatNumber(subcontracting.summary.qtyReturnedTotal)],
            ["Qt residua", formatNumber(subcontracting.summary.qtyResidualTotal)],
            [
              "Materiali presso terzista",
              formatNumber(subcontracting.summary.materialsAtSupplierTotal),
            ],
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
          <strong>Fasi esterne conto lavoro</strong>
          <p style={{ margin: 0, color: "#475569", fontSize: "0.9rem" }}>
            Stato operativo, quantita inviata/rientrata/residua e materiali presso terzista.
          </p>
        </header>

        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1300px" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {[
                "Fase",
                "Stato",
                "Flusso",
                "Quantita",
                "Ritardi/Anomalie",
                "Terzista",
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
            {subcontracting.phases.map((phase) => {
              const directionStyle = directionBadgeStyle(phase.direction);
              return (
                <tr key={`${phase.sourceTable}-${phase.id}`}>
                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "grid", gap: "0.2rem" }}>
                      <strong>{phase.phaseCode}</strong>
                      <span style={{ color: "#475569", fontSize: "0.85rem" }}>{phase.phaseName}</span>
                      <span style={{ color: "#334155", fontSize: "0.8rem" }}>
                        ODP: {phase.orderCode ?? "N/D"}
                      </span>
                      <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                        Sorgente: {phase.sourceTable}
                      </span>
                    </div>
                  </td>

                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    {phase.status}
                  </td>

                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <span
                      style={{
                        display: "inline-block",
                        borderRadius: "999px",
                        padding: "0.15rem 0.5rem",
                        fontSize: "0.78rem",
                        background: directionStyle.background,
                        color: directionStyle.color,
                      }}
                    >
                      {directionLabel(phase.direction)}
                    </span>
                  </td>

                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ display: "grid", gap: "0.2rem" }}>
                      <span>Inviata: {formatNumber(phase.qtySent)}</span>
                      <span>Rientrata: {formatNumber(phase.qtyReturned)}</span>
                      <span>Residua: {formatNumber(phase.qtyResidual)}</span>
                      <span>Presso terzista: {formatNumber(phase.materialsAtSupplier)}</span>
                    </span>
                  </td>

                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ display: "grid", gap: "0.2rem" }}>
                      <span>Ritardo: {delayLabel(phase.isDelayed, phase.delayDays)}</span>
                      <span>Anomalie: {anomalyLabel(phase.hasAnomaly, phase.anomalyCount)}</span>
                      <span>Scadenza: {formatDateTime(phase.dueDate)}</span>
                    </span>
                  </td>

                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ display: "grid", gap: "0.2rem" }}>
                      <span>Codice: {phase.supplierCode ?? "N/D"}</span>
                      <span>Nome: {phase.supplierName ?? "N/D"}</span>
                    </span>
                  </td>

                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    {lineLinkBlock(resolvedParams.commessaId, phase.orderCode, phase.phaseCode, null)}
                  </td>

                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "grid", gap: "0.35rem" }}>
                      <Link href={`/commesse/${resolvedParams.commessaId}/produzione`}>
                        Apri produzione
                      </Link>
                      <Link href={`/commesse/${resolvedParams.commessaId}/documenti`}>
                        Apri invii/rientri (placeholder)
                      </Link>
                      <Link href={`/commesse/${resolvedParams.commessaId}/approvvigionamenti`}>
                        Apri materiali commessa
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {subcontracting.phases.length === 0 ? (
          <section style={{ margin: 0, padding: "1rem", display: "grid", gap: "0.4rem" }}>
            <strong>Nessuna fase esterna disponibile</strong>
            <p style={{ margin: 0, color: "#475569" }}>
              Il dominio non espone ancora fasi esterne per la commessa selezionata, oppure i
              filtri correnti non restituiscono risultati.
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
          <strong>Movimenti invio/rientro</strong>
          <p style={{ margin: 0, color: "#475569", fontSize: "0.9rem" }}>
            Tracciamento sintetico delle movimentazioni con quantita e materiali presso terzista.
          </p>
        </header>

        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1300px" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {[
                "Movimento",
                "Materiale",
                "Flusso",
                "Quantita",
                "Stato/Anomalie",
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
            {subcontracting.movements.map((movement) => {
              const directionStyle = directionBadgeStyle(movement.direction);
              return (
                <tr key={`${movement.sourceTable}-${movement.id}`}>
                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "grid", gap: "0.2rem" }}>
                      <strong>{movementTypeLabel(movement.movementType)}</strong>
                      <span style={{ color: "#334155", fontSize: "0.85rem" }}>
                        Documento: {movement.documentCode ?? "N/D"}
                      </span>
                      <span style={{ color: "#334155", fontSize: "0.85rem" }}>
                        Data: {formatDateTime(movement.movementDate)}
                      </span>
                      <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                        Sorgente: {movement.sourceTable}
                      </span>
                    </div>
                  </td>

                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "grid", gap: "0.2rem" }}>
                      <strong>{movement.materialCode}</strong>
                      <span style={{ color: "#475569", fontSize: "0.85rem" }}>
                        {movement.materialName}
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
                        background: directionStyle.background,
                        color: directionStyle.color,
                      }}
                    >
                      {directionLabel(movement.direction)}
                    </span>
                  </td>

                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ display: "grid", gap: "0.2rem" }}>
                      <span>Inviata: {formatNumber(movement.qtySent)}</span>
                      <span>Rientrata: {formatNumber(movement.qtyReturned)}</span>
                      <span>Residua: {formatNumber(movement.qtyResidual)}</span>
                      <span>Presso terzista: {formatNumber(movement.materialsAtSupplier)}</span>
                    </span>
                  </td>

                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ display: "grid", gap: "0.2rem" }}>
                      <span>{movement.status}</span>
                      <span>Anomalie: {anomalyLabel(movement.hasAnomaly, movement.anomalyCount)}</span>
                      {movement.note ? (
                        <span style={{ color: "#64748b", fontSize: "0.8rem" }}>{movement.note}</span>
                      ) : null}
                    </span>
                  </td>

                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    {lineLinkBlock(
                      resolvedParams.commessaId,
                      movement.orderCode,
                      movement.phaseCode,
                      movement.documentCode,
                    )}
                  </td>

                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "grid", gap: "0.35rem" }}>
                      <Link href={`/commesse/${resolvedParams.commessaId}/documenti`}>
                        Apri invii/rientri (placeholder)
                      </Link>
                      <Link href={`/commesse/${resolvedParams.commessaId}/approvvigionamenti`}>
                        Apri materiali commessa
                      </Link>
                      <Link href="/conto-lavoro">Apri area conto lavoro (placeholder)</Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {subcontracting.movements.length === 0 ? (
          <section style={{ margin: 0, padding: "1rem", display: "grid", gap: "0.4rem" }}>
            <strong>Nessun movimento disponibile</strong>
            <p style={{ margin: 0, color: "#475569" }}>
              Il dominio non espone ancora movimenti conto lavoro per la commessa selezionata,
              oppure i filtri correnti non restituiscono risultati.
            </p>
          </section>
        ) : null}
      </section>

      {subcontracting.phases.length === 0 && subcontracting.movements.length === 0 ? (
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
          <strong>Conto lavoro non disponibile</strong>
          <p style={{ margin: 0, color: "#334155" }}>
            {subcontracting.emptyStateHint ??
              "Nessun dato conto lavoro disponibile per la commessa selezionata nel tenant corrente."}
          </p>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link href={`/commesse/${resolvedParams.commessaId}/conto-lavoro`}>Reset filtri</Link>
            <Link href={`/commesse/${resolvedParams.commessaId}`}>Torna a overview</Link>
            <Link href={`/commesse/${resolvedParams.commessaId}/produzione`}>
              Apri produzione commessa
            </Link>
            <Link href={`/commesse/${resolvedParams.commessaId}/approvvigionamenti`}>
              Apri approvvigionamenti commessa
            </Link>
            <Link href={`/commesse/${resolvedParams.commessaId}/costi-fatturato`}>
              Apri costi/fatturato commessa
            </Link>
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
          <Link href={`/commesse/${resolvedParams.commessaId}/costi-fatturato`}>
            Apri costi/fatturato commessa
          </Link>
          <Link href="/odp">Apri area ODP (placeholder)</Link>
          <Link href="/conto-lavoro">Apri area conto lavoro (placeholder)</Link>
        </div>
      </section>

      {subcontracting.sourceTables.length > 0 ? (
        <p style={{ margin: 0, color: "#334155", fontSize: "0.85rem" }}>
          Sorgenti DB: <strong>{subcontracting.sourceTables.join(", ")}</strong>
        </p>
      ) : null}

      {subcontracting.warnings.length > 0 ? (
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
          {subcontracting.warnings.map((warning) => (
            <span key={warning} style={{ fontSize: "0.85rem", color: "#78350f" }}>
              {warning}
            </span>
          ))}
        </section>
      ) : null}
    </section>
  );
}
