"use client";

import { useEffect, useMemo, useState } from "react";

type TargetLevel = "header" | "line";

const V1_FIELD_TYPES = [
  { value: "text_short", label: "Testo breve" },
  { value: "text_medium", label: "Testo medio/lungo" },
  { value: "integer", label: "Numero intero" },
  { value: "decimal", label: "Numero decimale" },
  { value: "boolean", label: "Booleano (si/no)" },
  { value: "date", label: "Data" },
  { value: "single_select_enum", label: "Selezione singola" },
] as const;

type FieldType = (typeof V1_FIELD_TYPES)[number]["value"];

type PositionMode = "start" | "after_standard" | "end" | "custom";

type ContextualCustomFieldEntryProps = {
  objectTypeCode: string;
  screenCode: string;
  sectionCode: string;
  lineContextType?: string;
  fieldDomainCode?: string;
  contextLabel: string;
  contextDescription: string;
  allowedTargetLevels: TargetLevel[];
  defaultTargetLevel: TargetLevel;
};

const normalizeCode = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_");

const deriveSortOrder = (mode: PositionMode, customSortOrder: number) => {
  if (mode === "start") {
    return 20;
  }
  if (mode === "after_standard") {
    return 100;
  }
  if (mode === "end") {
    return 900;
  }
  return Math.max(1, Math.min(10000, Math.trunc(customSortOrder || 100)));
};

const displayModeToPayload = (mode: "editable" | "read_only" | "hidden") => ({
  visibilityMode: mode === "hidden" ? "hidden" : "visible",
  editabilityMode: mode === "read_only" ? "read_only" : "editable",
  isDefaultVisible: mode !== "hidden",
});

export function ContextualCustomFieldEntry({
  objectTypeCode,
  screenCode,
  sectionCode,
  lineContextType,
  fieldDomainCode = "production",
  contextLabel,
  contextDescription,
  allowedTargetLevels,
  defaultTargetLevel,
}: ContextualCustomFieldEntryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [targetLevel, setTargetLevel] = useState<TargetLevel>(defaultTargetLevel);
  const [label, setLabel] = useState("");
  const [code, setCode] = useState("");
  const [codeTouched, setCodeTouched] = useState(false);
  const [fieldType, setFieldType] = useState<FieldType>("text_short");
  const [description, setDescription] = useState("");
  const [isRequired, setIsRequired] = useState(false);
  const [displayMode, setDisplayMode] = useState<"editable" | "read_only" | "hidden">("editable");
  const [defaultValue, setDefaultValue] = useState("");
  const [enumOptionsText, setEnumOptionsText] = useState("");
  const [baseSectionCode, setBaseSectionCode] = useState(sectionCode);
  const [groupCode, setGroupCode] = useState("");
  const [positionMode, setPositionMode] = useState<PositionMode>("after_standard");
  const [customSortOrder, setCustomSortOrder] = useState(100);
  const [plannedForCalculated, setPlannedForCalculated] = useState(false);

  useEffect(() => {
    if (!codeTouched) {
      setCode(normalizeCode(label));
    }
  }, [label, codeTouched]);

  const resolvedSectionCode = useMemo(() => {
    const section = normalizeCode(baseSectionCode) || "general";
    const group = normalizeCode(groupCode);
    if (!group) {
      return section;
    }
    return `${section}_${group}`;
  }, [baseSectionCode, groupCode]);

  const resolvedSortOrder = useMemo(
    () => deriveSortOrder(positionMode, customSortOrder),
    [positionMode, customSortOrder],
  );

  const canContinue =
    step === 1
      ? allowedTargetLevels.includes(targetLevel)
      : step === 2
        ? normalizeCode(code).length > 0 && label.trim().length > 0
        : step === 3
          ? fieldType !== "single_select_enum" || enumOptionsText.trim().length > 0
          : step === 4
            ? resolvedSectionCode.length > 0
            : true;

  const resetLocalState = () => {
    setStep(1);
    setTargetLevel(defaultTargetLevel);
    setLabel("");
    setCode("");
    setCodeTouched(false);
    setFieldType("text_short");
    setDescription("");
    setIsRequired(false);
    setDisplayMode("editable");
    setDefaultValue("");
    setEnumOptionsText("");
    setBaseSectionCode(sectionCode);
    setGroupCode("");
    setPositionMode("after_standard");
    setCustomSortOrder(100);
    setPlannedForCalculated(false);
    setError("");
    setSuccess("");
  };

  const open = () => {
    resetLocalState();
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setError("");
  };

  const submit = async () => {
    const normalizedCode = normalizeCode(code);
    if (!normalizedCode || !label.trim()) {
      setError("Nome campo e codice sono obbligatori.");
      return;
    }

    if (targetLevel === "line" && !lineContextType) {
      setError("Il contesto line richiede line_context_type configurato.");
      return;
    }

    const { visibilityMode, editabilityMode, isDefaultVisible } = displayModeToPayload(displayMode);
    const payload = {
      code: normalizedCode,
      label: label.trim(),
      description: description.trim(),
      field_type: fieldType,
      target_level: targetLevel,
      object_type_code: objectTypeCode,
      screen_code: screenCode,
      section_code: resolvedSectionCode,
      line_context_type: targetLevel === "line" ? lineContextType ?? "" : "",
      field_domain_code: fieldDomainCode,
      is_required: isRequired,
      is_read_only: displayMode === "read_only",
      is_filterable: false,
      is_searchable: true,
      is_reportable: false,
      is_default_visible: isDefaultVisible,
      visibility_mode: visibilityMode,
      editability_mode: editabilityMode,
      requiredness_mode: isRequired ? "required" : "optional",
      default_value: defaultValue.trim(),
      enum_options: enumOptionsText,
      sort_order: resolvedSortOrder,
    };

    setIsSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/custom-fields/definitions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok || result.error) {
        setError(result.error ?? "Creazione campo non riuscita.");
        return;
      }
      setSuccess("Campo creato. Aggiorno la pagina per mostrare il risultato nel contesto.");
      window.setTimeout(() => {
        window.location.reload();
      }, 650);
    } catch {
      setError("Errore di rete durante la creazione del campo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        style={{
          border: "1px solid #0f172a",
          background: "#0f172a",
          color: "#fff",
          borderRadius: "0.55rem",
          padding: "0.5rem 0.75rem",
          cursor: "pointer",
        }}
      >
        Aggiungi campo personalizzato
      </button>

      {isOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2,6,23,0.5)",
            display: "flex",
            justifyContent: "flex-end",
            zIndex: 120,
          }}
        >
          <div
            style={{
              width: "min(840px, 100%)",
              height: "100%",
              overflowY: "auto",
              background: "#ffffff",
              borderLeft: "1px solid #cbd5e1",
              padding: "1rem",
              display: "grid",
              gap: "0.9rem",
              alignContent: "start",
            }}
          >
            <header style={{ display: "grid", gap: "0.35rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.8rem" }}>
                <h2 style={{ margin: 0 }}>Nuovo campo personalizzato contestuale</h2>
                <button
                  type="button"
                  onClick={close}
                  style={{
                    border: "1px solid #cbd5e1",
                    background: "#fff",
                    borderRadius: "0.45rem",
                    padding: "0.3rem 0.55rem",
                    cursor: "pointer",
                  }}
                >
                  Chiudi
                </button>
              </div>
              <p style={{ margin: 0, color: "#475569" }}>
                {contextLabel} - {contextDescription}
              </p>
              <p style={{ margin: 0, color: "#334155", fontSize: "0.88rem" }}>
                Step {step}/5 - creato nel motore centrale custom fields, con ingresso contestuale
                dalla pagina corrente.
              </p>
            </header>

            {error ? (
              <p
                role="alert"
                style={{
                  margin: 0,
                  border: "1px solid #fecaca",
                  borderRadius: "0.55rem",
                  background: "#fef2f2",
                  color: "#991b1b",
                  padding: "0.65rem",
                }}
              >
                {error}
              </p>
            ) : null}

            {success ? (
              <p
                role="status"
                style={{
                  margin: 0,
                  border: "1px solid #86efac",
                  borderRadius: "0.55rem",
                  background: "#f0fdf4",
                  color: "#166534",
                  padding: "0.65rem",
                }}
              >
                {success}
              </p>
            ) : null}

            {step === 1 ? (
              <section style={{ display: "grid", gap: "0.55rem" }}>
                <strong>Step 1 - Contesto e target</strong>
                <label style={{ display: "grid", gap: "0.25rem" }}>
                  <span>Target del campo</span>
                  <select
                    value={targetLevel}
                    onChange={(event) => setTargetLevel(event.target.value as TargetLevel)}
                    disabled={allowedTargetLevels.length === 1}
                    style={{ padding: "0.5rem" }}
                  >
                    {allowedTargetLevels.map((item) => (
                      <option key={item} value={item}>
                        {item === "header" ? "Header (testata oggetto)" : "Line (riga contesto)"}
                      </option>
                    ))}
                  </select>
                </label>
                <div
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.55rem",
                    background: "#f8fafc",
                    padding: "0.6rem",
                    display: "grid",
                    gap: "0.2rem",
                    fontSize: "0.9rem",
                  }}
                >
                  <span>
                    <strong>Oggetto:</strong> {objectTypeCode}
                  </span>
                  <span>
                    <strong>Schermata:</strong> {screenCode}
                  </span>
                  <span>
                    <strong>Sezione proposta:</strong> {resolvedSectionCode}
                  </span>
                  <span>
                    <strong>Livello:</strong> {targetLevel}
                  </span>
                </div>
              </section>
            ) : null}

            {step === 2 ? (
              <section style={{ display: "grid", gap: "0.55rem" }}>
                <strong>Step 2 - Definizione base</strong>
                <label style={{ display: "grid", gap: "0.25rem" }}>
                  <span>Nome campo</span>
                  <input
                    value={label}
                    onChange={(event) => setLabel(event.target.value)}
                    placeholder="Es. Priorita cliente"
                    style={{ padding: "0.5rem" }}
                  />
                </label>
                <label style={{ display: "grid", gap: "0.25rem" }}>
                  <span>Codice tecnico</span>
                  <input
                    value={code}
                    onChange={(event) => {
                      setCodeTouched(true);
                      setCode(event.target.value);
                    }}
                    placeholder="priorita_cliente"
                    style={{ padding: "0.5rem" }}
                  />
                </label>
                <label style={{ display: "grid", gap: "0.25rem" }}>
                  <span>Tipo campo</span>
                  <select
                    value={fieldType}
                    onChange={(event) => setFieldType(event.target.value as FieldType)}
                    style={{ padding: "0.5rem" }}
                  >
                    {V1_FIELD_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ display: "grid", gap: "0.25rem" }}>
                  <span>Help/descrizione breve (opzionale)</span>
                  <input
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Usato per distinguere priorita operative cliente"
                    style={{ padding: "0.5rem" }}
                  />
                </label>
                {fieldType === "single_select_enum" ? (
                  <label style={{ display: "grid", gap: "0.25rem" }}>
                    <span>Valori lista (1 per riga)</span>
                    <textarea
                      rows={4}
                      value={enumOptionsText}
                      onChange={(event) => setEnumOptionsText(event.target.value)}
                      placeholder={"alta\nmedia\nbassa"}
                      style={{ padding: "0.5rem" }}
                    />
                  </label>
                ) : null}
              </section>
            ) : null}

            {step === 3 ? (
              <section style={{ display: "grid", gap: "0.55rem" }}>
                <strong>Step 3 - Regole base</strong>
                <label style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={isRequired}
                    onChange={(event) => setIsRequired(event.target.checked)}
                  />
                  <span>Campo obbligatorio</span>
                </label>
                <label style={{ display: "grid", gap: "0.25rem" }}>
                  <span>Visibilita / editabilita</span>
                  <select
                    value={displayMode}
                    onChange={(event) =>
                      setDisplayMode(event.target.value as "editable" | "read_only" | "hidden")
                    }
                    style={{ padding: "0.5rem" }}
                  >
                    <option value="editable">Visibile e modificabile</option>
                    <option value="read_only">Visibile sola lettura</option>
                    <option value="hidden">Nascosto di default</option>
                  </select>
                </label>
                <label style={{ display: "grid", gap: "0.25rem" }}>
                  <span>Valore di default (semplice)</span>
                  <input
                    value={defaultValue}
                    onChange={(event) => setDefaultValue(event.target.value)}
                    placeholder="Es. media / 0 / true / 2026-05-01"
                    style={{ padding: "0.5rem" }}
                  />
                </label>
                <label style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={plannedForCalculated}
                    onChange={(event) => setPlannedForCalculated(event.target.checked)}
                  />
                  <span>Segna come candidato a calcolo/query guidata (placeholder V1)</span>
                </label>
              </section>
            ) : null}

            {step === 4 ? (
              <section style={{ display: "grid", gap: "0.55rem" }}>
                <strong>Step 4 - Sezione, gruppo, ordinamento</strong>
                <label style={{ display: "grid", gap: "0.25rem" }}>
                  <span>Sezione base</span>
                  <input
                    value={baseSectionCode}
                    onChange={(event) => setBaseSectionCode(event.target.value)}
                    style={{ padding: "0.5rem" }}
                  />
                </label>
                <label style={{ display: "grid", gap: "0.25rem" }}>
                  <span>Gruppo (opzionale)</span>
                  <input
                    value={groupCode}
                    onChange={(event) => setGroupCode(event.target.value)}
                    placeholder="Es. controllo_cliente"
                    style={{ padding: "0.5rem" }}
                  />
                </label>
                <label style={{ display: "grid", gap: "0.25rem" }}>
                  <span>Posizionamento</span>
                  <select
                    value={positionMode}
                    onChange={(event) => setPositionMode(event.target.value as PositionMode)}
                    style={{ padding: "0.5rem" }}
                  >
                    <option value="start">Inizio sezione</option>
                    <option value="after_standard">Dopo campi standard</option>
                    <option value="end">Fine sezione</option>
                    <option value="custom">Ordinamento custom</option>
                  </select>
                </label>
                {positionMode === "custom" ? (
                  <label style={{ display: "grid", gap: "0.25rem" }}>
                    <span>Ordine numerico</span>
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      value={customSortOrder}
                      onChange={(event) => setCustomSortOrder(Number(event.target.value))}
                      style={{ padding: "0.5rem" }}
                    />
                  </label>
                ) : null}
                <p style={{ margin: 0, color: "#475569", fontSize: "0.88rem" }}>
                  Sezione finale: <strong>{resolvedSectionCode}</strong> - sort order:{" "}
                  <strong>{resolvedSortOrder}</strong>
                </p>
              </section>
            ) : null}

            {step === 5 ? (
              <section style={{ display: "grid", gap: "0.55rem" }}>
                <strong>Step 5 - Conferma</strong>
                <div
                  style={{
                    border: "1px solid #d1d5db",
                    borderRadius: "0.6rem",
                    background: "#fff",
                    padding: "0.7rem",
                    display: "grid",
                    gap: "0.25rem",
                    fontSize: "0.9rem",
                  }}
                >
                  <span>
                    <strong>Campo:</strong> {label || "N/D"} ({normalizeCode(code) || "N/D"})
                  </span>
                  <span>
                    <strong>Tipo:</strong> {fieldType}
                  </span>
                  <span>
                    <strong>Target:</strong> {targetLevel}
                  </span>
                  <span>
                    <strong>Visibilita:</strong> {displayMode}
                  </span>
                  <span>
                    <strong>Default:</strong> {defaultValue || "N/D"}
                  </span>
                  <span>
                    <strong>Sezione/gruppo:</strong> {resolvedSectionCode}
                  </span>
                  <span>
                    <strong>Ordine:</strong> {resolvedSortOrder}
                  </span>
                  <span>
                    <strong>Contesto:</strong> {objectTypeCode} / {screenCode}
                  </span>
                  {plannedForCalculated ? (
                    <span>
                      <strong>Nota:</strong> marcato come candidato per calcolo/query guidata
                      futura.
                    </span>
                  ) : null}
                </div>
                <p style={{ margin: 0, color: "#475569", fontSize: "0.88rem" }}>
                  Dopo la creazione puoi rifinire regole avanzate da
                  {" /configurazione/campi-personalizzati"}.
                </p>
              </section>
            ) : null}

            <footer
              style={{
                borderTop: "1px solid #e2e8f0",
                paddingTop: "0.8rem",
                display: "flex",
                justifyContent: "space-between",
                gap: "0.6rem",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={() => setStep((previous) => Math.max(1, previous - 1))}
                disabled={step === 1 || isSubmitting}
                style={{ padding: "0.5rem 0.7rem", cursor: "pointer" }}
              >
                Indietro
              </button>
              <div style={{ display: "flex", gap: "0.55rem" }}>
                {step < 5 ? (
                  <button
                    type="button"
                    onClick={() => setStep((previous) => Math.min(5, previous + 1))}
                    disabled={!canContinue || isSubmitting}
                    style={{ padding: "0.5rem 0.7rem", cursor: "pointer" }}
                  >
                    Avanti
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={submit}
                    disabled={!canContinue || isSubmitting}
                    style={{
                      padding: "0.5rem 0.8rem",
                      cursor: "pointer",
                      border: "1px solid #0f172a",
                      background: "#0f172a",
                      color: "#fff",
                    }}
                  >
                    {isSubmitting ? "Creazione..." : "Crea campo contestuale"}
                  </button>
                )}
              </div>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
}

