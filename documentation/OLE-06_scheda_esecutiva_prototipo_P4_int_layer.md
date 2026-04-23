# OLE-06 — Scheda esecutiva prototipo P4
## Chiavi di riconciliazione e schema `int_*`

## 1. Scopo del prototipo

Usare l’esito reale di **P1 — ODP bidirezionali** per congelare il primo nucleo strutturale del layer `int_*`, evitando che chiavi ERP, log tecnici, run di sincronizzazione e riferimenti esterni finiscano nel core domain. Il progetto mantiene una linea **app-centrica**, con ERP integrato ma non dominante, e demanda esplicitamente al workstream integrazioni chiavi di riconciliazione, idempotenza, retry, code e fallback manuali. fileciteturn13file19 fileciteturn13file12

Il prototipo P4 non serve a testare il Service Layer in sé. Serve invece a fissare:
- quali entità minime devono vivere nel layer `int_*`;
- quali chiavi devono restare nel dominio core e quali nel perimetro integrazione;
- quale struttura minima deve usare Isabell in applicazione e quale deve usare Nikolay in DB;
- quale regola impedisce da subito di introdurre dipendenze sbagliate fra `production_orders` e riferimenti ERP.

## 2. Entità minime da coprire nel layer `int_*`

### 2.1 Entità obbligatorie subito

1. **`int_external_links`**
   - tabella di riconciliazione fra oggetti applicativi e oggetti esterni;
   - è la tabella chiave del prototipo P4;
   - deve supportare già il caso P1 su `production_orders`.

2. **`int_sync_runs`**
   - testata di esecuzione di un run di sincronizzazione;
   - rappresenta il contenitore tecnico di una prova, batch, job schedulato o esecuzione manuale;
   - separa il concetto di “run” dal singolo messaggio o singolo oggetto sincronizzato.

3. **`int_message_logs`**
   - log tecnico dei singoli messaggi o tentativi;
   - collega payload, esito, codice errore, oggetto target e run;
   - serve a supportare audit integrazione, troubleshooting e decisioni di retry.

### 2.2 Entità opzionali ma già previste

4. **`int_endpoint_configs`** oppure configurazione equivalente
   - non obbligatoria in P4;
   - utile se si vuole separare configurazioni endpoint/tenant già in questa fase.

5. **`int_object_mappings`**
   - non obbligatoria subito se `int_external_links` copre il bisogno;
   - utile più avanti per scenari multi-ERP o multi-oggetto più ricchi.

## 3. Chiavi applicative vs chiavi ERP da distinguere

DB-00 impone che la PK tecnica sia sempre `id`, che le FK applicative puntino sempre alla chiave tecnica, che `tenant_id` sia presente su tutte le tabelle tenant-scoped e che eventuali ID esterni multipli vengano gestiti in `int_external_links` invece che sparsi nel core domain. fileciteturn13file1 fileciteturn13file4 fileciteturn13file10

### 3.1 Chiavi applicative

Per l’oggetto ODP applicativo:
- `production_orders.id` → PK tecnica interna UUID
- `production_orders.tenant_id` → scope tenant
- `production_orders.document_no` → eventuale numerazione applicativa leggibile

Queste chiavi restano **core domain**.

### 3.2 Chiavi ERP emerse da P1

Nel prototipo P1 sono emerse in modo stabile queste chiavi ERP:
- `AbsoluteEntry = 3585`
- `DocumentNumber = 2026230060`
- `Series = 138`

Decisione strutturale:
- **`AbsoluteEntry`** = chiave ERP tecnica primaria di riconciliazione per ODP SAP B1;
- **`DocumentNumber`** = riferimento leggibile ERP, utile a UI, audit e debug;
- **`Series`** = metadato ERP di supporto, non sufficiente da solo come chiave.

### 3.3 Regola vincolante

Nel core domain:
- **non** aggiungere colonne come `sap_docentry`, `sap_document_number`, `sap_series` dentro `production_orders`;
- **non** usare `DocumentNumber` come FK interna;
- **non** usare `DocumentNumber` o `Series` come surrogate key applicativa.

Nel layer `int_*`:
- conservare `external_id = '3585'` come riferimento tecnico primario SAP;
- conservare `external_document_no = '2026230060'` come riferimento leggibile;
- conservare `external_series = '138'` come dato di supporto.

## 4. Struttura minima delle tabelle

## 4.1 `int_external_links`

### Scopo
Tabella di mapping e riconciliazione fra oggetto core e oggetto ERP.

### Struttura minima proposta

| Campo | Tipo logico | Note |
| --- | --- | --- |
| `id` | UUID | PK tecnica |
| `tenant_id` | UUID | obbligatorio, tenant-scoped |
| `source_system` | text | es. `sap_b1` |
| `entity_type` | text | es. `production_order` |
| `internal_entity_id` | UUID | FK verso `production_orders.id` |
| `external_object_type` | text | es. `ProductionOrders` |
| `external_id` | text | per P1 = `AbsoluteEntry` |
| `external_document_no` | text nullable | per P1 = `DocumentNumber` |
| `external_series` | text nullable | per P1 = `Series` |
| `link_status` | text | es. `linked`, `pending`, `broken`, `archived` |
| `is_primary` | boolean | default `true` per primo link valido |
| `last_seen_at` | timestamptz | ultima conferma lettura da ERP |
| `created_at` | timestamptz | audit base |
| `updated_at` | timestamptz | audit base |
| `created_by_user_id` | UUID nullable | audit |
| `updated_by_user_id` | UUID nullable | audit |
| `row_version` | bigint | concorrenza ottimistica |

### Unique key minime

1. `uq_int_external_links__tenant_id_source_system_entity_type_internal_entity_id`
   - evita duplicazione dello stesso legame applicativo primario;
   - utile quando si consente un solo link principale per oggetto/ERP.

2. `uq_int_external_links__tenant_id_source_system_external_object_type_external_id`
   - impedisce di collegare lo stesso `AbsoluteEntry` a due oggetti interni diversi dello stesso tenant.

### Indici minimi

- `ix_int_external_links__tenant_id_entity_type_internal_entity_id`
- `ix_int_external_links__tenant_id_source_system_external_id`
- `ix_int_external_links__tenant_id_link_status`

## 4.2 `int_sync_runs`

### Scopo
Rappresentare un run di sincronizzazione o prototipo eseguito.

### Struttura minima proposta

| Campo | Tipo logico | Note |
| --- | --- | --- |
| `id` | UUID | PK tecnica |
| `tenant_id` | UUID | obbligatorio per run tenant-specifici |
| `source_system` | text | es. `sap_b1` |
| `integration_area` | text | es. `production_orders` |
| `run_type` | text | `manual`, `scheduled`, `prototype`, `retry` |
| `triggered_by_user_id` | UUID nullable | chi ha lanciato il run |
| `status` | text | `running`, `completed`, `completed_with_warnings`, `failed` |
| `started_at` | timestamptz | inizio run |
| `finished_at` | timestamptz nullable | fine run |
| `total_messages` | integer | conteggio tecnico |
| `successful_messages` | integer | conteggio tecnico |
| `failed_messages` | integer | conteggio tecnico |
| `warning_messages` | integer | conteggio tecnico |
| `notes` | text nullable | nota operativa |
| `created_at` | timestamptz | audit base |
| `updated_at` | timestamptz | audit base |

### Unique key / vincoli minimi

Nessuna unique business complessa è obbligatoria in P4. Basta:
- `pk_int_sync_runs`
- check semplice sullo `status`, se già gestito a livello DB.

### Indici minimi

- `ix_int_sync_runs__tenant_id_integration_area_started_at`
- `ix_int_sync_runs__tenant_id_status_started_at`

## 4.3 `int_message_logs`

### Scopo
Tracciare i singoli messaggi, request/response e tentativi associati a un run.

### Struttura minima proposta

| Campo | Tipo logico | Note |
| --- | --- | --- |
| `id` | UUID | PK tecnica |
| `tenant_id` | UUID | obbligatorio |
| `int_sync_run_id` | UUID | FK verso `int_sync_runs.id` |
| `source_system` | text | es. `sap_b1` |
| `integration_area` | text | es. `production_orders` |
| `entity_type` | text | es. `production_order` |
| `internal_entity_id` | UUID nullable | se noto |
| `external_object_type` | text nullable | es. `ProductionOrders` |
| `external_id` | text nullable | per P1 = `3585` |
| `message_direction` | text | `outbound`, `inbound` |
| `message_type` | text | `request`, `response`, `event`, `validation` |
| `status` | text | `success`, `warning`, `error` |
| `http_method` | text nullable | `POST`, `GET`, `PATCH` |
| `endpoint_path` | text nullable | es. `/ProductionOrders(3585)` |
| `http_status_code` | integer nullable | es. `201`, `200`, `204` |
| `request_payload_json` | jsonb nullable | ammesso come payload tecnico |
| `response_payload_json` | jsonb nullable | ammesso come payload tecnico |
| `error_code` | text nullable | codice tecnico |
| `error_message` | text nullable | messaggio sintetico |
| `occurred_at` | timestamptz | timestamp tecnico reale |
| `created_at` | timestamptz | audit base |

### Unique key / vincoli minimi

Nessuna unique forte obbligatoria in P4. Il log è per natura append-only.

### Indici minimi

- `ix_int_message_logs__tenant_id_int_sync_run_id_occurred_at`
- `ix_int_message_logs__tenant_id_entity_type_internal_entity_id`
- `ix_int_message_logs__tenant_id_external_id`
- `ix_int_message_logs__tenant_id_status_occurred_at`

## 5. Unique key e tenant scope minimi

DB-00 richiede che `tenant_id` sia presente nei vincoli di unicità e negli indici delle tabelle tenant-scoped, normalmente come prima colonna. Richiede inoltre che i lookup globali e gli oggetti `sys_*` non vengano confusi con le tabelle tenant-owned. fileciteturn13file4 fileciteturn13file6

### Regole P4 da congelare

1. **`int_external_links` è tenant-scoped**
   - `tenant_id` obbligatorio;
   - tutte le unique e gli indici principali devono aprire con `tenant_id`.

2. **`int_sync_runs` è tenant-scoped quando esegue flussi per un tenant**
   - nessun run globale senza motivazione esplicita.

3. **`int_message_logs` è tenant-scoped**
   - il troubleshooting deve essere isolabile per tenant;
   - non usare una tabella globale condivisa senza `tenant_id`.

4. **`source_system` è sempre obbligatorio**
   - evita collisioni future fra SAP B1 e altri ERP.

5. **`entity_type` ed `external_object_type` sono entrambi necessari**
   - `entity_type` parla il linguaggio del dominio Esyy Flow;
   - `external_object_type` parla il linguaggio dell’ERP.

## 6. Campi che devono restare fuori dal core domain

Devono stare fuori dalle tabelle core come `production_orders`, `production_order_events`, `production_order_status_history`:

- `external_id`
- `external_document_no`
- `external_series`
- `source_system`
- `last_request_payload_json`
- `last_response_payload_json`
- `last_sync_status`
- `retry_count`
- `sync_run_id`
- `external_checksum`
- `endpoint_path`
- `http_status_code`
- `raw_payload_json`

Motivo: DB-00 separa in modo esplicito entità operative, audit e integrazione e vieta tabelle ibride che mescolano configurazione, operatività e storico nello stesso oggetto. fileciteturn13file10 fileciteturn13file11

### Eccezione ammessa

Nel core domain può restare solo ciò che è **semanticamente applicativo** e non tecnico di integrazione. Esempio:
- `production_orders.origin_type`
- `production_orders.document_no`
- `production_orders.status`

Ma non i riferimenti ERP raw.

## 7. Esempi concreti derivati da P1

## 7.1 Esempio link ODP ↔ SAP B1

Supponiamo che Esyy Flow abbia creato un ODP interno:
- `production_orders.id = 2d96c7e8-2d23-4b62-a8a0-c3fcbfc6f3d7`
- `tenant_id = 8cc0f1c0-9d0a-42fd-90d9-6af4a9f4e001`

Dopo P1, il record corretto in `int_external_links` diventa:

```json
{
  "tenant_id": "8cc0f1c0-9d0a-42fd-90d9-6af4a9f4e001",
  "source_system": "sap_b1",
  "entity_type": "production_order",
  "internal_entity_id": "2d96c7e8-2d23-4b62-a8a0-c3fcbfc6f3d7",
  "external_object_type": "ProductionOrders",
  "external_id": "3585",
  "external_document_no": "2026230060",
  "external_series": "138",
  "link_status": "linked",
  "is_primary": true
}
```

### Regola di lettura

- per riaprire il documento in SAP o chiamare `GET /ProductionOrders(3585)` si usa `external_id`;
- per mostrare un riferimento leggibile in UI amministrativa si può usare `external_document_no`;
- `external_series` resta di supporto per audit e debug.

## 7.2 Esempio run di prototipo P1

```json
{
  "tenant_id": "8cc0f1c0-9d0a-42fd-90d9-6af4a9f4e001",
  "source_system": "sap_b1",
  "integration_area": "production_orders",
  "run_type": "prototype",
  "status": "completed",
  "started_at": "2026-04-23T09:40:00Z",
  "finished_at": "2026-04-23T10:07:00Z",
  "total_messages": 8,
  "successful_messages": 8,
  "failed_messages": 0,
  "warning_messages": 0,
  "notes": "P1 ODP standard via Service Layer"
}
```

## 7.3 Esempio log di create ODP

```json
{
  "tenant_id": "8cc0f1c0-9d0a-42fd-90d9-6af4a9f4e001",
  "source_system": "sap_b1",
  "integration_area": "production_orders",
  "entity_type": "production_order",
  "external_object_type": "ProductionOrders",
  "message_direction": "outbound",
  "message_type": "request",
  "status": "success",
  "http_method": "POST",
  "endpoint_path": "/ProductionOrders",
  "http_status_code": 201,
  "request_payload_json": {
    "DueDate": "2026-04-25",
    "ItemNo": "FG_P1_ODP_TEST",
    "PlannedQuantity": 1,
    "Warehouse": "Mc"
  },
  "response_payload_json": {
    "AbsoluteEntry": 3585,
    "DocumentNumber": 2026230060,
    "Series": 138,
    "ProductionOrderStatus": "boposPlanned"
  }
}
```

## 8. Impatto operativo su Isabell e Nikolay

### 8.1 Impatto su Isabell

Da questo prototipo deve uscire una regola chiara:
- quando implementa il primo slice ODP standard via Service Layer, **non** deve introdurre campi ERP raw in `production_orders`;
- deve leggere e scrivere il mapping tramite `int_external_links`;
- deve usare `int_sync_runs` e `int_message_logs` per run, audit tecnico e troubleshooting;
- può assumere `external_id` come chiave ERP tecnica primaria per SAP B1 sugli ODP standard.

### 8.2 Impatto su Nikolay

Da questo prototipo deve uscire una baseline DB concreta:
- congelare subito i tre oggetti minimi `int_external_links`, `int_sync_runs`, `int_message_logs`;
- applicare naming, PK UUID, `tenant_id`, unique key e indici coerenti con DB-00;
- bloccare sul nascere eventuali proposte di colonne ERP-specifiche nel core domain.

DB-00 attribuisce al responsabile DB la validazione preventiva di nuove entità principali, deroghe a tenant scope, naming, versioning e policy JSON. P4 ricade pienamente in questo perimetro. fileciteturn13file7

## 9. Decisione strutturale finale che il prototipo deve permettere di prendere

### Decisione da sbloccare

**Congelare subito il primo nucleo del layer `int_*` come parte separata, tenant-scoped e obbligatoria, prima dell’avvio dello sviluppo controllato sugli slice ERP.**

### Formula decisionale proposta

1. **Approvare `int_external_links` come tabella obbligatoria** per tutte le entità che devono riconciliarsi con SAP B1.
2. **Approvare `int_sync_runs` e `int_message_logs` come baseline minima** del tracciamento tecnico integrazione.
3. **Vietare nel core domain** la persistenza di chiavi ERP raw e payload tecnici.
4. **Adottare per gli ODP SAP B1** la triade:
   - `external_id` ← `AbsoluteEntry`
   - `external_document_no` ← `DocumentNumber`
   - `external_series` ← `Series`
5. **Consentire a Isabell** di sviluppare il primo slice ODP standard solo se legge/scrive passando dal layer `int_*` e non tramite campi ERP dispersi nel dominio.

### Esito atteso di OLE-06

Se approvato, OLE-06 deve diventare la baseline strutturale minima del layer integrazione per il caso ODP standard, riutilizzabile subito anche nei prototipi successivi P2 e P3.
