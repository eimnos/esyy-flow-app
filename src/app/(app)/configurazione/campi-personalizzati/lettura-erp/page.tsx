import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  CUSTOM_FIELD_OBJECT_TYPES,
  CUSTOM_FIELD_TARGET_LEVELS,
  getTenantCustomFieldCatalog,
} from "@/lib/domain/custom-fields";
import { getTenantCustomFieldErpReadPreview } from "@/lib/domain/custom-field-erp-read";
import { getTenantIntFieldBindingsCatalog } from "@/lib/domain/custom-field-int-bindings";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ACTIVE_TENANT_COOKIE } from "@/lib/tenant/constants";
import { findTenantMembership, getUserTenantMemberships } from "@/lib/tenant/memberships";

export const dynamic = "force-dynamic";

type ErpReadPageProps = {
  searchParams: Promise<{
    object_type_code?: string | string[];
    target_level?: string | string[];
    target_record_id?: string | string[];
    target_line_record_id?: string | string[];
    custom_field_definition_id?: string | string[];
    source_system_code?: string | string[];
  }>;
};

const normalizeParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? (value[0] ?? "") : (value ?? "");

export default async function CustomFieldsErpReadPage({ searchParams }: ErpReadPageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const selectedTenantId = (await cookies()).get(ACTIVE_TENANT_COOKIE)?.value ?? "";
  if (!selectedTenantId) {
    redirect("/select-tenant");
  }

  const { memberships, error: membershipError } = await getUserTenantMemberships(user.id);
  if (membershipError) {
    redirect("/select-tenant?error=tenant-query-failed");
  }

  const activeMembership = findTenantMembership(memberships, selectedTenantId);
  if (!activeMembership) {
    redirect("/select-tenant?error=tenant-not-allowed");
  }

  const params = await searchParams;
  const definitionsCatalog = await getTenantCustomFieldCatalog(selectedTenantId);
  const bindingsCatalog = await getTenantIntFieldBindingsCatalog(selectedTenantId);

  const readableBindings = bindingsCatalog.bindings.filter(
    (binding) =>
      binding.status === "active" &&
      binding.isEnabled &&
      (binding.directionMode === "read" ||
        binding.directionMode === "bidirectional_candidate"),
  );

  const sourceSystemOptions = [...new Set(readableBindings.map((binding) => binding.sourceSystemCode))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "it"));

  const defaultObjectType = readableBindings[0]?.objectTypeCode ?? CUSTOM_FIELD_OBJECT_TYPES[0];
  const defaultTargetLevel = readableBindings[0]?.targetLevel ?? CUSTOM_FIELD_TARGET_LEVELS[0];

  const objectTypeCode = normalizeParam(params.object_type_code) || defaultObjectType;
  const targetLevel = normalizeParam(params.target_level) || defaultTargetLevel;
  const targetRecordId = normalizeParam(params.target_record_id);
  const targetLineRecordId = normalizeParam(params.target_line_record_id);
  const customFieldDefinitionId = normalizeParam(params.custom_field_definition_id);
  const sourceSystemCode = normalizeParam(params.source_system_code);

  const hasValidObjectType = CUSTOM_FIELD_OBJECT_TYPES.includes(
    objectTypeCode as (typeof CUSTOM_FIELD_OBJECT_TYPES)[number],
  );
  const hasValidTargetLevel = CUSTOM_FIELD_TARGET_LEVELS.includes(
    targetLevel as (typeof CUSTOM_FIELD_TARGET_LEVELS)[number],
  );

  const canRunPreview = hasValidObjectType && hasValidTargetLevel && targetRecordId.length > 0;

  const preview = canRunPreview
    ? await getTenantCustomFieldErpReadPreview(selectedTenantId, {
        objectTypeCode: objectTypeCode as (typeof CUSTOM_FIELD_OBJECT_TYPES)[number],
        targetLevel: targetLevel as (typeof CUSTOM_FIELD_TARGET_LEVELS)[number],
        targetRecordId,
        targetLineRecordId,
        customFieldDefinitionId,
        sourceSystemCode,
      })
    : null;

  const definitionOptions = definitionsCatalog.definitions
    .slice()
    .sort((left, right) => left.code.localeCompare(right.code, "it"));

  return (
    <section style={{ display: "grid", gap: "1rem", maxWidth: "1400px" }}>
      <header style={{ display: "grid", gap: "0.35rem" }}>
        <h1 style={{ margin: 0 }}>Configurazione / Campi personalizzati / Read ERP selettivo (CF-03)</h1>
        <p style={{ margin: 0, color: "#475569" }}>
          Slice di sola lettura ERP tramite binding tecnici attivi. Nessuna scrittura ERP, nessuna
          bidirezionalita runtime e nessuna sincronizzazione estesa.
        </p>
      </header>

      <section
        style={{
          border: "1px solid #d1d5db",
          borderRadius: "0.75rem",
          background: "#fff",
          padding: "0.9rem",
          display: "grid",
          gap: "0.4rem",
        }}
      >
        <span>
          Tenant attivo: <strong>{activeMembership.tenantName}</strong>
        </span>
        <span>
          Utente: <strong>{user.email ?? user.id}</strong>
        </span>
        <span>
          Binding read attivi: <strong>{readableBindings.length}</strong>
        </span>
      </section>

      {bindingsCatalog.error ? (
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
          {bindingsCatalog.error}
        </p>
      ) : null}

      {definitionsCatalog.error ? (
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
          Errore catalogo definizioni: {definitionsCatalog.error}
        </p>
      ) : null}

      <section
        style={{
          border: "1px solid #d1d5db",
          borderRadius: "0.75rem",
          background: "#fff",
          padding: "0.9rem",
          display: "grid",
          gap: "0.7rem",
        }}
      >
        <strong>Filtro lettura ERP (solo binding tecnici attivi/read)</strong>
        <form
          method="get"
          action="/configurazione/campi-personalizzati/lettura-erp"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(220px, 1fr))",
            gap: "0.65rem",
            alignItems: "end",
          }}
        >
          <label style={{ display: "grid", gap: "0.3rem" }}>
            <span>Object type</span>
            <select name="object_type_code" defaultValue={objectTypeCode} style={{ padding: "0.5rem" }}>
              {CUSTOM_FIELD_OBJECT_TYPES.map((objectType) => (
                <option key={objectType} value={objectType}>
                  {objectType}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: "0.3rem" }}>
            <span>Target level</span>
            <select name="target_level" defaultValue={targetLevel} style={{ padding: "0.5rem" }}>
              {CUSTOM_FIELD_TARGET_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: "0.3rem" }}>
            <span>Target record id</span>
            <input
              name="target_record_id"
              defaultValue={targetRecordId}
              placeholder="uuid record header"
              style={{ padding: "0.5rem" }}
            />
          </label>

          <label style={{ display: "grid", gap: "0.3rem" }}>
            <span>Target line record id (solo line)</span>
            <input
              name="target_line_record_id"
              defaultValue={targetLineRecordId}
              placeholder="uuid riga"
              style={{ padding: "0.5rem" }}
            />
          </label>

          <label style={{ display: "grid", gap: "0.3rem" }}>
            <span>Definizione custom field (opzionale)</span>
            <select
              name="custom_field_definition_id"
              defaultValue={customFieldDefinitionId}
              style={{ padding: "0.5rem" }}
            >
              <option value="">Tutte</option>
              {definitionOptions.map((definition) => (
                <option key={definition.definitionId} value={definition.definitionId}>
                  {definition.code} - {definition.label}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: "0.3rem" }}>
            <span>Sistema esterno (opzionale)</span>
            <select name="source_system_code" defaultValue={sourceSystemCode} style={{ padding: "0.5rem" }}>
              <option value="">Tutti</option>
              {sourceSystemOptions.map((sourceSystem) => (
                <option key={sourceSystem} value={sourceSystem}>
                  {sourceSystem}
                </option>
              ))}
            </select>
          </label>

          <button type="submit" style={{ padding: "0.6rem 0.8rem", cursor: "pointer" }}>
            Esegui read ERP
          </button>
        </form>
      </section>

      {preview?.error ? (
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
          {preview.error}
        </p>
      ) : null}

      {preview && (preview.warnings.length > 0 || bindingsCatalog.warnings.length > 0) ? (
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
          <strong style={{ fontSize: "0.9rem" }}>Warning runtime</strong>
          {[...bindingsCatalog.warnings, ...preview.warnings].map((warning) => (
            <span key={warning} style={{ fontSize: "0.85rem", color: "#78350f" }}>
              {warning}
            </span>
          ))}
        </section>
      ) : null}

      {preview ? (
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
              gap: "0.2rem",
            }}
          >
            <strong>Read ERP selettivo</strong>
            <p style={{ margin: 0, color: "#475569", fontSize: "0.9rem" }}>
              Sorgenti usate: {preview.sourceTables.length > 0 ? preview.sourceTables.join(", ") : "N/D"}
            </p>
          </header>

          <table style={{ width: "100%", minWidth: "1200px", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Campo app", "Binding", "Target", "Sorgente", "Valore letto"].map((header) => (
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
              {preview.values.map((item) => (
                <tr key={item.bindingId}>
                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ display: "grid", gap: "0.2rem" }}>
                      <strong>{item.customFieldCode ?? "N/D"}</strong>
                      <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                        {item.customFieldLabel ?? "Definizione non risolta"}
                      </span>
                      <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                        definition: {item.customFieldDefinitionId}
                      </span>
                    </span>
                  </td>
                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ display: "grid", gap: "0.2rem" }}>
                      <span>status: {item.status}</span>
                      <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                        direction: {item.directionMode}
                      </span>
                      <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                        source system: {item.sourceSystemCode}
                      </span>
                    </span>
                  </td>
                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ display: "grid", gap: "0.2rem" }}>
                      <span>{item.objectTypeCode}</span>
                      <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                        {item.targetLevel}
                        {item.lineContextType ? `:${item.lineContextType}` : ""}
                      </span>
                      <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                        target: {item.sourceRecordId}
                      </span>
                    </span>
                  </td>
                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ display: "grid", gap: "0.2rem" }}>
                      <span>{item.sourceTable}</span>
                      <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                        external: {item.externalFieldIdentifier}
                      </span>
                      <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                        column: {item.sourceColumn ?? "N/D"}
                      </span>
                    </span>
                  </td>
                  <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ display: "grid", gap: "0.2rem" }}>
                      <strong>{item.sourceValueFound ? item.sourceValue ?? "(vuoto)" : "Non trovato"}</strong>
                      <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                        {item.sourceValueFound
                          ? "Valore letto dalla sorgente esterna"
                          : "Campo esterno non disponibile sul record sorgente"}
                      </span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {preview.values.length === 0 ? (
            <section style={{ margin: 0, padding: "1rem", display: "grid", gap: "0.4rem" }}>
              <strong>Nessun dato ERP letto</strong>
              <p style={{ margin: 0, color: "#475569" }}>
                {preview.emptyStateHint ??
                  "Definisci almeno un binding tecnico attivo/read con target coerente, poi ripeti la lettura."}
              </p>
            </section>
          ) : null}
        </section>
      ) : null}

      <section
        style={{
          borderTop: "1px solid #e2e8f0",
          paddingTop: "0.8rem",
          display: "flex",
          gap: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        <Link href="/configurazione/campi-personalizzati">Torna a campi personalizzati</Link>
        <Link href="/configurazione/campi-personalizzati/binding-tecnici">
          Apri binding tecnici CF-02
        </Link>
        <Link href="/dashboard">Torna a dashboard</Link>
      </section>
    </section>
  );
}
