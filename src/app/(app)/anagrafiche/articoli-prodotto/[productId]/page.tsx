import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import CoverageBadge from "@/app/(app)/anagrafiche/articoli-prodotto/_components/coverage-badge";
import { getTenantProductById } from "@/lib/domain/products";
import { ACTIVE_TENANT_COOKIE } from "@/lib/tenant/constants";

export const dynamic = "force-dynamic";

type ProductDetailPageProps = {
  params: Promise<{
    productId: string;
  }>;
};

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const cookieStore = await cookies();
  const selectedTenantId = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value ?? "";
  if (!selectedTenantId) {
    redirect("/select-tenant");
  }

  const resolvedParams = await params;
  const productId = resolvedParams.productId;

  const detail = await getTenantProductById(selectedTenantId, productId);
  if (!detail.product && !detail.error) {
    notFound();
  }

  return (
    <section style={{ display: "grid", gap: "1rem", maxWidth: "960px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Dettaglio articolo prodotto</h1>
        <Link href="/anagrafiche/articoli-prodotto">Torna alla lista</Link>
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

      {detail.product ? (
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
          <section style={{ display: "grid", gap: "0.65rem" }}>
            <div style={{ display: "grid", gap: "0.2rem" }}>
              <span style={{ fontSize: "0.8rem", color: "#475569" }}>Codice</span>
              <strong>{detail.product.code}</strong>
            </div>
            <div style={{ display: "grid", gap: "0.2rem" }}>
              <span style={{ fontSize: "0.8rem", color: "#475569" }}>Descrizione</span>
              <span>{detail.product.name}</span>
            </div>
            <div style={{ display: "grid", gap: "0.2rem" }}>
              <span style={{ fontSize: "0.8rem", color: "#475569" }}>Stato</span>
              <span>{detail.product.status}</span>
            </div>
            <div style={{ display: "grid", gap: "0.35rem" }}>
              <span style={{ fontSize: "0.8rem", color: "#475569" }}>Copertura configurazione</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                <CoverageBadge label="ERP" enabled={detail.product.coverage.erp} />
                <CoverageBadge label="DIBA" enabled={detail.product.coverage.diba} />
                <CoverageBadge label="Ciclo" enabled={detail.product.coverage.cycle} />
                <CoverageBadge label="Modello" enabled={detail.product.coverage.model} />
              </div>
            </div>
          </section>

          <section
            style={{
              borderTop: "1px solid #e2e8f0",
              paddingTop: "0.85rem",
              display: "grid",
              gap: "0.45rem",
            }}
          >
            <strong>Azioni rapide</strong>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <Link href={`/anagrafiche/articoli-prodotto/${detail.product.id}/diba`}>
                Apri DIBA
              </Link>
              <Link href={`/anagrafiche/articoli-prodotto/${detail.product.id}/ciclo`}>
                Apri ciclo
              </Link>
              <Link href={`/anagrafiche/articoli-prodotto/${detail.product.id}/modello`}>
                Apri modello
              </Link>
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
