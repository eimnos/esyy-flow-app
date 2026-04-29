# CF-02 — Baseline DB `int_field_bindings`

## Scopo

Formalizzare il ponte tecnico tra:

- definizione app-native del custom field (`cfg_custom_field_definitions`)
- contesto applicativo target (`object_type_code`, `target_level`, `line_context_type`)
- sistema esterno target (`source_system_code`)
- identificatore del campo esterno (`external_field_identifier`)

Il binding resta **solo** nel layer `int_*`.

## Regole strutturali

- motore custom fields e valori runtime restano nell'app
- nessuna logica ERP runtime in CF-02
- nessuna sync reale in CF-02
- nessun campo ERP raw nel core domain
- nessuna fusione tra metadata del custom field e binding tecnico

## Tabella

### `int_field_bindings`

Campi chiave:

- `id`
- `tenant_id`
- `custom_field_definition_id`
- `object_type_code`
- `target_level` (`header` / `line`)
- `line_context_type`
- `source_system_code`
- `external_object_type`
- `external_field_identifier`
- `external_field_label`
- `direction_mode` (`read` / `write` / `bidirectional_candidate`)
- `status`
- `created_at`, `updated_at`
- `created_by_user_id`, `updated_by_user_id`
- `row_version`

## Vincoli minimi

1. Un binding tecnico non può essere duplicato per la stessa combinazione:
   - tenant
   - custom field
   - sistema esterno
   - oggetto target
   - livello target
   - contesto riga

2. Lo stesso `external_field_identifier` non può essere duplicato nello stesso tenant per:
   - sistema esterno
   - oggetto target
   - livello target
   - contesto riga

3. Il tenant scope è obbligatorio.

## Esposizione runtime

La tabella viene esposta direttamente al path applicativo già deployato.

Sono incluse policy RLS `SELECT/INSERT/UPDATE/DELETE` coerenti con `tenant_memberships`, così l'accesso autenticato tenant-scoped non dipende da workaround applicativi.

## Confini

Resta fuori dal perimetro CF-02:

- lettura ERP reale
- scrittura ERP reale
- sincronizzazione ERP reale
- mapping payload o run di integrazione avanzata
- tipi complessi o binding multi-riga fuori baseline
