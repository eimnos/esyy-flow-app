# OLE-06 → DB baseline note

## Scopo

Questa nota congela il primo nucleo strutturale del layer `int_*` come baseline DB coerente con **DB-00 v1.0**, evitando dipendenze errate tra dominio core e integrazione ERP.

## Oggetti canonici introdotti

Il primo nucleo del layer integrazione è composto da:

- `int_external_links`
- `int_sync_runs`
- `int_message_logs`

Non viene introdotto alcun nuovo oggetto canonico fuori standard.

## Regole vincolanti

### 1. Collocazione logica

Il prefisso `int_` identifica strutture di integrazione, mapping e code tecniche.
Il prefisso è **convenzione di naming obbligatoria**; non implica automaticamente schema fisico separato.

### 2. Tenant scope

Nella baseline iniziale questi tre oggetti sono **tenant-scoped**:

- `tenant_id` obbligatorio su `int_external_links`
- `tenant_id` obbligatorio su `int_sync_runs`
- `tenant_id` obbligatorio su `int_message_logs`

Eccezioni globali non sono introdotte in questa fase.

### 3. Classi di chiavi da usare

#### Chiavi applicative interne

- sempre UUID interni del dominio applicativo
- restano le sole chiavi usate da PK/FK del core domain
- non vengono sostituite da chiavi ERP

#### Chiavi ERP tecniche

- si memorizzano in `external_id`
- servono per riconciliazione, mapping e callback tecnici
- non diventano PK/FK del dominio core

Per il caso SAP Business One / ODP:

- `external_id` = `AbsoluteEntry`
- `external_document_no` = `DocumentNumber`
- `external_series` = `Series`

#### Chiavi business informative

- `external_document_no`
- `external_series`
- eventuali `external_code`

Servono per ricerca, diagnosi, riconciliazione leggibile e supporto operativo.
Non devono essere usate come chiavi relazionali del core domain.

### 4. Divieto esplicito sul core domain

Nel **core domain** è vietato portare chiavi ERP raw come colonne strutturali stabili.

Esempi vietati nel core domain:

- `sap_absolute_entry`
- `sap_docentry`
- `sap_docnum`
- `sap_series`
- varianti ERP-specifiche equivalenti

Queste informazioni devono vivere nel layer `int_*`, oppure in snapshot/read model esplicitamente approvati se servono solo per esposizione tecnica o diagnostica.

### 5. Read model

In questa fase **non è necessario introdurre un read model dedicato**.
Il nucleo `int_*` è sufficiente come baseline DB iniziale.
Eventuali viste di supporto potranno essere aggiunte in seguito solo per esigenze applicative o operative reali.

## Strutture canoniche

### `int_external_links`

Funzione:

- mappa un record applicativo interno a un oggetto esterno
- conserva chiave ERP tecnica e chiavi informative leggibili
- rappresenta il punto ufficiale di riconciliazione tra dominio e sistemi esterni

Unique minimi:

- un link attivo per record interno e sistema sorgente
- un link attivo per record esterno e sistema sorgente

### `int_sync_runs`

Funzione:

- traccia una run di sincronizzazione per tenant / sistema / entità
- supporta stato, direzione, contatori e riepilogo errore
- rappresenta il contenitore padre dei log di messaggio

Unique business aggiuntivi:

- nessuno obbligatorio oltre alla PK tecnica; è una tabella append-only di esecuzione

### `int_message_logs`

Funzione:

- traccia i singoli messaggi inbound/outbound collegati a una run
- conserva payload, stato, chiave di correlazione ed eventuale errore
- supporta diagnosi, retry e audit tecnico minimo

Unique business aggiuntivi:

- nessuno obbligatorio oltre alla PK tecnica; la chiave di correlazione resta indicizzata ma non forzata come unique in baseline

## Indici minimi richiesti

### `int_external_links`

- `tenant_id, source_system_code, entity_name`
- `tenant_id, entity_name, internal_record_id`
- `tenant_id, source_system_code, entity_name, external_document_no`

### `int_sync_runs`

- `tenant_id, source_system_code, entity_name, created_at desc`
- `tenant_id, run_status, created_at desc`

### `int_message_logs`

- `tenant_id, int_sync_run_id, created_at`
- `tenant_id, source_system_code, entity_name, created_at desc`
- `tenant_id, correlation_key`

## Allineamento con DB-00

Questa nota è coerente con DB-00 perché:

- usa il prefisso `int_` come famiglia logica di integrazione
- mantiene `tenant_id` su oggetti tenant-scoped
- tiene separate chiavi tecniche applicative e chiavi esterne
- evita la contaminazione ERP-specifica nel core domain
- applica naming leggibile, snake_case e indici minimi coerenti

## Esito operativo

Da questo momento il primo nucleo `int_*` è da considerare baseline DB strutturale per lo sviluppo del layer integrazione.
Nuove tabelle o deroghe oltre questo perimetro richiedono validazione DB preventiva.
