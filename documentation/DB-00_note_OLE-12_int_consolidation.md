# DB-00 — Nota di consolidamento finale blocco integrazione iniziale (OLE-12)

## Stato
Approvata come baseline DB finale del blocco iniziale integrazione.

## Scopo
Congelare il primo perimetro strutturale del layer `int_*` dopo la chiusura positiva dei prototipi iniziali integrazione, mantenendo coerenza piena con DB-00 e preservando la separazione tra **core domain** e **layer integrazione**.

## 1. Nucleo `int_*` congelato
Il primo nucleo corretto del layer integrazione è costituito da:

- `int_external_links`
- `int_sync_runs`
- `int_message_logs`

Queste tre strutture sono sufficienti per:
- mappare oggetti interni ↔ oggetti esterni;
- tracciare run tecniche di bootstrap/sync;
- conservare il log tecnico dei messaggi inbound/outbound e degli esiti.

In questa fase **non** viene introdotto alcun read model dedicato.

## 2. Regola chiavi congelata
### 2.1 Chiavi applicative
Le chiavi applicative del dominio Esyy Flow restano sempre:
- `id` UUID come PK tecnica;
- FK interne sempre basate su `id`.

### 2.2 Chiavi ERP tecniche
Le chiavi ERP tecniche sono ammesse **solo** nel layer `int_*` e non devono essere portate nel core domain.

Campi standard ammessi nel layer integrazione:
- `external_id`
- `external_document_no`
- `external_series`
- `external_code`
- `source_system_code`

### 2.3 Chiavi business informative
Le chiavi business informative provenienti dall'ERP possono essere conservate nel layer integrazione solo per:
- diagnostica;
- riconciliazione;
- audit tecnico;
- supporto operativo.

Non devono diventare PK/FK del dominio applicativo.

## 3. Mapping congelato per SAP B1 / ODP
Per il caso SAP Business One relativo agli ODP, il mapping baseline è:

- `external_id` ← `AbsoluteEntry`
- `external_document_no` ← `DocumentNumber`
- `external_series` ← `Series`

Questa regola va considerata riusabile anche per altri documenti esterni ove gli stessi concetti esistano, senza modificare il core domain.

## 4. Confine bootstrap / sync / native app
### 4.1 Bootstrap ERP minimo ammesso
Il bootstrap ERP iniziale può aprirsi su:
- `Items`
- `ProductTrees`

### 4.2 Cosa resta nativo dell'app
Restano nativi dell'app e **non** devono essere sostituiti da strutture ERP raw:
- DIBA piena e versionata;
- distinta ciclo ricca e versionata;
- modello produttivo;
- pre-industrializzazione;
- stato di completezza;
- metadati tenant/app;
- regole di scelta ciclo;
- logiche operative di istanza ODP/fasi/materiali effettivi.

### 4.3 Regola esplicita su `ProductTree`
`ProductTree` ERP **non coincide** con la DIBA piena/versionata di Esyy Flow.

Può essere usato solo come:
- sorgente bootstrap iniziale;
- riferimento di sincronizzazione/material structure esterna;
- input per mapping tecnico nel layer `int_*`.

La struttura canonica DIBA dell'app resta quella versionata del dominio (`bom_templates`, `bom_template_versions`, `bom_template_version_lines`).

## 5. Note minime su receipt produzione e StockTransfers
I prototipi validati su receipt produzione e StockTransfers non cambiano il modello core.

Regola di baseline:
- i documenti esterni di produzione/magazzino restano tracciati tramite `int_external_links` e `int_message_logs`;
- eventuali riferimenti ERP tecnici o numerazioni documento rimangono nello strato integrazione;
- il dominio operativo interno continua a usare solo chiavi applicative UUID e naming nativo del progetto.

Per questi casi, la triade informativa standard resta:
- `external_id`
- `external_document_no`
- `external_series`

con classificazione dell'oggetto tramite `external_object_type`.

## 6. Regole DB operative da applicare
- `tenant_id` obbligatorio su `int_*` quando il record è riferito a oggetti tenant-scoped.
- unique key e indici devono sempre partire da `tenant_id` quando la semantica è tenant-scoped.
- payload tecnici possono stare in JSON (`request_payload_json`, `response_payload_json`) perché sono snapshot tecnici e non struttura di dominio.
- vietato introdurre colonne ERP raw in tabelle core (`products`, `bom_templates`, `routing_templates`, `production_models`, `production_orders`, `projects`, ecc.).

## 7. Impatto su DB-00
Questa nota **non cambia** il DB-00 nel suo impianto base.

Ne rappresenta un consolidamento operativo per il perimetro integrazione iniziale e chiarisce in modo esplicito:
- come usare il prefisso `int_*`;
- come separare chiavi applicative e chiavi ERP;
- dove finisce il bootstrap ERP e dove inizia il dominio nativo Esyy Flow.

## 8. Esito congelato
Da questo momento il blocco iniziale integrazione lato DB si considera congelato con queste regole:
- layer `int_*` separato dal core domain;
- bootstrap minimo ERP su `Items` e `ProductTrees`;
- nessuna contaminazione del dominio con chiavi ERP raw;
- DIBA/ciclo/modello/pre-industrializzazione e metadati tenant/app restano nativi dell'app;
- estensioni successive oltre questo nucleo richiedono validazione DB preventiva.
