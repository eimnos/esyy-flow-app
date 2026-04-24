# DB-CF-01 — Baseline DB campi personalizzati / attributi dinamici tenant-scoped

## Scopo
Definire la baseline DB del motore campi personalizzati come capacità trasversale, metadata-driven e multi-tenant, coerente con DB-00.

## Decisione di base
La soluzione **non** usa colonne fisiche cliente-per-cliente. La capacità viene modellata con:
- metadata/configurazione tenant-scoped in `cfg_*`
- storage valori in tabelle tecniche trasversali dedicate
- eventuali proiezioni/read model solo come layer derivato, non come baseline primaria

## Principi guida applicati
- multi-tenant obbligatorio
- nessuna contaminazione del core domain con colonne custom ad hoc
- naming coerente con DB-00
- versioning esplicito delle definizioni campo
- audit su definizioni, binding, propagazioni e valori
- JSON ammesso solo per metadata realmente destrutturati o snapshot tecnici, non come scorciatoia per valori business filtrabili

---

## 1. Perimetro logico della capacità
La capacità copre:
- definizione del campo custom
- binding del campo a oggetto, schermata, sezione e livello (`header` / `line`)
- memorizzazione del valore
- propagazione tra oggetti/processi
- campi calcolati
- esposizione per ricerca, filtri, report ed etichette
- audit/versioning

Non copre in questa baseline:
- colonne fisiche per tenant
- replica dei campi custom nel core domain
- mapping ERP raw nel dominio applicativo

---

## 2. Architettura dati proposta

### 2.1 Metadata di configurazione

#### `cfg_custom_field_definitions`
Famiglia logica del campo personalizzato.

Uso:
- identifica il campo in modo stabile nel tenant
- mantiene codice business, stato e ownership del campo
- non contiene il dettaglio completo della singola revisione

Campi minimi:
- `id`
- `tenant_id`
- `code`
- `status`
- `field_domain_code` — area logica del campo (`production`, `quality`, `traceability`, ecc.)
- `created_at`, `updated_at`
- `created_by_user_id`, `updated_by_user_id`
- `deleted_at`, `deleted_by_user_id` se soft delete ammesso
- `row_version`

Vincoli:
- `uq_cfg_custom_field_definitions__tenant_id_code`

---

#### `cfg_custom_field_definition_versions`
Versioni della definizione del campo.

Uso:
- rende esplicite modifiche strutturali/semantiche del campo
- blocca storico di etichetta, tipo, regole, default, formula e comportamento

Campi minimi:
- `id`
- `tenant_id`
- `custom_field_definition_id`
- `version_no`
- `status`
- `field_key` — chiave tecnica leggibile e stabile per uso applicativo/UI
- `label`
- `description`
- `field_type` — `text`, `long_text`, `number`, `decimal`, `boolean`, `date`, `datetime`, `select_single`, `select_multi`, `lookup`, `json`
- `target_level` — `header` / `line`
- `storage_mode` — `manual`, `calculated`, `propagated`, `inherited`
- `is_required`
- `is_read_only`
- `is_filterable`
- `is_searchable`
- `is_reportable`
- `is_label_enabled`
- `is_default_visible`
- `is_current`
- `default_value_json` — solo per default strutturati/metadata
- `formula_expression`
- `formula_language`
- `valid_from`, `valid_to`
- `created_at`, `updated_at`
- `created_by_user_id`, `updated_by_user_id`

Vincoli:
- `uq_cfg_custom_field_definition_versions__custom_field_definition_id_version_no`

Nota:
- `formula_expression` è ammessa come metadata configurativo, non come sostituto del valore.

---

#### `cfg_custom_field_version_bindings`
Binding della versione del campo a oggetto/schermata/sezione.

Uso:
- decide dove il campo compare e in quale livello
- separa chiaramente definizione del campo da posizionamento UI/processo

Campi minimi:
- `id`
- `tenant_id`
- `custom_field_definition_version_id`
- `object_type_code` — oggetto supportato (`products`, `projects`, `production_orders`, `bom_templates`, ecc.)
- `screen_code` — pagina/contesto applicativo
- `section_code` — sezione logica UI/operativa
- `target_level`
- `line_context_type` — opzionale per binding a righe (`production_order_lines`, `bom_template_version_lines`, ecc.)
- `sort_order`
- `visibility_mode`
- `editability_mode`
- `requiredness_mode`
- `binding_status`
- `created_at`, `updated_at`
- `created_by_user_id`, `updated_by_user_id`

Vincoli:
- `uq_cfg_custom_field_version_bindings__tenant_id_version_object_screen_section_level`

Regola:
- `object_type_code` e `line_context_type` devono essere presi da catalogo chiuso applicativo, non da stringhe libere scritte dal tenant.

---

#### `cfg_custom_field_propagation_rules`
Regole di propagazione tra oggetti/processi.

Uso:
- copia/deriva valori tra oggetti collegati (es. da commessa a ODP, da ODP a fase, da articolo a modello)

Campi minimi:
- `id`
- `tenant_id`
- `source_custom_field_definition_version_id`
- `source_object_type_code`
- `target_object_type_code`
- `target_custom_field_definition_id` — opzionale se il target è un altro campo dedicato
- `propagation_mode` — `copy_once`, `copy_if_empty`, `synchronize`, `derive`
- `trigger_event_code`
- `overwrite_mode`
- `transformation_expression`
- `rule_status`
- `created_at`, `updated_at`
- `created_by_user_id`, `updated_by_user_id`

Nota:
- la propagazione è metadata-driven e non introduce FK ERP o mapping esterni nel core domain.

---

### 2.2 Storage valori

#### `custom_field_values`
Tabella primaria dei valori risolti dei campi custom.

Uso:
- memorizza il valore effettivo associato a un record di dominio
- supporta sia testata sia righe
- conserva il riferimento alla versione della definizione usata al momento della scrittura

Campi minimi:
- `id`
- `tenant_id`
- `custom_field_definition_id`
- `custom_field_definition_version_id`
- `object_type_code`
- `target_record_id`
- `target_level`
- `target_line_record_id` — nullable; obbligatorio se `target_level = 'line'`
- `value_text`
- `value_number`
- `value_boolean`
- `value_date`
- `value_datetime`
- `value_json`
- `value_search_text` — copia normalizzata per ricerche testuali
- `value_source_type` — `manual`, `calculated`, `propagated`, `imported`
- `effective_from`, `effective_to`
- `created_at`, `updated_at`
- `created_by_user_id`, `updated_by_user_id`
- `row_version`

Vincoli:
- una sola colonna valore “business” valorizzata coerentemente con `field_type`
- `uq_custom_field_values__tenant_target_field_scope`
  su (`tenant_id`, `custom_field_definition_id`, `object_type_code`, `target_record_id`, `target_line_record_id`)

Regola:
- `target_record_id` e `target_line_record_id` referenziano entità core tramite chiavi tecniche applicative UUID; non si memorizzano chiavi ERP raw.

---

#### `custom_field_value_events`
Audit append-only dei cambi valore.

Uso:
- traccia creazione, update, ricalcolo, propagazione, invalidazione

Campi minimi:
- `id`
- `tenant_id`
- `custom_field_value_id`
- `event_type`
- `old_value_json`
- `new_value_json`
- `event_reason`
- `source_event_code`
- `created_at`
- `created_by_user_id`

Nota:
- qui il JSON è ammesso come snapshot tecnico di audit.

---

### 2.3 Layer derivato per filtri/report/etichette

#### `custom_field_resolved_values`
View o materialized view opzionale.

Uso:
- read model tecnico per:
  - filtri
  - ricerca
  - report
  - etichette
  - export

Contenuto atteso:
- `tenant_id`
- `object_type_code`
- `target_record_id`
- `target_line_record_id`
- `custom_field_definition_id`
- `field_key`
- `label`
- `field_type`
- `value_as_text`
- `value_as_number`
- `value_as_date`
- `is_filterable`
- `is_searchable`
- `is_reportable`
- `is_label_enabled`

Regola:
- non è baseline primaria del dato; è solo una proiezione derivata.

---

## 3. Header vs righe
La baseline supporta nativamente due livelli:
- `header` — valore legato all’oggetto principale (`projects`, `production_orders`, `products`, ecc.)
- `line` — valore legato a una riga o figlio reale (`production_order_lines`, `bom_template_version_lines`, `routing_template_version_steps`, ecc.)

Scelta DB:
- un’unica tabella `custom_field_values`
- `target_level` obbligatorio
- `target_line_record_id` valorizzato solo per `line`
- `line_context_type` governato nei binding metadata

Motivazione:
- evita tabelle duplicate cliente-per-cliente
- mantiene queryabilità e controllo forte sul perimetro dei target

---

## 4. Campi calcolati
Supporto V1 previsto con due modalità:

### 4.1 Calcolati virtuali
- formula definita nella versione del campo
- valore calcolato on read
- nessuna persistenza obbligatoria del risultato
- adatti a UI e preview

### 4.2 Calcolati persistiti
- valore risolto scritto in `custom_field_values`
- `value_source_type = 'calculated'`
- utile per report, ricerca, filtri, etichette ed export

Regola di baseline:
- se il campo calcolato è **filterable**, **reportable**, **label-enabled** o usato in export massivi, la modalità raccomandata è **persistita**

---

## 5. Propagazione
La propagazione non avviene copiando strutture fisiche tra tabelle core.
Avviene tramite:
- regola metadata in `cfg_custom_field_propagation_rules`
- scrittura del valore target in `custom_field_values`
- audit in `custom_field_value_events`

Esempi ammessi:
- da `projects` a `production_orders`
- da `products` a `production_models`
- da `production_orders` a `production_order_phases`

Esempi non ammessi:
- copia di chiavi ERP raw nel core domain
- generazione automatica di nuove colonne fisiche

---

## 6. Tenant scope e confini

### 6.1 Tenant scope
Obbligatorio su:
- `cfg_custom_field_definitions`
- `cfg_custom_field_definition_versions`
- `cfg_custom_field_version_bindings`
- `cfg_custom_field_propagation_rules`
- `custom_field_values`
- `custom_field_value_events`

Unique e indici devono avere `tenant_id` come leading key quando il record è tenant-scoped.

### 6.2 Confine core / metadata / integrazione
- **Core domain**: nessuna colonna custom ad hoc sulle tabelle core
- **Metadata/configurazione**: `cfg_custom_field_*`
- **Runtime values**: `custom_field_values`, `custom_field_value_events`
- **Integrazione**: eventuali mapping ERP restano nel layer `int_*`; il motore custom fields non deve diventare scorciatoia per portare chiavi esterne nel dominio

---

## 7. Impatto su report, etichette, ricerca e filtri

### Report
- leggere da `custom_field_resolved_values` oppure da join tra definizioni + valori
- usare solo campi con `is_reportable = true`

### Etichette
- usare solo campi con `is_label_enabled = true`
- recupero valore tramite binding al contesto record corrente

### Ricerca full-text / filtri
- usare `value_search_text` e/o la view `custom_field_resolved_values`
- i campi filterable devono avere strategia indicizzazione coerente col tipo (`text`, `number`, `date`, `boolean`)

### Export
- export metadata-driven basato su binding e flag `is_reportable`

---

## 8. Audit e versioning

### Audit obbligatorio
- creazione/modifica disattivazione campo
- cambi binding
- cambi regole di propagazione
- creazione/modifica valore
- ricalcolo campi calcolati persistiti

### Versioning obbligatorio
Serve nuova versione quando cambiano almeno uno dei seguenti:
- tipo campo
- livello `header/line`
- formula
- default strutturale
- comportamento di visibilità/editabilità/requiredness sostanziale
- semantica di propagazione

Update diretto ammesso solo per:
- label
- help text
- descrizioni non strutturali
- ordine di visualizzazione non storicizzato

---

## 9. Catalogo minimo oggetti supportabili in V1
La baseline DB è generica, ma l’attivazione deve avvenire per catalogo chiuso.

Oggetti plausibili V1:
- `products`
- `projects`
- `production_orders`
- `production_order_lines`
- `production_order_phases`
- `bom_templates`
- `bom_template_versions`
- `bom_template_version_lines`
- `routing_templates`
- `routing_template_versions`
- `routing_template_version_steps`
- `production_models`
- `production_model_versions`

Regola:
- l’abilitazione di un nuovo `object_type_code` richiede validazione DB preventiva

---

## 10. Baseline SQL minima consigliata
La baseline può partire con queste tabelle:
- `cfg_custom_field_definitions`
- `cfg_custom_field_definition_versions`
- `cfg_custom_field_version_bindings`
- `cfg_custom_field_propagation_rules`
- `custom_field_values`
- `custom_field_value_events`
- `custom_field_resolved_values` (view/materialized view, opzionale ma consigliata)

---

## 11. Decisioni già congelate con questo deliverable
- metadata-driven, non colonne fisiche per tenant
- multi-tenant obbligatorio
- core domain pulito
- versioning esplicito delle definizioni
- supporto nativo `header` / `line`
- propagazione governata da regole dedicate
- campi calcolati supportati
- audit separato e append-only sui valori
- read model solo derivato

---

## 12. Indicazioni per i team
### Per Ole
- integrare i vincoli ERP solo via layer `int_*`
- nessun mapping ERP raw nelle definizioni del motore custom fields

### Per Marit
- wizard guidato da `cfg_custom_field_definition_versions` + `cfg_custom_field_version_bindings`
- supportare chiaramente livello, contesto, visibilità, editabilità, formula e propagazione

### Per Isabell
- implementazione V1 centrata su metadata + storage valori + read model
- nessuna colonna fisica customer-specific
- attivazione degli oggetti tramite catalogo chiuso
