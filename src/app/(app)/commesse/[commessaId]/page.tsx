import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { getTenantCommessaById } from "@/lib/domain/commesse";
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

export default async function CommessaDetailPage({ params }: CommessaDetailPageProps) {
  const cookieStore = await cookies();
  const selectedTenantId = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value ?? "";
  if (!selectedTenantId) {
    redirect("/select-tenant");
  }

  const resolvedParams = await params;
  const detail = await getTenantCommessaById(selectedTenantId, resolvedParams.commessaId);
  if (!detail.commessa && !detail.error) {
    notFound();
  }

  return (
    <section style={{ display: "grid", gap: "1rem", maxWidth: "1080px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Dettaglio commessa</h1>
        <Link href="/commesse">Torna all&apos;elenco commesse</Link>
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

      {detail.commessa ? (
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
              <strong>{detail.commessa.code}</strong>
            </div>
            <div style={{ display: "grid", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.82rem", color: "#475569" }}>Descrizione</span>
              <span>{detail.commessa.name}</span>
            </div>
            <div style={{ display: "grid", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.82rem", color: "#475569" }}>Stato</span>
              <span>{detail.commessa.status}</span>
            </div>
            <div style={{ display: "grid", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.82rem", color: "#475569" }}>Priorita</span>
              <span>{detail.commessa.priority}</span>
            </div>
            <div style={{ display: "grid", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.82rem", color: "#475569" }}>Ritardo</span>
              <span>{delayLabel(detail.commessa.isDelayed, detail.commessa.delayDays)}</span>
            </div>
            <div style={{ display: "grid", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.82rem", color: "#475569" }}>Multi-attore</span>
              <span>{multiActorLabel(detail.commessa.multiActor, detail.commessa.actorCount)}</span>
            </div>
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
                ["Ordinato", detail.commessa.progressives.ordered],
                ["Prodotto", detail.commessa.progressives.produced],
                ["Spedito", detail.commessa.progressives.shipped],
                ["Acquistato", detail.commessa.progressives.purchased],
                ["Fatturato", detail.commessa.progressives.invoiced],
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
              <Link href="/odp">Apri area ODP (placeholder)</Link>
            </div>
          </section>

          {detail.sourceTable ? (
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#334155" }}>
              Sorgente DB: <strong>{detail.sourceTable}</strong>
            </p>
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
        </article>
      ) : null}
    </section>
  );
}
