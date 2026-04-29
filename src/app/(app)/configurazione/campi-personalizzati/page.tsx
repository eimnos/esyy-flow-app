import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  CUSTOM_FIELD_OBJECT_TYPES,
  CUSTOM_FIELD_TARGET_LEVELS,
  CUSTOM_FIELD_V1_TYPES,
  getTenantCustomFieldCatalog,
  getTenantCustomFieldValues,
} from "@/lib/domain/custom-fields";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ACTIVE_TENANT_COOKIE } from "@/lib/tenant/constants";
import { findTenantMembership, getUserTenantMemberships } from "@/lib/tenant/memberships";

export const dynamic = "force-dynamic";

type CustomFieldsPageProps = {
  searchParams: Promise<{
    op?: string | string[];
    ok?: string | string[];
    message?: string | string[];
    object_type_code?: string | string[];
    target_level?: string | string[];
    target_record_id?: string | string[];
    target_line_record_id?: string | string[];
  }>;
};

const normalizeParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? (value[0] ?? "") : (value ?? "");

const boolLabel = (value: boolean) => (value ? "Si" : "No");

const formatTypedValue = (value: string | number | boolean | null) => {
  if (value === null) {
    return "N/D";
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return `${value}`;
};

export default async function CustomFieldsPage({ searchParams }: CustomFieldsPageProps) {
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
  const op = normalizeParam(params.op);
  const ok = normalizeParam(params.ok) === "1";
  const message = normalizeParam(params.message);

  const selectedObjectTypeRaw = normalizeParam(params.object_type_code);
  const selectedTargetLevelRaw = normalizeParam(params.target_level);
  const selectedRecordId = normalizeParam(params.target_record_id);
  const selectedLineRecordId = normalizeParam(params.target_line_record_id);

  const selectedObjectType = CUSTOM_FIELD_OBJECT_TYPES.includes(
    selectedObjectTypeRaw as (typeof CUSTOM_FIELD_OBJECT_TYPES)[number],
  )
    ? (selectedObjectTypeRaw as (typeof CUSTOM_FIELD_OBJECT_TYPES)[number])
    : CUSTOM_FIELD_OBJECT_TYPES[0];

  const selectedTargetLevel = CUSTOM_FIELD_TARGET_LEVELS.includes(
    selectedTargetLevelRaw as (typeof CUSTOM_FIELD_TARGET_LEVELS)[number],
  )
    ? (selectedTargetLevelRaw as (typeof CUSTOM_FIELD_TARGET_LEVELS)[number])
    : CUSTOM_FIELD_TARGET_LEVELS[0];

  const canLoadValues =
    selectedRecordId.length > 0 &&
    (selectedTargetLevel === "header" || selectedLineRecordId.length > 0);

  const catalog = await getTenantCustomFieldCatalog(selectedTenantId);
  const valueSnapshot = canLoadValues
    ? await getTenantCustomFieldValues(selectedTenantId, {
        objectTypeCode: selectedObjectType,
        targetLevel: selectedTargetLevel,
        targetRecordId: selectedRecordId,
        targetLineRecordId: selectedLineRecordId,
      })
    : null;

  const contextualDefinitions = catalog.definitions.filter((definition) => {
    if (definition.targetLevel !== selectedTargetLevel) {
      return false;
    }
    if (definition.bindings.length === 0) {
      return true;
    }
    return definition.bindings.some(
      (binding) =>
        binding.objectTypeCode === selectedObjectType &&
        binding.targetLevel === selectedTargetLevel,
    );
  });

  const valueDefinitionCandidates =
    contextualDefinitions.length > 0
      ? contextualDefinitions
      : catalog.definitions.filter((definition) => definition.targetLevel === selectedTargetLevel);

  return (
    <section style={{ display: "grid", gap: "1rem", maxWidth: "1400px" }}>
      <header style={{ display: "grid", gap: "0.35rem" }}>
        <h1 style={{ margin: 0 }}>Configurazione / Campi personalizzati (CF-01)</h1>
        <p style={{ margin: 0, color: "#475569" }}>
          Fondazione app-native metadata-driven tenant-scoped. V1: definizione campo, binding
          contesto, persistenza valore header/line e audit minimo su creazione/modifica valore.
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
          Sorgenti DB:{" "}
          <strong>{catalog.sourceTables.length > 0 ? catalog.sourceTables.join(", ") : "N/D"}</strong>
        </span>
      </section>

      {op ? (
        <p
          role="status"
          style={{
            margin: 0,
            border: "1px solid",
            borderColor: ok ? "#86efac" : "#fecaca",
            borderRadius: "0.65rem",
            background: ok ? "#f0fdf4" : "#fef2f2",
            color: ok ? "#166534" : "#991b1b",
            padding: "0.75rem",
          }}
        >
          <strong>{op}</strong>: {message || (ok ? "Operazione completata." : "Operazione fallita.")}
        </p>
      ) : null}

      {catalog.error ? (
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
          {catalog.error}
        </p>
      ) : null}

      {catalog.warnings.length > 0 ? (
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
          <strong style={{ fontSize: "0.9rem" }}>Warning query custom fields</strong>
          {catalog.warnings.map((warning) => (
            <span key={warning} style={{ fontSize: "0.85rem", color: "#78350f" }}>
              {warning}
            </span>
          ))}
        </section>
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
        <strong>Nuova definizione campo V1</strong>
        <form
          method="post"
          action="/api/custom-fields/definitions"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(200px, 1fr))",
            gap: "0.65rem",
            alignItems: "end",
          }}
        >
          <label style={{ display: "grid", gap: "0.3rem" }}>
            <span>Code</span>
            <input name="code" required placeholder="es. reparto_target" style={{ padding: "0.5rem" }} />
          </label>
          <label style={{ display: "grid", gap: "0.3rem" }}>
            <span>Label</span>
            <input name="label" required placeholder="Reparto target" style={{ padding: "0.5rem" }} />
          </label>
          <label style={{ display: "grid", gap: "0.3rem" }}>
            <span>Dominio</span>
            <input
              name="field_domain_code"
              defaultValue="production"
              placeholder="production"
              style={{ padding: "0.5rem" }}
            />
          </label>

          <label style={{ display: "grid", gap: "0.3rem" }}>
            <span>Tipo campo</span>
            <select name="field_type" defaultValue="text_short" style={{ padding: "0.5rem" }}>
              {CUSTOM_FIELD_V1_TYPES.map((fieldType) => (
                <option key={fieldType} value={fieldType}>
                  {fieldType}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "grid", gap: "0.3rem" }}>
            <span>Object type</span>
            <select name="object_type_code" defaultValue={selectedObjectType} style={{ padding: "0.5rem" }}>
              {CUSTOM_FIELD_OBJECT_TYPES.map((objectType) => (
                <option key={objectType} value={objectType}>
                  {objectType}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "grid", gap: "0.3rem" }}>
            <span>Target level</span>
            <select name="target_level" defaultValue={selectedTargetLevel} style={{ padding: "0.5rem" }}>
              {CUSTOM_FIELD_TARGET_LEVELS.map((targetLevel) => (
                <option key={targetLevel} value={targetLevel}>
                  {targetLevel}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: "0.3rem" }}>
            <span>Screen code</span>
            <input
              name="screen_code"
              defaultValue="custom_fields_v1"
              placeholder="custom_fields_v1"
              style={{ padding: "0.5rem" }}
            />
          </label>
          <label style={{ display: "grid", gap: "0.3rem" }}>
            <span>Section code</span>
            <input name="section_code" defaultValue="general" placeholder="general" style={{ padding: "0.5rem" }} />
          </label>
          <label style={{ display: "grid", gap: "0.3rem" }}>
            <span>Line context type (solo line)</span>
            <input
              name="line_context_type"
              placeholder="production_order_phase_materials"
              style={{ padding: "0.5rem" }}
            />
          </label>

          <label style={{ display: "grid", gap: "0.3rem", gridColumn: "1 / span 2" }}>
            <span>Descrizione</span>
            <input name="description" placeholder="Descrizione breve campo" style={{ padding: "0.5rem" }} />
          </label>
          <label style={{ display: "grid", gap: "0.3rem" }}>
            <span>Opzioni enum (1 per riga)</span>
            <textarea
              name="enum_options"
              rows={3}
              placeholder={"alta\nmedia\nbassa"}
              style={{ padding: "0.5rem" }}
            />
          </label>

          <div style={{ display: "grid", gap: "0.35rem", gridColumn: "1 / span 3" }}>
            <strong style={{ fontSize: "0.92rem" }}>Flag V1 / visibilita base</strong>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              {[
                ["is_required", "Required"],
                ["is_read_only", "Read only"],
                ["is_filterable", "Filterable"],
                ["is_searchable", "Searchable"],
                ["is_reportable", "Reportable"],
              ].map(([name, label]) => (
                <label key={name} style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <input type="checkbox" name={name} value="1" />
                  <span>{label}</span>
                </label>
              ))}
              <label style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <input type="hidden" name="is_default_visible" value="0" />
                <input type="checkbox" name="is_default_visible" value="1" defaultChecked />
                <span>Default visible</span>
              </label>
            </div>
          </div>

          <button type="submit" style={{ padding: "0.6rem 0.8rem", cursor: "pointer", gridColumn: "1 / span 3" }}>
            Crea definizione custom field
          </button>
        </form>
      </section>

      <section
        style={{
          border: "1px solid #d1d5db",
          borderRadius: "0.75rem",
          background: "#fff",
          overflowX: "auto",
        }}
      >
        <header style={{ padding: "0.85rem", borderBottom: "1px solid #e2e8f0", display: "grid", gap: "0.2rem" }}>
          <strong>Catalogo definizioni tenant-scoped</strong>
          <p style={{ margin: 0, color: "#475569", fontSize: "0.9rem" }}>
            Definizioni + versione corrente + binding contesto (gruppi/sezioni/visibilita base).
          </p>
        </header>
        <table style={{ width: "100%", minWidth: "1240px", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["Code", "Label", "Tipo", "Livello", "Flag", "Binding", "Audit"].map((header) => (
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
            {catalog.definitions.map((definition) => (
              <tr key={definition.definitionId}>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ display: "grid", gap: "0.2rem" }}>
                    <strong>{definition.code}</strong>
                    <span style={{ color: "#64748b", fontSize: "0.8rem" }}>{definition.fieldKey}</span>
                  </span>
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ display: "grid", gap: "0.2rem" }}>
                    <strong>{definition.label}</strong>
                    <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                      {definition.description ?? "Nessuna descrizione"}
                    </span>
                  </span>
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ display: "grid", gap: "0.2rem" }}>
                    <span>{definition.fieldType}</span>
                    {definition.enumOptions.length > 0 ? (
                      <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                        enum: {definition.enumOptions.join(", ")}
                      </span>
                    ) : null}
                  </span>
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  {definition.targetLevel}
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ display: "grid", gap: "0.2rem" }}>
                    <span>required: {boolLabel(definition.isRequired)}</span>
                    <span>readonly: {boolLabel(definition.isReadOnly)}</span>
                    <span>filterable: {boolLabel(definition.isFilterable)}</span>
                    <span>searchable: {boolLabel(definition.isSearchable)}</span>
                    <span>reportable: {boolLabel(definition.isReportable)}</span>
                  </span>
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  {definition.bindings.length === 0 ? (
                    <span style={{ color: "#64748b" }}>Nessun binding</span>
                  ) : (
                    <span style={{ display: "grid", gap: "0.2rem" }}>
                      {definition.bindings.map((binding) => (
                        <span key={binding.id} style={{ fontSize: "0.85rem" }}>
                          {binding.objectTypeCode} / {binding.screenCode} / {binding.sectionCode} (
                          {binding.targetLevel}
                          {binding.lineContextType ? `:${binding.lineContextType}` : ""})
                        </span>
                      ))}
                    </span>
                  )}
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ display: "grid", gap: "0.2rem" }}>
                    <span>v{definition.versionNo}</span>
                    <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                      created: {definition.createdAt ?? "N/D"}
                    </span>
                    <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                      updated: {definition.updatedAt ?? "N/D"}
                    </span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {catalog.definitions.length === 0 ? (
          <section style={{ margin: 0, padding: "1rem", display: "grid", gap: "0.4rem" }}>
            <strong>Nessuna definizione disponibile</strong>
            <p style={{ margin: 0, color: "#475569" }}>
              {catalog.emptyStateHint ??
                "Il tenant non espone ancora definizioni custom fields; usa il form sopra per creare la prima definizione V1."}
            </p>
          </section>
        ) : null}
      </section>

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
        <strong>Target valori custom field (header/line)</strong>
        <form
          method="get"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(180px, 1fr)) auto",
            gap: "0.6rem",
            alignItems: "end",
          }}
        >
          <label style={{ display: "grid", gap: "0.3rem" }}>
            <span>Object type</span>
            <select name="object_type_code" defaultValue={selectedObjectType} style={{ padding: "0.5rem" }}>
              {CUSTOM_FIELD_OBJECT_TYPES.map((objectType) => (
                <option key={objectType} value={objectType}>
                  {objectType}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "grid", gap: "0.3rem" }}>
            <span>Target level</span>
            <select name="target_level" defaultValue={selectedTargetLevel} style={{ padding: "0.5rem" }}>
              {CUSTOM_FIELD_TARGET_LEVELS.map((targetLevel) => (
                <option key={targetLevel} value={targetLevel}>
                  {targetLevel}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "grid", gap: "0.3rem" }}>
            <span>Target record ID</span>
            <input
              name="target_record_id"
              defaultValue={selectedRecordId}
              placeholder="UUID record"
              style={{ padding: "0.5rem" }}
            />
          </label>
          <label style={{ display: "grid", gap: "0.3rem" }}>
            <span>Target line record ID</span>
            <input
              name="target_line_record_id"
              defaultValue={selectedLineRecordId}
              placeholder="UUID riga (solo line)"
              style={{ padding: "0.5rem" }}
            />
          </label>
          <button type="submit" style={{ padding: "0.55rem 0.8rem", cursor: "pointer" }}>
            Carica valori
          </button>
        </form>
      </section>

      {canLoadValues ? (
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
          <strong>Upsert valore custom field</strong>
          <form
            method="post"
            action="/api/custom-fields/values"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(220px, 1fr))",
              gap: "0.6rem",
              alignItems: "end",
            }}
          >
            <input type="hidden" name="object_type_code" value={selectedObjectType} />
            <input type="hidden" name="target_level" value={selectedTargetLevel} />
            <input type="hidden" name="target_record_id" value={selectedRecordId} />
            <input type="hidden" name="target_line_record_id" value={selectedLineRecordId} />

            <label style={{ display: "grid", gap: "0.3rem", gridColumn: "1 / span 2" }}>
              <span>Campo (definizione)</span>
              <select name="custom_field_definition_id" style={{ padding: "0.5rem" }}>
                {valueDefinitionCandidates.map((definition) => (
                  <option key={definition.definitionId} value={definition.definitionId}>
                    {definition.code} - {definition.label} ({definition.fieldType})
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: "0.3rem" }}>
              <span>Valore</span>
              <input name="value" required placeholder="es. 12, true, 2026-05-10, testo" style={{ padding: "0.5rem" }} />
            </label>

            <label style={{ display: "grid", gap: "0.3rem", gridColumn: "1 / span 2" }}>
              <span>Reason audit (opzionale)</span>
              <input
                name="reason"
                placeholder="es. aggiornamento pianificazione produzione"
                style={{ padding: "0.5rem" }}
              />
            </label>

            <button type="submit" style={{ padding: "0.55rem 0.8rem", cursor: "pointer" }}>
              Salva valore
            </button>
          </form>

          {valueSnapshot?.error ? (
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
              {valueSnapshot.error}
            </p>
          ) : null}

          {valueSnapshot?.warnings && valueSnapshot.warnings.length > 0 ? (
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
              <strong style={{ fontSize: "0.9rem" }}>Warning valori custom fields</strong>
              {valueSnapshot.warnings.map((warning) => (
                <span key={warning} style={{ fontSize: "0.85rem", color: "#78350f" }}>
                  {warning}
                </span>
              ))}
            </section>
          ) : null}

          <section
            style={{
              border: "1px solid #d1d5db",
              borderRadius: "0.75rem",
              background: "#fff",
              overflowX: "auto",
            }}
          >
            <table style={{ width: "100%", minWidth: "920px", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Field", "Tipo", "Target", "Valore", "Source", "Audit"].map((header) => (
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
                {(valueSnapshot?.values ?? []).map((value) => (
                  <tr key={value.valueId}>
                    <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                      <span style={{ display: "grid", gap: "0.2rem" }}>
                        <strong>{value.fieldKey}</strong>
                        <span style={{ color: "#64748b", fontSize: "0.8rem" }}>{value.label}</span>
                      </span>
                    </td>
                    <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                      {value.fieldType}
                    </td>
                    <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                      <span style={{ display: "grid", gap: "0.2rem" }}>
                        <span>
                          {value.objectTypeCode} / {value.targetLevel}
                        </span>
                        <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                          rec: {value.targetRecordId}
                        </span>
                        {value.targetLineRecordId ? (
                          <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                            line: {value.targetLineRecordId}
                          </span>
                        ) : null}
                      </span>
                    </td>
                    <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                      {formatTypedValue(value.value)}
                    </td>
                    <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                      {value.valueSourceType}
                    </td>
                    <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                      <span style={{ display: "grid", gap: "0.2rem" }}>
                        <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                          upd: {value.updatedAt ?? "N/D"}
                        </span>
                        <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                          by: {value.updatedByUserId ?? "N/D"}
                        </span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {(valueSnapshot?.values.length ?? 0) === 0 ? (
              <section style={{ margin: 0, padding: "1rem", display: "grid", gap: "0.4rem" }}>
                <strong>Nessun valore custom field sul target</strong>
                <p style={{ margin: 0, color: "#475569" }}>
                  {valueSnapshot?.emptyStateHint ??
                    "Inserisci un valore dal form sopra per validare il path app-native header/line e audit eventi."}
                </p>
              </section>
            ) : null}
          </section>
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
        <Link href="/configurazione/campi-personalizzati/binding-tecnici">
          Apri binding tecnici CF-02
        </Link>
        <Link href="/configurazione/campi-personalizzati/lettura-erp">
          Apri read ERP CF-03
        </Link>
        <Link href="/configurazione/campi-personalizzati/scrittura-erp">
          Apri write ERP CF-04
        </Link>
        <Link href="/dashboard">Torna a dashboard</Link>
        <Link href="/anagrafiche">Torna ad anagrafiche</Link>
      </section>
    </section>
  );
}
