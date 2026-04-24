import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getTenantOdpById } from "@/lib/domain/odp";
import { ACTIVE_TENANT_COOKIE } from "@/lib/tenant/constants";

export const dynamic = "force-dynamic";

type OdpDetailPageProps = {
  params: Promise<{
    odpId: string;
  }>;
  searchParams: Promise<{
    section?: string | string[];
  }>;
};

const normalizeParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? (value[0] ?? "") : (value ?? "");

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

const sectionLabel = (section: string) => {
  if (section === "fasi") {
    return "Fasi ODP";
  }
  if (section === "materiali") {
    return "Materiali ODP";
  }
  if (section === "conto-lavoro") {
    return "Conto lavoro ODP";
  }
  return "Dettaglio ODP";
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

const criticalityLabel = (isBlocked: boolean, openIssues: number | null, hasCriticality: boolean) => {
  if (!hasCriticality) {
    return "No";
  }
  if (isBlocked && openIssues !== null && openIssues > 0) {
    return `Blocco + criticita (${Math.floor(openIssues)})`;
  }
  if (isBlocked) {
    return "Blocco";
  }
  if (openIssues !== null && openIssues > 0) {
    return `Criticita (${Math.floor(openIssues)})`;
  }
  return "Si";
};

export default async function OdpDetailPage({
  params,
  searchParams,
}: OdpDetailPageProps) {
  const cookieStore = await cookies();
  const selectedTenantId = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value ?? "";
  if (!selectedTenantId) {
    redirect("/select-tenant");
  }

  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const section = normalizeParam(resolvedSearchParams.section);
  const selectedSection = sectionLabel(section);
  const detail = await getTenantOdpById(selectedTenantId, resolvedParams.odpId);
  const order = detail.order;
  const commessaLink = order?.commessaId ? `/commesse/${order.commessaId}` : null;
  const fasiLink = `/odp/${resolvedParams.odpId}/fasi`;
  const materialiLink = `/odp/${resolvedParams.odpId}/materiali`;
  const contoLavoroLink = order?.commessaId
    ? `/commesse/${order.commessaId}/conto-lavoro`
    : `/odp/${resolvedParams.odpId}?section=conto-lavoro`;

  return (
    <section style={{ display: "grid", gap: "1rem", maxWidth: "1200px" }}>
      <header style={{ display: "grid", gap: "0.4rem" }}>
        <h1 style={{ margin: 0 }}>Ordini di Produzione / {selectedSection}</h1>
        <p style={{ margin: 0, color: "#475569" }}>
          Cabina di regia operativa read-only dell&apos;ODP selezionato con stato,
          avanzamento, criticita e legami applicativi.
        </p>
      </header>

      {detail.error ? (
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
          {detail.error}
        </p>
      ) : null}

      <section
        style={{
          border: "1px solid #d1d5db",
          borderRadius: "0.75rem",
          background: "#fff",
          padding: "0.9rem",
          display: "grid",
          gap: "0.45rem",
        }}
      >
        <div style={{ display: "grid", gap: "0.2rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#475569" }}>ODP selezionato</span>
          <strong>{order?.code ?? resolvedParams.odpId}</strong>
        </div>
        <div style={{ display: "grid", gap: "0.2rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#475569" }}>Descrizione</span>
          <strong>{order?.name ?? "N/D"}</strong>
        </div>
        <div style={{ display: "grid", gap: "0.2rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#475569" }}>Stato</span>
          <strong>{order?.status ?? "N/D"}</strong>
        </div>
        <div style={{ display: "grid", gap: "0.2rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#475569" }}>Origine</span>
          <strong>{order?.origin ?? "N/D"}</strong>
        </div>
        <div style={{ display: "grid", gap: "0.2rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#475569" }}>Sorgente DB</span>
          <strong>{detail.sourceTable ?? "N/D"}</strong>
        </div>
      </section>

      <section
        style={{
          border: "1px solid #d1d5db",
          borderRadius: "0.75rem",
          background: "#fff",
          padding: "0.9rem",
          display: "grid",
          gap: "0.65rem",
        }}
      >
        <strong>Situazione operativa sintetica</strong>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: "0.55rem",
          }}
        >
          {[
            ["Avanzamento", formatPercent(order?.progressPct ?? null)],
            ["Ritardo", delayLabel(order?.isDelayed ?? false, order?.delayDays ?? null)],
            [
              "Criticita",
              criticalityLabel(
                order?.isBlocked ?? false,
                order?.openIssues ?? null,
                order?.hasCriticality ?? false,
              ),
            ],
            ["Fasi totali", formatNumber(order?.phaseCount ?? null)],
            ["Fasi completate", formatNumber(order?.completedPhases ?? null)],
            ["Qt pianificata", formatNumber(order?.qtyPlanned ?? null)],
            ["Qt prodotta", formatNumber(order?.qtyProduced ?? null)],
            ["Qt scarto", formatNumber(order?.qtyScrapped ?? null)],
            ["Qt residua", formatNumber(order?.qtyResidual ?? null)],
            ["Inizio", formatDateTime(order?.startedAt ?? null)],
            ["Scadenza", formatDateTime(order?.dueDate ?? null)],
            ["Fine", formatDateTime(order?.completedAt ?? null)],
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
          padding: "0.9rem",
          display: "grid",
          gap: "0.45rem",
        }}
      >
        <strong>Legame con commessa</strong>
        {commessaLink ? (
          <div style={{ display: "grid", gap: "0.25rem" }}>
            <span style={{ color: "#334155" }}>
              Commessa collegata: <strong>{order?.commessaCode ?? order?.commessaId}</strong>
            </span>
            <Link href={commessaLink}>Apri overview commessa</Link>
          </div>
        ) : (
          <p style={{ margin: 0, color: "#475569" }}>
            Nessun legame commessa esplicitamente disponibile nel dataset corrente.
          </p>
        )}
      </section>

      <section
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: "0.75rem",
          background: "#f8fafc",
          padding: "0.9rem",
          display: "grid",
          gap: "0.45rem",
        }}
      >
        <strong>Accessi rapidi</strong>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link href={fasiLink}>Fasi ODP</Link>
          <Link href={materialiLink}>Materiali ODP</Link>
          <Link href={contoLavoroLink}>Conto lavoro ODP</Link>
          <Link href="/mes">MES (placeholder)</Link>
          <Link href="/odp">Torna a elenco ODP</Link>
          {commessaLink ? <Link href={commessaLink}>Apri commessa</Link> : null}
        </div>
      </section>

      {!order ? (
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
          <strong>Dettaglio ODP non disponibile</strong>
          <p style={{ margin: 0, color: "#334155" }}>
            {detail.emptyStateHint ??
              "L'ODP richiesto non e disponibile per il tenant corrente o non espone ancora dati completi."}
          </p>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link href="/odp">Torna a elenco ODP</Link>
            <Link href="/commesse">Apri commesse</Link>
            <Link href="/dashboard">Torna a dashboard</Link>
          </div>
        </section>
      ) : null}

      {detail.warnings.length > 0 ? (
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
          {detail.warnings.map((warning) => (
            <span key={warning} style={{ fontSize: "0.85rem", color: "#78350f" }}>
              {warning}
            </span>
          ))}
        </section>
      ) : null}
    </section>
  );
}
