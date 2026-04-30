import {
  getTenantCustomFieldCatalog,
  getTenantCustomFieldValues,
  type CustomFieldObjectType,
  type CustomFieldTargetLevel,
} from "@/lib/domain/custom-fields";

import { ContextualCustomFieldEntry } from "./contextual-custom-field-entry";

type ContextualCustomFieldPanelProps = {
  tenantId: string;
  objectTypeCode: CustomFieldObjectType;
  screenCode: string;
  sectionCode: string;
  contextLabel: string;
  contextDescription: string;
  fieldDomainCode?: string;
  lineContextType?: string;
  allowedTargetLevels: CustomFieldTargetLevel[];
  defaultTargetLevel: CustomFieldTargetLevel;
  valuePreview?: {
    objectTypeCode: CustomFieldObjectType;
    targetLevel: CustomFieldTargetLevel;
    targetRecordId: string;
    targetLineRecordId?: string;
  };
};

const normalizeCode = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_");

const formatValue = (value: string | number | boolean | null) => {
  if (value === null) {
    return "N/D";
  }
  if (typeof value === "boolean") {
    return value ? "Si" : "No";
  }
  return `${value}`;
};

export async function ContextualCustomFieldPanel({
  tenantId,
  objectTypeCode,
  screenCode,
  sectionCode,
  contextLabel,
  contextDescription,
  fieldDomainCode = "production",
  lineContextType,
  allowedTargetLevels,
  defaultTargetLevel,
  valuePreview,
}: ContextualCustomFieldPanelProps) {
  const normalizedScreenCode = normalizeCode(screenCode) || "general";
  const normalizedSectionCode = normalizeCode(sectionCode) || "general";
  const catalog = await getTenantCustomFieldCatalog(tenantId);
  const values = valuePreview
    ? await getTenantCustomFieldValues(tenantId, {
        objectTypeCode: valuePreview.objectTypeCode,
        targetLevel: valuePreview.targetLevel,
        targetRecordId: valuePreview.targetRecordId,
        targetLineRecordId: valuePreview.targetLineRecordId,
      })
    : null;

  const valuesByDefinitionId = new Map(
    (values?.values ?? []).map((item) => [item.customFieldDefinitionId, item.value]),
  );

  const contextualFields = catalog.definitions
    .flatMap((definition) => {
      const matchingBindings = definition.bindings
        .filter((binding) => {
          if (binding.objectTypeCode !== objectTypeCode) {
            return false;
          }
          if (!allowedTargetLevels.includes(binding.targetLevel)) {
            return false;
          }
          if (binding.screenCode !== normalizedScreenCode) {
            return false;
          }
          if (binding.bindingStatus !== "active") {
            return false;
          }
          return true;
        })
        .sort((left, right) => left.sortOrder - right.sortOrder);

      if (matchingBindings.length === 0) {
        return [];
      }

      return [
        {
          definition,
          binding: matchingBindings[0],
          currentValue: valuesByDefinitionId.get(definition.definitionId) ?? null,
        },
      ];
    })
    .sort((left, right) => {
      if (left.binding.targetLevel !== right.binding.targetLevel) {
        return left.binding.targetLevel.localeCompare(right.binding.targetLevel, "it");
      }
      if (left.binding.sortOrder !== right.binding.sortOrder) {
        return left.binding.sortOrder - right.binding.sortOrder;
      }
      return left.definition.label.localeCompare(right.definition.label, "it");
    });

  return (
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
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "0.7rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "grid", gap: "0.2rem" }}>
          <strong>Campi personalizzati contestuali</strong>
          <p style={{ margin: 0, color: "#475569", fontSize: "0.9rem" }}>
            {contextLabel} - {contextDescription}
          </p>
          <p style={{ margin: 0, color: "#334155", fontSize: "0.82rem" }}>
            Screen <strong>{normalizedScreenCode}</strong> - sezione default{" "}
            <strong>{normalizedSectionCode}</strong>.
          </p>
        </div>
        <ContextualCustomFieldEntry
          objectTypeCode={objectTypeCode}
          screenCode={normalizedScreenCode}
          sectionCode={normalizedSectionCode}
          lineContextType={lineContextType}
          fieldDomainCode={fieldDomainCode}
          contextLabel={contextLabel}
          contextDescription={contextDescription}
          allowedTargetLevels={allowedTargetLevels}
          defaultTargetLevel={defaultTargetLevel}
        />
      </header>

      {catalog.error ? (
        <p
          role="alert"
          style={{
            margin: 0,
            border: "1px solid #fecaca",
            borderRadius: "0.6rem",
            background: "#fef2f2",
            color: "#991b1b",
            padding: "0.7rem",
          }}
        >
          {catalog.error}
        </p>
      ) : null}

      <section
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: "0.7rem",
          overflowX: "auto",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "940px" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {[
                "Campo",
                "Tipo",
                "Target",
                "Valore attuale",
                "Default",
                "Posizionamento",
                "Regole",
              ].map((header) => (
                <th
                  key={header}
                  style={{
                    textAlign: "left",
                    padding: "0.6rem",
                    borderBottom: "1px solid #e2e8f0",
                    color: "#334155",
                    fontSize: "0.82rem",
                    letterSpacing: "0.02em",
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {contextualFields.map((item) => (
              <tr key={`${item.definition.definitionId}:${item.binding.id}`}>
                <td style={{ padding: "0.6rem", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ display: "grid", gap: "0.2rem" }}>
                    <strong>{item.definition.label}</strong>
                    <span style={{ fontSize: "0.8rem", color: "#475569" }}>
                      {item.definition.code}
                    </span>
                  </span>
                </td>
                <td style={{ padding: "0.6rem", borderBottom: "1px solid #f1f5f9" }}>
                  {item.definition.fieldType}
                </td>
                <td style={{ padding: "0.6rem", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ display: "grid", gap: "0.2rem" }}>
                    <span>{item.binding.targetLevel}</span>
                    <span style={{ fontSize: "0.8rem", color: "#475569" }}>
                      section: {item.binding.sectionCode}
                    </span>
                    {item.binding.lineContextType ? (
                      <span style={{ fontSize: "0.8rem", color: "#475569" }}>
                        line context: {item.binding.lineContextType}
                      </span>
                    ) : null}
                  </span>
                </td>
                <td style={{ padding: "0.6rem", borderBottom: "1px solid #f1f5f9" }}>
                  {formatValue(item.currentValue)}
                </td>
                <td style={{ padding: "0.6rem", borderBottom: "1px solid #f1f5f9" }}>
                  {item.definition.defaultValue ?? "N/D"}
                </td>
                <td style={{ padding: "0.6rem", borderBottom: "1px solid #f1f5f9" }}>
                  ordine {item.binding.sortOrder}
                </td>
                <td style={{ padding: "0.6rem", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ display: "grid", gap: "0.15rem" }}>
                    <span>required: {item.definition.isRequired ? "Si" : "No"}</span>
                    <span>read-only: {item.definition.isReadOnly ? "Si" : "No"}</span>
                    <span>visibilita: {item.binding.visibilityMode}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {contextualFields.length === 0 ? (
          <section style={{ margin: 0, padding: "0.9rem", display: "grid", gap: "0.35rem" }}>
            <strong>Nessun campo contestuale ancora definito</strong>
            <p style={{ margin: 0, color: "#475569" }}>
              Usa &quot;Aggiungi campo personalizzato&quot; per creare il primo campo nel contesto
              corrente (header/line) mantenendo il motore centralizzato.
            </p>
          </section>
        ) : null}
      </section>
    </section>
  );
}

