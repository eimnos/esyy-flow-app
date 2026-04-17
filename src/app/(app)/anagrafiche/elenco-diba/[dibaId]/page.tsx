import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { getTenantDibaById } from "@/lib/domain/diba";
import { ACTIVE_TENANT_COOKIE } from "@/lib/tenant/constants";

export const dynamic = "force-dynamic";

type DibaDetailPageProps = {
  params: Promise<{
    dibaId: string;
  }>;
};

export default async function DibaDetailPage({ params }: DibaDetailPageProps) {
  const cookieStore = await cookies();
  const selectedTenantId = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value ?? "";
  if (!selectedTenantId) {
    redirect("/select-tenant");
  }

  const resolvedParams = await params;
  const detail = await getTenantDibaById(selectedTenantId, resolvedParams.dibaId);

  if (!detail.diba && !detail.error) {
    notFound();
  }

  return (
    <section style={{ display: "grid", gap: "1rem", maxWidth: "980px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Dettaglio DIBA</h1>
        <Link href="/anagrafiche/elenco-diba">Torna all&apos;elenco DIBA</Link>
      </div>

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

      {detail.diba ? (
        <article
          style={{
            border: "1px solid #d1d5db",
            borderRadius: "0.75rem",
            background: "#fff",
            padding: "1rem",
            display: "grid",
            gap: "0.85rem",
          }}
        >
          <div style={{ display: "grid", gap: "0.25rem" }}>
            <span style={{ fontSize: "0.82rem", color: "#475569" }}>Codice</span>
            <strong>{detail.diba.code}</strong>
          </div>
          <div style={{ display: "grid", gap: "0.25rem" }}>
            <span style={{ fontSize: "0.82rem", color: "#475569" }}>Descrizione</span>
            <span>{detail.diba.name}</span>
          </div>
          <div style={{ display: "grid", gap: "0.25rem" }}>
            <span style={{ fontSize: "0.82rem", color: "#475569" }}>Stato</span>
            <span>{detail.diba.status}</span>
          </div>
          <div style={{ display: "grid", gap: "0.25rem" }}>
            <span style={{ fontSize: "0.82rem", color: "#475569" }}>Versione</span>
            <span>{detail.diba.versionLabel}</span>
          </div>
          <div style={{ display: "grid", gap: "0.25rem" }}>
            <span style={{ fontSize: "0.82rem", color: "#475569" }}>
              Evidenza alternative/opzionali
            </span>
            <span>{detail.diba.alternativesEvidence}</span>
          </div>
          <div style={{ display: "grid", gap: "0.25rem" }}>
            <span style={{ fontSize: "0.82rem", color: "#475569" }}>Articolo collegato</span>
            {detail.diba.productId ? (
              <Link href={`/anagrafiche/articoli-prodotto/${detail.diba.productId}`}>
                {detail.diba.usageEvidence}
              </Link>
            ) : (
              <span>{detail.diba.usageEvidence}</span>
            )}
          </div>
          <div style={{ display: "grid", gap: "0.25rem" }}>
            <span style={{ fontSize: "0.82rem", color: "#475569" }}>Modello produttivo</span>
            {detail.diba.productionModelId ? (
              <Link href={`/anagrafiche/elenco-diba/${detail.diba.id}/modello`}>
                {detail.diba.productionModelCode
                  ? detail.diba.productionModelName
                    ? `${detail.diba.productionModelCode} · ${detail.diba.productionModelName}`
                    : detail.diba.productionModelCode
                  : detail.diba.productionModelId}
              </Link>
            ) : (
              <span>N/D</span>
            )}
          </div>

          {detail.sourceTable ? (
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#334155" }}>
              Sorgente DB: <strong>{detail.sourceTable}</strong>
            </p>
          ) : null}
        </article>
      ) : null}
    </section>
  );
}
