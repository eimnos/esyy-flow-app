import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  CUSTOM_FIELD_OBJECT_TYPES,
  CUSTOM_FIELD_TARGET_LEVELS,
  getTenantCustomFieldCatalog,
} from "@/lib/domain/custom-fields";
import {
  INT_FIELD_BINDING_DIRECTION_MODES,
  INT_FIELD_BINDING_STATUSES,
  INT_FIELD_BINDING_SYNC_MODES,
  getTenantIntFieldBindingsCatalog,
} from "@/lib/domain/custom-field-int-bindings";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ACTIVE_TENANT_COOKIE } from "@/lib/tenant/constants";
import { findTenantMembership, getUserTenantMemberships } from "@/lib/tenant/memberships";

export const dynamic = "force-dynamic";

type IntBindingsPageProps = {
  searchParams: Promise<{
    op?: string | string[];
    ok?: string | string[];
    message?: string | string[];
  }>;
};

const normalizeParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? (value[0] ?? "") : (value ?? "");

export default async function IntBindingsPage({ searchParams }: IntBindingsPageProps) {
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

  const definitionsCatalog = await getTenantCustomFieldCatalog(selectedTenantId);
  const bindingsCatalog = await getTenantIntFieldBindingsCatalog(selectedTenantId);

  const definitionOptions = definitionsCatalog.definitions
    .slice()
    .sort((left, right) => left.code.localeCompare(right.code, "it"));

  return (
    <section style={{ display: "grid", gap: "1rem", maxWidth: "1400px" }}>
      <header style={{ display: "grid", gap: "0.35rem" }}>
        <h1 style={{ margin: 0 }}>Configurazione / Campi personalizzati / Binding tecnici (CF-02)</h1>
        <p style={{ margin: 0, color: "#475569" }}>
          Fondazione integrazione tecnica tenant-scoped. Questo slice apre solo il ponte
          applicativo `int_field_bindings` (metadata, direzione, stato e target tecnico), senza
          sincronizzazione ERP reale.
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
          <strong>
            {bindingsCatalog.sourceTables.length > 0
              ? bindingsCatalog.sourceTables.join(", ")
              : "N/D"}
          </strong>
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
          Errore catalogo definizioni custom fields: {definitionsCatalog.error}
        </p>
      ) : null}

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

      {bindingsCatalog.warnings.length > 0 || definitionsCatalog.warnings.length > 0 ? (
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
          {[...definitionsCatalog.warnings, ...bindingsCatalog.warnings].map((warning) => (
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
        <strong>Nuovo binding tecnico (`int_field_bindings`)</strong>
        <form
          method="post"
          action="/api/custom-fields/int-bindings"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(220px, 1fr))",
            gap: "0.65rem",
            alignItems: "end",
          }}
        >
          <label style={{ display: "grid", gap: "0.3rem" }}>
            <span>Code binding</span>
            <input
              name="code"
              required
              placeholder="es. proj_priority_to_b1_udf"
              style={{ padding: "0.5rem" }}
            />
          </label>

          <label style={{ display: "grid", gap: "0.3rem", gridColumn: "span 2" }}>
            <span>Definizione custom field</span>
            <select name="custom_field_definition_id" style={{ padding: "0.5rem" }}>
              {definitionOptions.length > 0 ? (
                definitionOptions.map((definition) => (
                  <option key={definition.definitionId} value={definition.definitionId}>
                    {definition.code} - {definition.label} ({definition.targetLevel})
                  </option>
                ))
              ) : (
                <option value="">Nessuna definizione disponibile</option>
              )}
            </select>
          </label>

          <label style={{ display: "grid", gap: "0.3rem" }}>
            <span>Object type</span>
            <select name="object_type_code" defaultValue={CUSTOM_FIELD_OBJECT_TYPES[0]} style={{ padding: "0.5rem" }}>
              {CUSTOM_FIELD_OBJECT_TYPES.map((objectType) => (
                <option key={objectType} value={objectType}>
                  {objectType}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: "0.3rem" }}>
            <span>Target level</span>
            <select name="target_level" defaultValue={CUSTOM_FIELD_TARGET_LEVELS[0]} style={{ padding: "0.5rem" }}>
              {CUSTOM_FIELD_TARGET_LEVELS.map((targetLevel) => (
                <option key={targetLevel} value={targetLevel}>
                  {targetLevel}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: "0.3rem" }}>
            <span>Line context type (solo line)</span>
            <input
              name="line_context_type"
              placeholder="production_order_phase_materials"
              style={{ padding: "0.5rem" }}
            />
          </label>

          <label style={{ display: "grid", gap: "0.3rem" }}>
            <span>Sistema esterno</span>
            <input
              name="source_system_code"
              defaultValue="sap_b1"
              placeholder="sap_b1"
              style={{ padding: "0.5rem" }}
            />
          </label>

          <label style={{ display: "grid", gap: "0.3rem" }}>
            <span>ERP entity set</span>
            <input
              name="erp_entity_set"
              defaultValue="Items"
              placeholder="Items"
              style={{ padding: "0.5rem" }}
            />
          </label>

          <label style={{ display: "grid", gap: "0.3rem" }}>
            <span>ERP object type</span>
            <input
              name="erp_object_type"
              defaultValue="OITM"
              placeholder="OITM"
              style={{ padding: "0.5rem" }}
            />
          </label>

          <label style={{ display: "grid", gap: "0.3rem" }}>
            <span>ERP field name</span>
            <input
              name="erp_field_name"
              required
              placeholder="U_CF_PRIORITY"
              style={{ padding: "0.5rem" }}
            />
          </label>

          <label style={{ display: "grid", gap: "0.3rem" }}>
            <span>Direction mode</span>
            <select name="direction_mode" defaultValue="read" style={{ padding: "0.5rem" }}>
              {INT_FIELD_BINDING_DIRECTION_MODES.map((directionMode) => (
                <option key={directionMode} value={directionMode}>
                  {directionMode}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: "0.3rem" }}>
            <span>Sync mode</span>
            <select name="sync_mode" defaultValue="manual" style={{ padding: "0.5rem" }}>
              {INT_FIELD_BINDING_SYNC_MODES.map((syncMode) => (
                <option key={syncMode} value={syncMode}>
                  {syncMode}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: "0.3rem" }}>
            <span>Status binding</span>
            <select name="status" defaultValue="draft" style={{ padding: "0.5rem" }}>
              {INT_FIELD_BINDING_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <div style={{ display: "flex", gap: "1rem", alignItems: "center", gridColumn: "1 / span 3" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <input type="hidden" name="is_enabled" value="0" />
              <input type="checkbox" name="is_enabled" value="1" defaultChecked />
              <span>Binding enabled</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <input type="hidden" name="erp_is_udf" value="0" />
              <input type="checkbox" name="erp_is_udf" value="1" defaultChecked />
              <span>Campo ERP UDF</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={definitionOptions.length === 0}
            style={{ padding: "0.6rem 0.8rem", cursor: "pointer", gridColumn: "1 / span 3" }}
          >
            Crea binding tecnico
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
          <strong>Binding tecnici tenant-scoped</strong>
          <p style={{ margin: 0, color: "#475569", fontSize: "0.9rem" }}>
            Layer tecnico di collegamento definizione campo app ↔ target esterno. Nessuna sync
            reale attiva in questo slice.
          </p>
        </header>

        <table style={{ width: "100%", minWidth: "1260px", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {[
                "Code / stato",
                "Campo app",
                "Contesto",
                "Target esterno",
                "Direzione",
                "Audit",
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
            {bindingsCatalog.bindings.map((binding) => (
              <tr key={binding.id}>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ display: "grid", gap: "0.2rem" }}>
                    <strong>{binding.code}</strong>
                    <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                      status: {binding.status} · enabled: {binding.isEnabled ? "si" : "no"}
                    </span>
                  </span>
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ display: "grid", gap: "0.2rem" }}>
                    <strong>{binding.customFieldCode ?? "N/D"}</strong>
                    <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                      {binding.customFieldLabel ?? "Definizione non risolta"}
                    </span>
                    <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                      id: {binding.customFieldDefinitionId}
                    </span>
                  </span>
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ display: "grid", gap: "0.2rem" }}>
                    <span>{binding.objectTypeCode}</span>
                    <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                      {binding.targetLevel}
                      {binding.lineContextType ? `:${binding.lineContextType}` : ""}
                    </span>
                  </span>
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ display: "grid", gap: "0.2rem" }}>
                    <span>{binding.sourceSystemCode}</span>
                    <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                      {binding.erpEntitySet} / {binding.erpObjectType}
                    </span>
                    <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                      {binding.erpFieldName}
                      {binding.erpIsUdf ? " (UDF)" : ""}
                    </span>
                  </span>
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ display: "grid", gap: "0.2rem" }}>
                    <span>{binding.directionMode}</span>
                    <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                      sync: {binding.syncMode}
                    </span>
                  </span>
                </td>
                <td style={{ padding: "0.65rem", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ display: "grid", gap: "0.2rem" }}>
                    <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                      created: {binding.createdAt ?? "N/D"}
                    </span>
                    <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                      updated: {binding.updatedAt ?? "N/D"}
                    </span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {bindingsCatalog.bindings.length === 0 ? (
          <section style={{ margin: 0, padding: "1rem", display: "grid", gap: "0.4rem" }}>
            <strong>Nessun binding tecnico disponibile</strong>
            <p style={{ margin: 0, color: "#475569" }}>
              {bindingsCatalog.emptyStateHint ??
                "Crea il primo binding tecnico per collegare una definizione custom field al target esterno previsto."}
            </p>
          </section>
        ) : null}
      </section>

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
        <Link href="/dashboard">Torna a dashboard</Link>
      </section>
    </section>
  );
}
