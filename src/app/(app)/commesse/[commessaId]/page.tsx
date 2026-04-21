import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { CommessaDetailTabs } from "@/app/(app)/commesse/_components/commessa-detail-tabs";
import { getTenantCommessaOverviewById, type CommessaOverviewIssue } from "@/lib/domain/commesse";
import { ACTIVE_TENANT_COOKIE } from "@/lib/tenant/constants";

export const dynamic = "force-dynamic";

type CommessaDetailPageProps = {
  params: Promise<{
    commessaId: string;
  }>;
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

const formatPercent = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return "N/D";
  }
  return `${Math.round(value * 100)}%`;
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

const issueStyle = (severity: CommessaOverviewIssue["severity"]) => {
  if (severity === "high") {
    return {
      border: "1px solid #fecaca",
      background: "#fef2f2",
      color: "#991b1b",
      badge: "#b91c1c",
    };
  }
  if (severity === "medium") {
    return {
      border: "1px solid #fde68a",
      background: "#fffbeb",
      color: "#92400e",
      badge: "#b45309",
    };
  }
  return {
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    color: "#334155",
    badge: "#475569",
  };
};

export default async function CommessaDetailPage({ params }: CommessaDetailPageProps) {
  const cookieStore = await cookies();
  const selectedTenantId = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value ?? "";
  if (!selectedTenantId) {
    redirect("/select-tenant");
  }

  const resolvedParams = await params;
  const overview = await getTenantCommessaOverviewById(selectedTenantId, resolvedParams.commessaId);

  return (
    <section style={{ display: "grid", gap: "1rem", maxWidth: "1080px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "grid", gap: "0.3rem" }}>
          <h1 style={{ margin: 0 }}>Commesse / Overview commessa</h1>
          <p style={{ margin: 0, color: "#475569" }}>
            Cabina di regia sintetica con testata, attori, progressivi, criticita e timeline eventi.
          </p>
        </div>
        <Link href="/commesse">Torna all&apos;elenco commesse</Link>
      </header>

      <CommessaDetailTabs commessaId={resolvedParams.commessaId} activeTab="overview" />

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

      {overview.commessa ? (
        <article
          style={{
            border: "1px solid #d1d5db",
            borderRadius: "0.75rem",
            background: "#fff",
            padding: "1rem",
            display: "grid",
            gap: "1rem",
          }}
        >
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "0.8rem",
              borderBottom: "1px solid #e2e8f0",
              paddingBottom: "0.9rem",
            }}
          >
            <div style={{ display: "grid", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.82rem", color: "#475569" }}>Codice</span>
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
            <div style={{ display: "grid", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.82rem", color: "#475569" }}>Ritardo</span>
              <span>{delayLabel(overview.commessa.isDelayed, overview.commessa.delayDays)}</span>
            </div>
            <div style={{ display: "grid", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.82rem", color: "#475569" }}>Multi-attore</span>
              <span>{multiActorLabel(overview.commessa.multiActor, overview.commessa.actorCount)}</span>
            </div>
            <div style={{ display: "grid", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.82rem", color: "#475569" }}>Scadenza</span>
              <span>{formatDateTime(overview.commessa.dueDate)}</span>
            </div>
            <div style={{ display: "grid", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.82rem", color: "#475569" }}>Creazione</span>
              <span>{formatDateTime(overview.commessa.createdAt)}</span>
            </div>
            <div style={{ display: "grid", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.82rem", color: "#475569" }}>Ultimo aggiornamento</span>
              <span>{formatDateTime(overview.commessa.updatedAt)}</span>
            </div>
          </section>

          <section style={{ display: "grid", gap: "0.65rem" }}>
            <strong>Attori coinvolti</strong>
            {overview.actors.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "0.6rem",
                }}
              >
                {overview.actors.map((actor) => (
                  <article
                    key={actor.id}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: "0.65rem",
                      background: "#f8fafc",
                      padding: "0.65rem",
                      display: "grid",
                      gap: "0.2rem",
                    }}
                  >
                    <span style={{ fontSize: "0.82rem", color: "#475569" }}>{actor.role}</span>
                    <strong>{actor.name ?? "N/D"}</strong>
                    <span style={{ fontSize: "0.85rem", color: "#334155" }}>
                      Codice: {actor.code ?? "N/D"}
                    </span>
                  </article>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, color: "#475569" }}>
                Nessun attore esplicitamente valorizzato nel dataset corrente.
              </p>
            )}
          </section>

          <section style={{ display: "grid", gap: "0.65rem" }}>
            <strong>Progressivi sintetici</strong>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                gap: "0.6rem",
              }}
            >
              {[
                ["Ordinato", overview.commessa.progressives.ordered],
                ["Prodotto", overview.commessa.progressives.produced],
                ["Spedito", overview.commessa.progressives.shipped],
                ["Acquistato", overview.commessa.progressives.purchased],
                ["Fatturato", overview.commessa.progressives.invoiced],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.65rem",
                    background: "#f8fafc",
                    padding: "0.6rem",
                    display: "grid",
                    gap: "0.2rem",
                  }}
                >
                  <span style={{ fontSize: "0.82rem", color: "#475569" }}>{label}</span>
                  <strong>{formatNumber(value as number | null)}</strong>
                </div>
              ))}
            </div>
          </section>

          <section style={{ display: "grid", gap: "0.65rem" }}>
            <strong>Situazione operativa sintetica</strong>
            {overview.operational ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "0.6rem",
                }}
              >
                {[
                  ["Completamento produzione", formatPercent(overview.operational.productionCompletion)],
                  ["Copertura spedizione", formatPercent(overview.operational.shippingCompletion)],
                  ["Copertura acquisti", formatPercent(overview.operational.procurementCoverage)],
                  ["Copertura fatturazione", formatPercent(overview.operational.invoicingCoverage)],
                  ["Ritardo", overview.operational.delayLabel],
                  ["Criticita aperte", `${overview.operational.openIssues}`],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: "0.65rem",
                      background: "#fff",
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
            ) : (
              <p style={{ margin: 0, color: "#475569" }}>
                Situazione operativa non disponibile nel dataset corrente.
              </p>
            )}
          </section>

          <section style={{ display: "grid", gap: "0.65rem" }}>
            <strong>Criticita aperte</strong>
            {overview.issues.length > 0 ? (
              <div style={{ display: "grid", gap: "0.55rem" }}>
                {overview.issues.map((issue) => {
                  const style = issueStyle(issue.severity);
                  return (
                    <article
                      key={issue.id}
                      style={{
                        border: style.border,
                        borderRadius: "0.65rem",
                        background: style.background,
                        color: style.color,
                        padding: "0.65rem",
                        display: "grid",
                        gap: "0.25rem",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                        <strong>{issue.title}</strong>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            background: style.badge,
                            color: "#fff",
                            padding: "0.1rem 0.35rem",
                            borderRadius: "999px",
                          }}
                        >
                          {issue.severity}
                        </span>
                      </div>
                      <p style={{ margin: 0 }}>{issue.detail}</p>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p style={{ margin: 0, color: "#475569" }}>
                Nessuna criticita aperta rilevata sulla commessa corrente.
              </p>
            )}
          </section>

          <section style={{ display: "grid", gap: "0.65rem" }}>
            <strong>Timeline sintetica eventi</strong>
            {overview.timeline.length > 0 ? (
              <ol style={{ margin: 0, paddingLeft: "1.2rem", display: "grid", gap: "0.55rem" }}>
                {overview.timeline.map((event) => (
                  <li key={event.id} style={{ display: "grid", gap: "0.2rem" }}>
                    <strong>{event.title}</strong>
                    <span style={{ fontSize: "0.85rem", color: "#334155" }}>
                      {formatDateTime(event.at)} - sorgente {event.source}
                    </span>
                    <span style={{ color: "#475569" }}>{event.detail}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p style={{ margin: 0, color: "#475569" }}>
                Nessun evento timeline disponibile nel dominio esposto.
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
              <Link href="/commesse">Torna all&apos;elenco commesse</Link>
              <Link href={`/commesse/${resolvedParams.commessaId}/documenti`}>
                Apri documenti commessa
              </Link>
              <Link href={`/commesse/${resolvedParams.commessaId}/produzione`}>
                Apri produzione commessa
              </Link>
              <Link href={`/commesse/${resolvedParams.commessaId}/approvvigionamenti`}>
                Apri approvvigionamenti commessa
              </Link>
              <Link href={`/commesse/${resolvedParams.commessaId}/conto-lavoro`}>
                Apri conto lavoro commessa
              </Link>
              {overview.commessa.productId ? (
                <Link href={`/anagrafiche/articoli-prodotto/${overview.commessa.productId}`}>
                  Articolo collegato
                </Link>
              ) : (
                <span style={{ color: "#475569" }}>Articolo collegato: N/D</span>
              )}
              <Link href="/anagrafiche/elenco-diba">Apri libreria DIBA</Link>
              <Link href="/anagrafiche/elenco-distinte-ciclo">Apri libreria cicli</Link>
              <Link href="/odp">Apri area ODP (placeholder)</Link>
              {overview.commessa.salesOrderId ? (
                <span style={{ color: "#334155" }}>
                  Ordine cliente: <strong>{overview.commessa.salesOrderId}</strong> (placeholder)
                </span>
              ) : null}
              {overview.commessa.productionOrderId ? (
                <span style={{ color: "#334155" }}>
                  ODP collegato: <strong>{overview.commessa.productionOrderId}</strong>
                </span>
              ) : null}
            </div>
          </section>

          {overview.sourceTable ? (
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#334155" }}>
              Sorgente DB: <strong>{overview.sourceTable}</strong>
            </p>
          ) : null}

          {overview.warnings.length > 0 ? (
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
              {overview.warnings.map((warning) => (
                <span key={warning} style={{ fontSize: "0.85rem", color: "#78350f" }}>
                  {warning}
                </span>
              ))}
            </section>
          ) : null}
        </article>
      ) : null}

      {!overview.error && !overview.commessa ? (
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
          <strong>Overview non disponibile</strong>
          <p style={{ margin: 0, color: "#334155" }}>
            {overview.emptyStateHint ??
              "Nessun dato disponibile per la commessa richiesta nel tenant corrente."}
          </p>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link href="/commesse">Torna all&apos;elenco commesse</Link>
            <Link href="/dashboard">Torna a dashboard</Link>
          </div>
        </section>
      ) : null}
    </section>
  );
}
