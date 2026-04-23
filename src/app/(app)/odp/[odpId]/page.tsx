import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ACTIVE_TENANT_COOKIE } from "@/lib/tenant/constants";

export const dynamic = "force-dynamic";

type OdpDetailPlaceholderPageProps = {
  params: Promise<{
    odpId: string;
  }>;
  searchParams: Promise<{
    section?: string | string[];
  }>;
};

const normalizeParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? (value[0] ?? "") : (value ?? "");

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

export default async function OdpDetailPlaceholderPage({
  params,
  searchParams,
}: OdpDetailPlaceholderPageProps) {
  const cookieStore = await cookies();
  const selectedTenantId = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value ?? "";
  if (!selectedTenantId) {
    redirect("/select-tenant");
  }

  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const section = normalizeParam(resolvedSearchParams.section);
  const selectedSection = sectionLabel(section);

  return (
    <section style={{ display: "grid", gap: "1rem", maxWidth: "900px" }}>
      <header style={{ display: "grid", gap: "0.4rem" }}>
        <h1 style={{ margin: 0 }}>Ordini di Produzione / {selectedSection}</h1>
        <p style={{ margin: 0, color: "#475569" }}>
          Placeholder strutturato in attesa di MD-23 (Dettaglio ODP completo).
        </p>
      </header>

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
          <strong>{resolvedParams.odpId}</strong>
        </div>
        <div style={{ display: "grid", gap: "0.2rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#475569" }}>Sezione richiesta</span>
          <strong>{selectedSection}</strong>
        </div>
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
        <strong>Prossimo passo pianificato</strong>
        <p style={{ margin: 0, color: "#334155" }}>
          Il dettaglio ODP completo (testata, sezioni operative e vista estesa) verra aperto con MD-23.
          Questa pagina mantiene attivi i quick link del catalogo MD-22.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link href="/odp">Torna a elenco ODP</Link>
          <Link href="/commesse">Apri commesse</Link>
          <Link href="/mes">Apri MES (placeholder)</Link>
          <Link href="/conto-lavoro">Apri conto lavoro (placeholder)</Link>
        </div>
      </section>
    </section>
  );
}
