import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import OdpCockpitTreeGrid from "./cockpit-tree-grid";
import { getTenantOdpCockpit } from "@/lib/domain/odp";
import { ACTIVE_TENANT_COOKIE } from "@/lib/tenant/constants";

export const dynamic = "force-dynamic";

type OdpCockpitPageProps = {
  params: Promise<{
    odpId: string;
  }>;
};

const formatPercent = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return "N/D";
  }
  return `${Math.round(value)}%`;
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

export default async function OdpCockpitPage({ params }: OdpCockpitPageProps) {
  const cookieStore = await cookies();
  const selectedTenantId = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value ?? "";
  if (!selectedTenantId) {
    redirect("/select-tenant");
  }

  const resolvedParams = await params;
  const cockpit = await getTenantOdpCockpit(selectedTenantId, resolvedParams.odpId);
  const order = cockpit.order;

  return (
    <section style={{ display: "grid", gap: "1rem", maxWidth: "1400px" }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 25,
          border: "1px solid #d1d5db",
          borderRadius: "0.75rem",
          background: "#ffffff",
          padding: "0.85rem",
          display: "grid",
          gap: "0.6rem",
        }}
      >
        <div style={{ display: "grid", gap: "0.3rem" }}>
          <h1 style={{ margin: 0 }}>Ordini di Produzione / Cockpit ODP</h1>
          <p style={{ margin: 0, color: "#475569" }}>
            Cabina di regia unica tree-grid con drill-down ODP {"->"} fasi {"->"} materiali
            {"->"} movimenti/eventi. Le viste separate restano disponibili come fallback.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))",
            gap: "0.55rem",
          }}
        >
          {[
            ["ODP", order?.code ?? resolvedParams.odpId],
            ["Stato", order?.status ?? "N/D"],
            ["Avanzamento", formatPercent(order?.progressPct ?? null)],
            ["Ritardo", delayLabel(order?.isDelayed ?? false, order?.delayDays ?? null)],
            ["Fasi", `${cockpit.counts.phases}`],
            ["Materiali", `${cockpit.counts.materials}`],
            ["Movimenti/Eventi", `${cockpit.counts.events}`],
          ].map(([label, value]) => (
            <div
              key={label}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "0.6rem",
                background: "#f8fafc",
                padding: "0.55rem",
                display: "grid",
                gap: "0.16rem",
              }}
            >
              <span style={{ fontSize: "0.78rem", color: "#475569" }}>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap" }}>
          <Link href={cockpit.fallbackViews.phases}>Vista Fasi (fallback)</Link>
          <Link href={cockpit.fallbackViews.materials}>Vista Materiali (fallback)</Link>
          <Link href={cockpit.fallbackViews.subcontracting}>Conto lavoro (fallback)</Link>
          <Link href={cockpit.fallbackViews.traceability}>Tracciabilita (fallback)</Link>
          <Link href="/odp">Torna a elenco ODP</Link>
        </div>
      </header>

      {cockpit.error ? (
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
          {cockpit.error}
        </p>
      ) : null}

      {cockpit.emptyStateHint ? (
        <section
          style={{
            border: "1px solid #cbd5e1",
            borderRadius: "0.75rem",
            background: "#f8fafc",
            padding: "0.9rem",
            display: "grid",
            gap: "0.45rem",
          }}
        >
          <strong>Cockpit con dataset parziale</strong>
          <p style={{ margin: 0, color: "#334155" }}>{cockpit.emptyStateHint}</p>
          <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap" }}>
            <Link href={cockpit.fallbackViews.phases}>Apri vista Fasi</Link>
            <Link href={cockpit.fallbackViews.materials}>Apri vista Materiali</Link>
          </div>
        </section>
      ) : null}

      <OdpCockpitTreeGrid key={resolvedParams.odpId} cockpit={cockpit} />

      {cockpit.sourceTables.length > 0 ? (
        <p style={{ margin: 0, color: "#334155", fontSize: "0.85rem" }}>
          Sorgenti DB cockpit: <strong>{cockpit.sourceTables.join(", ")}</strong>
        </p>
      ) : null}

      {cockpit.warnings.length > 0 ? (
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
          <strong style={{ fontSize: "0.9rem" }}>Warning query cockpit</strong>
          {cockpit.warnings.map((warning) => (
            <span key={warning} style={{ fontSize: "0.85rem", color: "#78350f" }}>
              {warning}
            </span>
          ))}
        </section>
      ) : null}
    </section>
  );
}
