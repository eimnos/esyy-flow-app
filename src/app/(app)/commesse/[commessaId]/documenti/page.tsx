import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { CommessaDetailTabs } from "@/app/(app)/commesse/_components/commessa-detail-tabs";
import {
  getTenantCommessaDocuments,
  type CommessaDocumentItem,
} from "@/lib/domain/commessa-documents";
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
    semantic_class?: string | string[];
  }>;
};

type SemanticClass =
  | "commercial"
  | "logistics"
  | "production"
  | "attachment"
  | "event_other";

type SemanticSnapshot = {
  semanticClass: SemanticClass;
  semanticLabel: string;
  semanticHint: string;
  objectLabel: string;
};

const normalizeParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? (value[0] ?? "") : (value ?? "");

const normalizeToken = (value: string | null) => {
  if (!value) {
    return "";
  }
  return value.trim().toLowerCase().replace(/[\s\-]+/g, "_");
};

const humanizeToken = (value: string | null) => {
  if (!value) {
    return "N/D";
  }

  const normalized = value
    .trim()
    .replace(/[\s\-_]+/g, " ")
    .replace(/\s+/g, " ");

  if (!normalized) {
    return "N/D";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
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

const COMMERCIAL_ORDER_KEYWORDS = [
  "sales_order",
  "ordine_cliente",
  "customer_order",
  "quotation",
  "quote",
  "preventivo",
  "invoice",
  "fattura",
];

const PURCHASE_ORDER_KEYWORDS = [
  "purchase_order",
  "ordine_acquisto",
  "supplier_order",
  "procurement_order",
  "po",
];

const LOGISTICS_KEYWORDS = [
  "delivery",
  "shipment",
  "dispatch",
  "spedizione",
  "consegna",
  "ddt",
  "transport",
  "packing",
  "picking",
];

const PRODUCTION_KEYWORDS = [
  "production",
  "production_order",
  "work_order",
  "odp",
  "routing",
  "phase",
  "operation",
  "mes",
  "bom",
  "diba",
  "ciclo",
];

const ATTACHMENT_KEYWORDS = [
  "attachment",
  "allegato",
  "file",
  "upload",
  "storage",
  "document_file",
];

const EVENT_KEYWORDS = [
  "event",
  "history",
  "timeline",
  "log",
  "note",
  "message",
  "overview",
];

const DELIVERY_OBJECT_KEYWORDS = [
  "delivery",
  "shipment",
  "ddt",
  "consegna",
  "dispatch",
];

const hasAnyKeyword = (context: string, keywords: string[]) =>
  keywords.some((keyword) => context.includes(keyword));

const buildDocumentSemanticContext = (document: CommessaDocumentItem) => {
  return [
    document.documentType,
    document.origin,
    document.relatedEntityType,
    document.sourceTable,
    document.title,
    document.code,
    document.relatedEntityCode,
  ]
    .map((value) => normalizeToken(value))
    .filter((value) => value.length > 0)
    .join(" ");
};

const resolveSemanticClass = (document: CommessaDocumentItem): SemanticClass => {
  const context = buildDocumentSemanticContext(document);

  const isAttachmentLike =
    hasAnyKeyword(context, ATTACHMENT_KEYWORDS) ||
    document.sourceTable.includes("attachment") ||
    (document.hasAttachment && !document.isStructured);

  if (isAttachmentLike) {
    return "attachment";
  }

  if (hasAnyKeyword(context, COMMERCIAL_ORDER_KEYWORDS) || hasAnyKeyword(context, PURCHASE_ORDER_KEYWORDS)) {
    return "commercial";
  }

  if (hasAnyKeyword(context, LOGISTICS_KEYWORDS)) {
    return "logistics";
  }

  if (hasAnyKeyword(context, PRODUCTION_KEYWORDS)) {
    return "production";
  }

  if (hasAnyKeyword(context, EVENT_KEYWORDS) || document.sourceTable.includes("event")) {
    return "event_other";
  }

  if (document.hasAttachment) {
    return "attachment";
  }

  return "event_other";
};

const semanticLabel = (value: SemanticClass) => {
  if (value === "commercial") {
    return "Documento commerciale";
  }
  if (value === "logistics") {
    return "Documento logistico";
  }
  if (value === "production") {
    return "Documento produzione";
  }
  if (value === "attachment") {
    return "Allegato / file";
  }
  return "Evento / altro collegamento";
};

const semanticHint = (value: SemanticClass) => {
  if (value === "commercial") {
    return "Ordini cliente/acquisto, offerte, fatture o documenti commerciali.";
  }
  if (value === "logistics") {
    return "Consegne, spedizioni e documenti di movimentazione logistica.";
  }
  if (value === "production") {
    return "ODP, documenti di produzione, fasi o collegamenti operativi.";
  }
  if (value === "attachment") {
    return "File allegati o documenti non strutturati con supporto file.";
  }
  return "Eventi, note o collegamenti tecnici non classificati altrove.";
};

const semanticStyle = (value: SemanticClass) => {
  if (value === "commercial") {
    return { background: "#dbeafe", color: "#1d4ed8" };
  }
  if (value === "logistics") {
    return { background: "#dcfce7", color: "#166534" };
  }
  if (value === "production") {
    return { background: "#ede9fe", color: "#5b21b6" };
  }
  if (value === "attachment") {
    return { background: "#fee2e2", color: "#991b1b" };
  }
  return { background: "#f1f5f9", color: "#334155" };
};

const resolveObjectLabel = (
  document: CommessaDocumentItem,
  semanticClassValue: SemanticClass,
) => {
  const context = buildDocumentSemanticContext(document);

  if (hasAnyKeyword(context, COMMERCIAL_ORDER_KEYWORDS)) {
    return "Ordine cliente";
  }

  if (hasAnyKeyword(context, PURCHASE_ORDER_KEYWORDS)) {
    return "Ordine acquisto";
  }

  if (hasAnyKeyword(context, DELIVERY_OBJECT_KEYWORDS)) {
    return "Consegna";
  }

  if (semanticClassValue === "production") {
    return "Documento produzione";
  }

  if (semanticClassValue === "attachment") {
    return "Allegato";
  }

  if (document.relatedEntityType) {
    return humanizeToken(document.relatedEntityType);
  }

  if (semanticClassValue === "event_other") {
    return "Altro oggetto collegato";
  }

  return "Documento";
};

const buildSemanticSnapshot = (document: CommessaDocumentItem): SemanticSnapshot => {
  const resolvedClass = resolveSemanticClass(document);
  return {
    semanticClass: resolvedClass,
    semanticLabel: semanticLabel(resolvedClass),
    semanticHint: semanticHint(resolvedClass),
    objectLabel: resolveObjectLabel(document, resolvedClass),
  };
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
  document: CommessaDocumentItem,
  semantic: SemanticSnapshot,
) => {
  const normalizedType = normalizeRelatedType(document.relatedEntityType);
  const reference = document.relatedEntityCode ?? document.relatedEntityId ?? "N/D";

  if (normalizedType.includes("project") || normalizedType.includes("commessa")) {
    return (
      <Link href={`/commesse/${commessaId}`}>
        Commessa collegata {document.relatedEntityCode ? `(${document.relatedEntityCode})` : ""}
      </Link>
    );
  }

  if (normalizedType.includes("sales_order") || semantic.objectLabel === "Ordine cliente") {
    return <span style={{ color: "#334155" }}>Ordine cliente {reference} (placeholder)</span>;
  }

  if (normalizedType.includes("purchase_order") || semantic.objectLabel === "Ordine acquisto") {
    return <span style={{ color: "#334155" }}>Ordine acquisto {reference} (placeholder)</span>;
  }

  if (
    normalizedType.includes("delivery") ||
    normalizedType.includes("shipment") ||
    semantic.objectLabel === "Consegna"
  ) {
    return <span style={{ color: "#334155" }}>Consegna {reference} (placeholder)</span>;
  }

  if (
    normalizedType.includes("production_order") ||
    normalizedType.includes("routing") ||
    normalizedType.includes("odp") ||
    semantic.semanticClass === "production"
  ) {
    return <Link href="/odp">Documento produzione / ODP (placeholder)</Link>;
  }

  if (document.relatedEntityType || document.relatedEntityCode || document.relatedEntityId) {
    return (
      <span style={{ color: "#334155" }}>
        Oggetto: {semantic.objectLabel} {document.relatedEntityCode ?? document.relatedEntityId ?? ""}
      </span>
    );
  }

  return <span style={{ color: "#475569" }}>Nessun oggetto collegato esplicito</span>;
};

const semanticClassOrder: SemanticClass[] = [
  "commercial",
  "logistics",
  "production",
  "attachment",
  "event_other",
];

const isSemanticClass = (value: string): value is SemanticClass => {
  return semanticClassOrder.includes(value as SemanticClass);
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
  const semanticClassParam = normalizeParam(resolvedSearchParams.semantic_class) || "all";
  const semanticClassFilter = isSemanticClass(semanticClassParam) ? semanticClassParam : "all";

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

  const semanticDocuments = documents.documents.map((document) => ({
    document,
    semantic: buildSemanticSnapshot(document),
  }));

  const visibleDocuments =
    semanticClassFilter === "all"
      ? semanticDocuments
      : semanticDocuments.filter((item) => item.semantic.semanticClass === semanticClassFilter);

  const semanticCounts = semanticClassOrder.reduce<Record<SemanticClass, number>>(
    (acc, currentClass) => {
      acc[currentClass] = semanticDocuments.filter(
        (item) => item.semantic.semanticClass === currentClass,
      ).length;
      return acc;
    },
    {
      commercial: 0,
      logistics: 0,
      production: 0,
      attachment: 0,
      event_other: 0,
    },
  );

  const semanticOptions = semanticClassOrder.filter((entry) => semanticCounts[entry] > 0);

  const semanticFilteredOut =
    semanticDocuments.length > 0 && visibleDocuments.length === 0 && semanticClassFilter !== "all";

  return (
    <section style={{ display: "grid", gap: "1rem", maxWidth: "1320px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "grid", gap: "0.3rem" }}>
          <h1 style={{ margin: 0 }}>Commesse / Documenti commessa</h1>
          <p style={{ margin: 0, color: "#475569" }}>
            Raccoglitore documentale read-only con classificazione semantica orientata utente.
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

      <section
        style={{
          border: "1px solid #d1d5db",
          borderRadius: "0.75rem",
          background: "#fff",
          padding: "0.8rem",
          display: "grid",
          gap: "0.55rem",
        }}
      >
        <strong>Classificazione documentale</strong>
        <p style={{ margin: 0, color: "#475569", fontSize: "0.9rem" }}>
          Le righe sono raggruppate per semantica utente: commerciale, logistico, produzione,
          allegato/file, evento o altro collegamento tecnico.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
          {semanticClassOrder.map((entry) => {
            const style = semanticStyle(entry);
            return (
              <span
                key={entry}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  borderRadius: "999px",
                  padding: "0.2rem 0.55rem",
                  background: style.background,
                  color: style.color,
                  fontSize: "0.8rem",
                }}
              >
                {semanticLabel(entry)}
                <strong>{semanticCounts[entry]}</strong>
              </span>
            );
          })}
        </div>
      </section>

      <form
        method="get"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(220px,2fr) repeat(4,minmax(130px,1fr)) auto",
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
            placeholder="titolo, codice, ordine, consegna, allegato"
            style={{ padding: "0.5rem 0.6rem" }}
          />
        </label>

        <label style={{ display: "grid", gap: "0.3rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#334155" }}>Classe utente</span>
          <select
            name="semantic_class"
            defaultValue={semanticClassFilter}
            style={{ padding: "0.5rem 0.6rem" }}
          >
            <option value="all">Tutte</option>
            {semanticOptions.map((entry) => (
              <option key={entry} value={entry}>
                {semanticLabel(entry)}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: "0.3rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#334155" }}>Tipo tecnico</span>
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
          <span style={{ fontSize: "0.85rem", color: "#334155" }}>Origine tecnica</span>
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
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1320px" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {[
                "Documento / Oggetto",
                "Classe utente",
                "Tipo tecnico",
                "Stato",
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
            {visibleDocuments.map(({ document, semantic }) => {
              const classStyle = semanticStyle(semantic.semanticClass);
              return (
                <tr key={`${document.sourceTable}-${document.id}`}>
                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "grid", gap: "0.2rem" }}>
                      <strong>{document.title}</strong>
                      <span style={{ fontSize: "0.85rem", color: "#475569" }}>
                        Oggetto: {semantic.objectLabel}
                      </span>
                      <span style={{ fontSize: "0.85rem", color: "#475569" }}>
                        Codice: {document.code ?? "N/D"}
                      </span>
                    </div>
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
                          background: classStyle.background,
                          color: classStyle.color,
                        }}
                      >
                        {semantic.semanticLabel}
                      </span>
                      <span style={{ fontSize: "0.8rem", color: "#475569" }}>{semantic.semanticHint}</span>
                    </div>
                  </td>

                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "grid", gap: "0.25rem" }}>
                      <span>Tipo: {humanizeToken(document.documentType)}</span>
                      <span style={{ color: "#475569", fontSize: "0.85rem" }}>
                        Origine: {humanizeToken(document.origin)}
                      </span>
                      <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                        Collegamento tecnico: {humanizeToken(document.relatedEntityType)}
                      </span>
                      <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                        Sorgente DB: {document.sourceTable}
                      </span>
                    </div>
                  </td>

                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    {document.status}
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
                      {resolveRelatedLink(resolvedParams.commessaId, document, semantic)}
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
              );
            })}
          </tbody>
        </table>

        {visibleDocuments.length === 0 ? (
          <section style={{ margin: 0, padding: "1rem", display: "grid", gap: "0.4rem" }}>
            <strong>Nessun documento disponibile</strong>
            <p style={{ margin: 0, color: "#475569" }}>
              {semanticFilteredOut
                ? "Nessun documento nella classe selezionata. Prova a cambiare filtro semantico."
                : documents.emptyStateHint ??
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
              <Link href={`/commesse/${resolvedParams.commessaId}/conto-lavoro`}>
                Apri conto lavoro commessa
              </Link>
              <Link href={`/commesse/${resolvedParams.commessaId}/costi-fatturato`}>
                Apri costi/fatturato commessa
              </Link>
              <Link href={`/commesse/${resolvedParams.commessaId}/tracciabilita`}>
                Apri tracciabilita commessa
              </Link>
              <Link href="/odp">Apri area ODP (placeholder)</Link>
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
}
