import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { CommessaDetailTabs } from "@/app/(app)/commesse/_components/commessa-detail-tabs";
import { getTenantCommessaDocuments } from "@/lib/domain/commessa-documents";
import { getTenantCommessaOverviewById } from "@/lib/domain/commesse";
import { ACTIVE_TENANT_COOKIE } from "@/lib/tenant/constants";

export const dynamic = "force-dynamic";

type CommessaDocumentsPageProps = {
  params: Promise<{
    commessaId: string;
  }>;
  searchParams: Promise<{
    q?: string | string[];
    document_type?: string | string[];
    status?: string | string[];
    origin?: string | string[];
  }>;
};

const normalizeParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? (value[0] ?? "") : (value ?? "");

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

const resolveDocumentKind = (isStructured: boolean, hasAttachment: boolean) => {
  if (isStructured && hasAttachment) {
    return "Strutturato + allegato";
  }
  if (isStructured) {
    return "Documento strutturato";
  }
  if (hasAttachment) {
    return "Allegato/file";
  }
  return "N/D";
};

const normalizeRelatedType = (value: string | null) => {
  if (!value) {
    return "";
  }
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
};

const resolveRelatedLink = (
  commessaId: string,
  relatedType: string | null,
  relatedId: string | null,
  relatedCode: string | null,
) => {
  const normalizedType = normalizeRelatedType(relatedType);
  if (normalizedType.includes("project") || normalizedType.includes("commessa")) {
    return (
      <Link href={`/commesse/${commessaId}`}>
        Commessa collegata {relatedCode ? `(${relatedCode})` : ""}
      </Link>
    );
  }

  if (
    normalizedType.includes("production_order") ||
    normalizedType.includes("routing") ||
    normalizedType.includes("odp")
  ) {
    return <Link href="/odp">ODP collegato (placeholder)</Link>;
  }

  if (normalizedType.includes("sales_order")) {
    return (
      <span style={{ color: "#334155" }}>
        Ordine cliente {relatedCode ?? relatedId ?? "N/D"} (placeholder)
      </span>
    );
  }

  if (relatedId || relatedCode || relatedType) {
    return (
      <span style={{ color: "#334155" }}>
        Oggetto: {relatedType ?? "N/D"} {relatedCode ?? relatedId ?? ""}
      </span>
    );
  }

  return null;
};

export default async function CommessaDocumentsPage({
  params,
  searchParams,
}: CommessaDocumentsPageProps) {
  const cookieStore = await cookies();
  const selectedTenantId = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value ?? "";
  if (!selectedTenantId) {
    redirect("/select-tenant");
  }

  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const q = normalizeParam(resolvedSearchParams.q);
  const documentType = normalizeParam(resolvedSearchParams.document_type) || "all";
  const status = normalizeParam(resolvedSearchParams.status) || "all";
  const origin = normalizeParam(resolvedSearchParams.origin) || "all";

  const overview = await getTenantCommessaOverviewById(selectedTenantId, resolvedParams.commessaId);
  if (!overview.commessa && !overview.error) {
    notFound();
  }

  const documents = await getTenantCommessaDocuments(selectedTenantId, resolvedParams.commessaId, {
    q,
    documentType,
    status,
    origin,
  });

  return (
    <section style={{ display: "grid", gap: "1rem", maxWidth: "1240px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "grid", gap: "0.3rem" }}>
          <h1 style={{ margin: 0 }}>Commesse / Documenti commessa</h1>
          <p style={{ margin: 0, color: "#475569" }}>
            Raccoglitore documentale read-only con filtri per tipo, stato e origine.
          </p>
        </div>
        <Link href={`/commesse/${resolvedParams.commessaId}`}>Torna a overview commessa</Link>
      </header>

      <CommessaDetailTabs commessaId={resolvedParams.commessaId} activeTab="documenti" />

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
          gridTemplateColumns: "minmax(220px,2fr) repeat(3,minmax(140px,1fr)) auto",
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
            placeholder="titolo, codice o origine"
            style={{ padding: "0.5rem 0.6rem" }}
          />
        </label>

        <label style={{ display: "grid", gap: "0.3rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#334155" }}>Tipo documento</span>
          <select
            name="document_type"
            defaultValue={documentType}
            style={{ padding: "0.5rem 0.6rem" }}
          >
            <option value="all">Tutti</option>
            {documents.documentTypes.map((documentTypeValue) => (
              <option key={documentTypeValue} value={documentTypeValue}>
                {documentTypeValue}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: "0.3rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#334155" }}>Stato</span>
          <select name="status" defaultValue={status} style={{ padding: "0.5rem 0.6rem" }}>
            <option value="all">Tutti</option>
            {documents.statuses.map((statusValue) => (
              <option key={statusValue} value={statusValue}>
                {statusValue}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: "0.3rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#334155" }}>Origine</span>
          <select name="origin" defaultValue={origin} style={{ padding: "0.5rem 0.6rem" }}>
            <option value="all">Tutte</option>
            {documents.origins.map((originValue) => (
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

      {documents.error ? (
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
          {documents.error}
        </p>
      ) : null}

      {documents.sourceTables.length > 0 ? (
        <p style={{ margin: 0, color: "#334155", fontSize: "0.85rem" }}>
          Sorgenti DB: <strong>{documents.sourceTables.join(", ")}</strong>
        </p>
      ) : null}

      {documents.warnings.length > 0 ? (
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
          {documents.warnings.map((warning) => (
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
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1220px" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {[
                "Documento",
                "Tipo",
                "Stato",
                "Origine",
                "Distinzione",
                "Collegamenti",
                "Aggiornamento",
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
            {documents.documents.map((document) => (
              <tr key={`${document.sourceTable}-${document.id}`}>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ display: "grid", gap: "0.2rem" }}>
                    <strong>{document.title}</strong>
                    <span style={{ fontSize: "0.85rem", color: "#475569" }}>
                      Codice: {document.code ?? "N/D"}
                    </span>
                    <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                      Sorgente: {document.sourceTable}
                    </span>
                  </div>
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  {document.documentType}
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  {document.status}
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  {document.origin}
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ display: "grid", gap: "0.35rem" }}>
                    <span
                      style={{
                        display: "inline-block",
                        width: "fit-content",
                        borderRadius: "999px",
                        padding: "0.15rem 0.5rem",
                        fontSize: "0.78rem",
                        background: document.isStructured ? "#dcfce7" : "#e2e8f0",
                        color: document.isStructured ? "#166534" : "#334155",
                      }}
                    >
                      {resolveDocumentKind(document.isStructured, document.hasAttachment)}
                    </span>
                    {document.attachmentName ? (
                      <span style={{ fontSize: "0.8rem", color: "#475569" }}>
                        File: {document.attachmentName}
                      </span>
                    ) : null}
                  </div>
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ display: "grid", gap: "0.35rem" }}>
                    <Link href={`/commesse/${resolvedParams.commessaId}`}>Apri overview</Link>
                    {document.fileUrl ? (
                      <a href={document.fileUrl} target="_blank" rel="noreferrer">
                        Apri file allegato
                      </a>
                    ) : document.hasAttachment ? (
                      <span style={{ color: "#475569" }}>Allegato disponibile (placeholder)</span>
                    ) : null}
                    {resolveRelatedLink(
                      resolvedParams.commessaId,
                      document.relatedEntityType,
                      document.relatedEntityId,
                      document.relatedEntityCode,
                    )}
                  </div>
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ display: "grid", gap: "0.2rem" }}>
                    <span style={{ fontSize: "0.85rem", color: "#334155" }}>
                      Agg: {formatDateTime(document.updatedAt)}
                    </span>
                    <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                      Cre: {formatDateTime(document.createdAt)}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {documents.documents.length === 0 ? (
          <section style={{ margin: 0, padding: "1rem", display: "grid", gap: "0.4rem" }}>
            <strong>Nessun documento disponibile</strong>
            <p style={{ margin: 0, color: "#475569" }}>
              {documents.emptyStateHint ??
                "Il dominio non espone ancora documenti collegati alla commessa selezionata."}
            </p>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <Link href={`/commesse/${resolvedParams.commessaId}/documenti`}>Reset filtri</Link>
              <Link href={`/commesse/${resolvedParams.commessaId}`}>Torna a overview</Link>
              <Link href={`/commesse/${resolvedParams.commessaId}/produzione`}>
                Apri produzione commessa
              </Link>
              <Link href={`/commesse/${resolvedParams.commessaId}/approvvigionamenti`}>
                Apri approvvigionamenti commessa
              </Link>
              <Link href="/odp">Apri area ODP (placeholder)</Link>
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
}
