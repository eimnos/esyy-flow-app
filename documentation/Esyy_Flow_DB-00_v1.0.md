**Esyy Flow • DB-00**

Standard e regole base di progettazione database

Baseline vincolante per la modellazione dati del progetto

**Scopo operativo.** Questo documento non definisce ancora l’ER completo
finale; stabilisce invece le regole obbligatorie da applicare a tutte le
strutture dati del progetto, così da garantire coerenza di naming,
chiavi, versioning, tenant scope, audit e governance durante lo
sviluppo.

| **Perimetro**       | SaaS multi-tenant per produzione, MES, conto lavoro, qualità, tracciabilità, amministrazione tenant e integrazioni ERP.                                                                  |
|---------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Stato documento** | Versione 1.0 consolidata — proposta come baseline vincolante di progetto.                                                                                                                |
| **Destinatari**     | Michael, Larisa, Marit, Ole, Isabell e tutte le future attività di modellazione, sviluppo e integrazione.                                                                                |
| **Principio guida** | Ogni oggetto dati deve risultare riconoscibile a colpo d’occhio: tabella principale chiara, tabelle derivate prevedibili, FK leggibili, confini tra template e istanza sempre espliciti. |

**Campo di applicazione immediato.** DIBA, distinte ciclo, modelli
produttivi, ODP, fasi, missioni materiale, conto lavoro, qualità,
tracciabilità, impostazioni tenant, etichette e strutture di
integrazione devono essere modellati usando questo standard.

# Indice

- 1\. Principi generali di progettazione

- 1.1 Schemi e logical grouping

- 2\. Regole di naming di tabelle e campi

- 2.1 Pattern obbligatori per testata, righe, eventi, storico, allegati
  e note

- 3\. Chiavi, tenant scope e identificativi business

- 3.1 Convenzione per code, document_no e version_no

- 4\. Campi standard comuni

- 4.1 Matrice campi standard per famiglia tabella

- 5\. Relazioni, integrità, vincoli e indici

- 6\. Versioning, storico, audit e policy JSON

- 7\. Linee guida per performance e queryabilità

- 8\. Governance operativa durante lo sviluppo

- 9\. Esempi modello e template SQL minimi

- 10\. Glossario operativo minimo

# 1. Principi generali di progettazione

- Approccio multi-tenant — tutte le entità di dominio, configurazione e
  operatività sono tenant-scoped salvo eccezioni esplicitamente
  classificate come globali di piattaforma o di sistema.

- Separazione per natura del dato — anagrafiche, configurazioni,
  template versionati, entità operative, eventi, audit, integrazioni e
  oggetti tecnici non devono essere mescolati nella stessa tabella salvo
  deroga motivata e approvata.

- Separazione template vs istanza — librerie strutturali come DIBA,
  cicli e modelli produttivi sono oggetti di riferimento; ODP, fasi
  reali, materiali effettivi, missioni e rientri sono istanze operative
  che possono divergere dal template senza riscrivere lo storico.

- Soft delete selettivo — si usa solo dove esiste valore di recupero,
  visibilità o tracciamento business. Non è standard per log tecnici,
  audit trail, eventi append-only e tabelle ponte puramente tecniche.

- Versioning esplicito — le modifiche strutturali rilevanti generano
  nuova versione e non update distruttivo.

- Audit by design — le famiglie sensibili devono permettere di
  ricostruire chi, quando e cosa è stato modificato, con distinzione tra
  audit DB rilevante e telemetria applicativa.

## 1.1 Schemi e logical grouping

**Regola esplicita.** I prefissi **cfg\_**, **ref\_**, **int\_**,
**audit\_** e **sys\_** sono prima di tutto convenzioni di naming
obbligatorie; non implicano automaticamente una separazione fisica in
schemi distinti.

**Regola operativa di default.** Nella baseline iniziale del progetto è
ammesso un unico schema applicativo principale, purché la segmentazione
logica sia leggibile dal naming. La separazione fisica in schemi o
database distinti è una scelta architetturale successiva, non un
prerequisito del modello concettuale.

**Criterio di evoluzione.** La separazione fisica può essere introdotta
in seguito per motivi di sicurezza, auditing, performance, lifecycle o
gestione operativa, ma deve rispettare i medesimi nomi logici e non
alterare le convenzioni dei campi.

| Prefisso / famiglia | Significato logico                   | Separazione fisica                                   | Esempi                                   |
|---------------------|--------------------------------------|------------------------------------------------------|------------------------------------------|
| ref\_               | lookup globali condivisi             | Facoltativa; di norma non necessaria                 | ref_units_of_measure, ref_currencies     |
| cfg\_               | configurazioni tenant o di processo  | Facoltativa; normalmente nello schema applicativo    | cfg_tenant_settings, cfg_label_templates |
| int\_               | integrazione, mapping, code tecniche | Spesso candidata a schema dedicato in fase evolutiva | int_sync_runs, int_external_links        |
| audit\_             | audit trail e tracce regolatorie     | Possibile schema dedicato per accesso e retention    | audit_entries, audit_config_changes      |
| sys\_               | metadati tecnici di piattaforma      | Candidata a separazione logica/fisica                | sys_job_locks, sys_outbox_messages       |

**Decisione vincolante.** Il prefisso identifica la famiglia logica
dell’oggetto. La scelta di usare schemi fisici distinti è subordinata
all’architettura deploy/runtime e non modifica la convenzione di naming
applicativo.

# 2. Regole di naming di tabelle e campi

- Lingua — inglese tecnico per tabelle, campi, vincoli, indici e viste.

- Formato — solo snake_case; vietati CamelCase, PascalCase,
  abbreviazioni opache e nomi provvisori.

- Tabella principale — sostantivo plurale chiaro, stabile e
  semanticamente univoco: products, production_orders, quality_events.

- Campi FK — sempre \<oggetto_singolare\>\_id; le FK leggono sempre la
  destinazione: production_order_id, tenant_id, bom_template_version_id.

- Campi stato — usare status per il lifecycle principale; usare \*\_type
  o \*\_mode per classificazioni o modalità, non come surrogato di
  status.

- Campi snapshot — quando serve congelare un testo/codice storico, usare
  suffix espliciti: \*\_snapshot, \*\_code_snapshot, \*\_name_snapshot.

## 2.1 Pattern obbligatori per testata, righe, eventi, storico, allegati e note

**Regola di irrigidimento.** Per tutto il progetto si adotta un catalogo
di suffissi chiuso. Sono ammessi solo i pattern sotto indicati; sinonimi
alternativi non sono ammessi salvo deroga approvata.

| Caso               | Pattern obbligatorio                       | Esempio                                                  | Sinonimi vietati di default |
|--------------------|--------------------------------------------|----------------------------------------------------------|-----------------------------|
| Tabella principale | \<object_plural\>                          | production_orders                                        | header, master              |
| Righe figlie       | \<object_singular\>\_lines                 | production_order_lines                                   | rows, items, details        |
| Eventi operativi   | \<object_singular\>\_events                | production_order_events                                  | logs, journal               |
| Storico stati      | \<object_singular\>\_status_history        | production_order_status_history                          | state_log, statuses         |
| Allegati           | \<object_singular\>\_attachments           | quality_event_attachments                                | files, documents            |
| Note               | \<object_singular\>\_notes                 | production_order_notes                                   | comments, memos             |
| Versioni           | \<object_singular\>\_versions              | bom_template_versions                                    | revisions                   |
| Fasi / step        | \<object_singular\>\_phases oppure \_steps | production_order_phases / routing_template_version_steps | operations                  |
| Link puri          | \<left\>\_\<right\>\_links                 | production_model_routing_links                           | map, xref                   |
| Assegnazioni       | \<object\>\_assignments                    | tenant_user_role_assignments                             | bindings                    |
| Configurazioni     | cfg\_\<topic_plural\>                      | cfg_tenant_settings                                      | settings senza prefisso     |

**Derivazione dei nomi.** Se esiste una tabella principale
production_orders, allora le tabelle secondarie devono derivare
obbligatoriamente da production_order\_\*: production_order_lines,
production_order_events, production_order_status_history,
production_order_attachments, production_order_notes.

## 2.2 Regole specifiche per i campi

- Primary key — sempre id.

- Tenant scope — sempre tenant_id quando la tabella è tenant-scoped; mai
  organization_id, company_id o varianti concorrenti nello stesso layer.

- Date di business — usare nomi semantici: planned_start_at,
  completed_at, due_date, valid_from, valid_to.

- Quantità e valori — usare suffissi leggibili: planned_qty,
  completed_qty, rejected_qty, estimated_cost_amount.

- Booleani — prefisso is\_, has\_, can\_, requires\_.

- Ordinamenti tecnici — usare sort_order invece di sequence, line_order
  o rank salvo significato diverso realmente necessario.

# 3. Chiavi, tenant scope e identificativi

- Chiave primaria tecnica standard — UUID su tutte le nuove tabelle di
  dominio e configurazione. Preferenza per UUID ordinabili temporalmente
  se supportati; in alternativa UUID casuali standard.

- Chiave business separata — il codice leggibile per l’utente o per
  l’ERP non è mai PK e non è mai target di FK.

- FK sempre tecniche — tutte le relazioni applicative puntano a id e non
  a code/document_no/version_no.

- Chiavi composte — evitate come PK; ammesse come unique constraint o
  come chiavi tecniche di bridge table molto specialistiche.

## 3.1 Tenant scope

**Regola vincolante.** tenant_id è obbligatorio su tutte le tabelle
tenant-owned o tenant-scoped: anagrafiche tenant, configurazioni tenant,
template versionati del tenant, entità operative, eventi, storico,
allegati, note, audit di contesto tenant e mapping di integrazione
riferiti a oggetti tenant.

**tenant_id non deve comparire** su lookup globali condivisi (ref\_\*),
metadati tecnici globali (sys\_\*), cataloghi piattaforma globali e
oggetti super-admin che appartengono alla governance SaaS e non a un
singolo tenant.

**Eccezione gestita.** Per oggetti di audit o integrazione che operano a
livello piattaforma ma riferiscono un tenant target, usare
target_tenant_id o source_tenant_id solo se il significato è realmente
diverso dal possesso del record.

| Famiglia                | tenant_id    | Unique constraint                      | Indicizzazione minima                      |
|-------------------------|--------------|----------------------------------------|--------------------------------------------|
| Anagrafiche tenant      | Obbligatorio | Di norma incluso nelle unique business | Index su tenant_id e su tenant_id + code   |
| Configurazioni tenant   | Obbligatorio | Unique quasi sempre tenant-scoped      | Index su tenant_id e chiavi di lookup      |
| Operative               | Obbligatorio | Unique tenant-scoped dove serve        | Index con tenant_id leading column         |
| Eventi / storico tenant | Obbligatorio | Non sempre necessario                  | Index su tenant_id + FK padre + created_at |
| Lookup globali / sys\_  | Assente      | Globali                                | Index sui campi propri, senza tenant_id    |

**Regola su unique e indici.** In tutte le tabelle tenant-scoped,
tenant_id deve essere presente nei vincoli di unicità business e negli
indici delle query principali, normalmente come prima colonna. Un
vincolo unique senza tenant_id è ammesso solo se la regola di business è
davvero globale.

## 3.2 Convenzione per code, document_no e version_no

- code — identificativo business stabile dell’oggetto o della famiglia
  logica. Si usa tipicamente su anagrafiche, template, configurazioni o
  master data leggibili dall’utente. Unicità di norma per tenant.

- document_no — numerazione di documento o transazione operativa. Si usa
  per ordini, invii, rientri, NC, documenti di processo. Non sostituisce
  code e non sostituisce id.

- document_series_code — opzionale, quando la numerazione documento
  dipende da una serie o da un registro.

- version_no — numero di versione dell’oggetto versionato; è sempre
  relativo alla famiglia logica padre, non globale nell’intero tenant.

- current_version_no non è lo standard di base; la versione corrente si
  gestisce preferibilmente tramite relazione esplicita o flag is_current
  nella tabella versioni.

| Campo         | Uso                       | Univocità tipica                                                              | Note                                       |
|---------------|---------------------------|-------------------------------------------------------------------------------|--------------------------------------------|
| code          | Codice master / famiglia  | tenant_id + code                                                              | Stabile, leggibile, non usato come FK      |
| document_no   | Numero documento          | tenant_id + document_no oppure tenant_id + document_series_code + document_no | Può essere progressivo o derivato da serie |
| version_no    | Numero versione           | parent_id + version_no                                                        | Parte della semantica del versioning       |
| external_code | Codice in sistema esterno | source_system + external_code                                                 | Meglio spesso in int_external_links        |

# 4. Campi standard comuni

**Principio.** Ogni famiglia tabella parte da un set standard
predefinito. Le eccezioni sono ammesse solo se motivate. Il set non deve
essere applicato in modo meccanico a tutto, ma la deviazione dallo
standard deve essere esplicita.

| Campo                           | Obbligatorietà generale | Uso                     | Nota                                                                |
|---------------------------------|-------------------------|-------------------------|---------------------------------------------------------------------|
| id                              | Sempre                  | PK tecnica UUID         | Standard universale                                                 |
| tenant_id                       | Quando tenant-scoped    | Scope del record        | Mai su ref\_ e sys\_ globali                                        |
| code                            | Quando utile            | Codice business stabile | Tipico su anagrafiche e famiglie logiche                            |
| status                          | Quando utile            | Lifecycle principale    | Evitare doppio concetto con is_active salvo reale bisogno           |
| created_at                      | Sempre                  | Timestamp creazione UTC | Append-only o audit puro possono non avere updated_at significativo |
| updated_at                      | Quasi sempre            | Ultima modifica UTC     | Non essenziale su eventi append-only puri                           |
| created_by_user_id              | Raccomandato            | Autore creazione        | Può essere null per processi tecnici                                |
| updated_by_user_id              | Raccomandato            | Autore ultima modifica  | Può essere null per processi tecnici                                |
| deleted_at / deleted_by_user_id | Solo se soft delete     | Cancellazione logica    | Non standard per log e audit                                        |

## 4.1 Matrice campi standard per famiglia tabella

**Matrice A — campi base.** La prima matrice copre identificazione,
scope e lifecycle.

| **Famiglia**     | **id** | **tenant_id** | **code** | **status** | **created_at** |
|------------------|--------|---------------|----------|------------|----------------|
| Anagrafiche      | O      | O             | O        | O          | O              |
| Configurazioni   | O      | O             | Opt      | O          | O              |
| Operative        | O      | O             | Opt      | O          | O              |
| Eventi / storico | O      | O\*           | N        | Opt        | O              |
| Audit            | O      | O\*\*         | N        | Opt        | O              |
| Integrazione     | O      | O\*\*\*       | Opt      | Opt        | O              |

**Matrice B — campi di tracciamento e versioning.** La seconda matrice
chiarisce aggiornamento, soft delete e versione.

| **Famiglia**     | **updated_at** | **created_by** | **updated_by** | **deleted_at** | **version_no** |
|------------------|----------------|----------------|----------------|----------------|----------------|
| Anagrafiche      | O              | R              | R              | Opt            | N              |
| Configurazioni   | O              | R              | R              | Opt            | N              |
| Operative        | O              | R              | R              | Opt            | N              |
| Eventi / storico | N/Opt          | R              | N              | N              | N              |
| Audit            | N              | Opt            | N              | N              | N              |
| Integrazione     | O              | Opt            | Opt            | Opt            | N              |

**Legenda:** O = obbligatorio; R = raccomandato; Opt = opzionale; N =
non previsto. \* obbligatorio se l’evento è in contesto tenant; \*\*
obbligatorio solo per audit riferito a contesto tenant; \*\*\*
obbligatorio per mapping o code riferite a oggetti tenant.

# 5. Relazioni, integrità, vincoli e indici

- Uno-a-molti — la tabella figlia contiene la FK al padre con naming
  \<parent_singular\>\_id.

- Molti-a-molti — preferire tabella ponte esplicita; se contiene
  attributi propri, va trattata come entità vera e propria con campi
  audit coerenti.

- Lookup — i lookup globali stanno in ref\_\*; le scelte configurabili
  per tenant vanno in cfg\_\* o in master tenant-scoped dedicati.

- Oggetti tecnici separati — retry, queue, log di sincronizzazione,
  mapping e checksum non devono inquinare le tabelle core di dominio.

## 5.1 Naming di vincoli e indici

- Primary key — pk\_\<table\>

- Foreign key — fk\_\<table\>\_\_\<column\>

- Unique constraint — uq\_\<table\>\_\_\<column_list\>

- Check constraint — ck\_\<table\>\_\_\<rule_name\>

- Index — ix\_\<table\>\_\_\<column_list\>

**Esempi:** pk_production_orders;
fk_production_order_lines\_\_production_order_id;
uq_products\_\_tenant_id_code;
ix_production_orders\_\_tenant_id_status_due_date.

## 5.2 Regole on delete / on update

- ON UPDATE — default NO ACTION/RESTRICT. Le PK tecniche non sono
  pensate per essere mutate.

- ON DELETE RESTRICT — default per master, template, documenti, famiglie
  logiche e oggetti con valore storico.

- ON DELETE CASCADE — ammesso solo per figli posseduti in modo esclusivo
  e privi di valore autonomo, come righe tecniche o link puri.

- ON DELETE SET NULL — ammesso su riferimenti opzionali o su storico
  leggibile anche senza l’oggetto originario.

# 6. Versioning, storico, audit e policy JSON

**Regola generale.** Gli oggetti strutturali del prodotto — in
particolare DIBA, distinte ciclo, modelli produttivi, template etichette
e configurazioni critiche — usano versioning esplicito, coerente con il
dominio definito per Esyy Flow.

- Nuova versione obbligatoria quando cambia struttura, sequenza fasi,
  logica di consumo, validità funzionale, composizione materiali o altre
  regole che impattano lo storico operativo.

- Update diretto ammesso solo per correzioni non strutturali:
  descrizioni, note, metadata non sostanziali, errori di battitura o
  flag non storicizzati.

- Pattern standard per versionati: tabella famiglia logica + tabella
  versioni + eventuali figli della versione. I figli dipendono dalla
  versione, non dalla famiglia.

| Livello              | Pattern                                      | Esempio                    |
|----------------------|----------------------------------------------|----------------------------|
| Famiglia logica      | \<object_plural\>                            | bom_templates              |
| Versioni             | \<object_singular\>\_versions                | bom_template_versions      |
| Figli della versione | \<object_singular\>\_version_lines / \_steps | bom_template_version_lines |

## 6.1 Storico e audit minimi

- Status history — usare sempre \<object\>\_status_history quando serve
  ricostruire i passaggi di stato con timestamp, autore e motivazione.

- Business events — usare \<object\>\_events per eventi operativi
  significativi non riducibili a cambio stato.

- Audit DB minimo — configurazioni tenant, permessi, versioni di
  libreria, stati ODP/fasi, missioni materiale, rientri da terzista, non
  conformità, template etichette e modifiche critiche di integrazione.

- Audit applicativo sufficiente — eventi di UI, navigazione, telemetria
  di utilizzo e segnali tecnici non necessari alla ricostruzione del
  dato.

## 6.2 Policy su JSON e campi destrutturati

**Principio.** JSON è uno strumento di supporto e non il default del
modello. È ammesso solo per dati realmente destrutturati, a bassa
relazionalità e non critici per vincoli, query business e reporting
operativo.

| Caso                                           | Esito                        | Esempi                                          |
|------------------------------------------------|------------------------------|-------------------------------------------------|
| Payload esterni o snapshot tecnici             | Ammesso                      | raw_payload_json, response_headers_json         |
| Preferenze UI o metadata non relazionali       | Ammesso con prudenza         | layout_prefs_json, print_options_json           |
| Attributi business filtrati o ricercati spesso | Da evitare                   | priorità operativa, tipo esito, serie documento |
| Relazioni ripetute o collezioni strutturate    | Da modellare relazionalmente | righe, allegati, step, componenti               |
| Dati soggetti a vincoli e univocità            | Da modellare relazionalmente | codici, stati, chiavi di riconciliazione        |

- Criterio di promozione a modello relazionale — un attributo in JSON va
  promosso a colonna o tabella dedicata quando diventa filtrabile,
  joinabile, soggetto a constraint, audit rilevante, reporting frequente
  o riutilizzo cross-feature.

- Divieto operativo — non usare JSON per evitare di decidere il modello.
  Se la struttura è già nota e stabile, va modellata subito in forma
  relazionale.

# 7. Linee guida per performance e queryabilità

- Indicizzazione minima — indicizzare quasi sempre tenant_id, le FK
  principali, status e i campi data usati nelle viste operative.

- Tabelle grandi — per production_orders, production_order_phases,
  quality_events, external_phase_returns e simili, prevedere indici
  composti coerenti con i filtri di lista reali.

- Versionati — indicizzare parent_id + version_no e, dove serve,
  valid_from / valid_to / is_current.

- Soft delete — se usato su tabelle grandi, considerare indici che
  aiutino a escludere i record cancellati dalle query standard.

- Nessuna ottimizzazione prematura — evitare denormalizzazioni,
  partizionamenti o snapshot duplicati senza caso d’uso misurabile;
  mantenere però nomi e chiavi già pronti a supportarli.

**Campi quasi sempre indicizzati:** tenant_id; FK del padre; status;
created_at/updated_at; due_date/planned_start_at quando la pagina è
calendar-driven; code/document_no per ricerca diretta.

# 8. Governance operativa durante lo sviluppo

## 8.1 Cosa Isabell può creare in autonomia

- Tabelle figlie prevedibili di un oggetto già approvato, se rispettano
  naming standard, tenant scope, FK coerenti e campi minimi attesi.

- Campi tecnici implementativi non funzionali come row_version,
  sort_order, external_checksum o processed_at, purché non alterino il
  modello concettuale.

- Nuovi indici e unique constraint motivati da query reali o regole di
  business già approvate.

## 8.2 Cosa richiede validazione preventiva del responsabile DB

- Nuova entità principale o nuova famiglia versionata.

- Nuova relazione molti-a-molti o bridge table con semantica di dominio.

- Deroghe a tenant scope, naming, versioning, soft delete o policy JSON.

- Campi che duplicano concetti esistenti, enum non documentati o colonne
  ERP-specifiche nel core domain.

- Qualsiasi scelta che introduca globalità dove lo standard prevede
  scoping per tenant.

## 8.3 Flusso minimo per richieste di nuove tabelle o campi

1.  Descrivere il bisogno funzionale e l’oggetto impattato.

2.  Verificare se il requisito rientra in una tabella esistente o
    richiede nuova entità.

3.  Proporre naming, chiavi, tenant scope, campi standard, vincoli e
    motivo di eventuali eccezioni.

4.  Validare DB prima di considerare stabile la struttura.

**Regola sulle eccezioni.** Ogni deroga allo standard deve essere
documentata con motivazione, impatto, alternativa scartata e
approvazione esplicita. La deroga non crea precedente automatico.

# 9. Esempi modello e template SQL minimi

**Nota.** Gli esempi seguenti non costituiscono il modello completo
finale; mostrano il livello di concretezza minimo atteso per la
modellazione.

## 9.1 Esempio A — tabella anagrafica

| Tabella  | Campo     | Tipo logico | Note                      |
|----------|-----------|-------------|---------------------------|
| products | id        | uuid        | PK tecnica                |
| products | tenant_id | uuid        | scope tenant              |
| products | code      | text        | univoco per tenant        |
| products | name      | text        | descrizione breve         |
| products | status    | text        | draft / active / obsolete |

## 9.2 Esempio B — tabella operativa con righe, eventi e storico

| Tabella                         | Ruolo            | Relazione               |
|---------------------------------|------------------|-------------------------|
| production_orders               | testata ODP      | pk: id                  |
| production_order_lines          | righe figlie     | fk: production_order_id |
| production_order_events         | eventi operativi | fk: production_order_id |
| production_order_status_history | storico stati    | fk: production_order_id |

## 9.3 Esempio C — oggetto versionato

| Tabella                    | Funzione               | Note                                                          |
|----------------------------|------------------------|---------------------------------------------------------------|
| bom_templates              | famiglia logica        | tenant_id, code, status                                       |
| bom_template_versions      | versione               | bom_template_id, version_no, valid_from, valid_to, is_current |
| bom_template_version_lines | componenti di versione | bom_template_version_id                                       |

## 9.4 Template SQL minimo — tabella anagrafica

> CREATE TABLE products (  
> id uuid PRIMARY KEY,  
> tenant_id uuid NOT NULL,  
> code text NOT NULL,  
> name text NOT NULL,  
> status text NOT NULL,  
> created_at timestamptz NOT NULL,  
> updated_at timestamptz NOT NULL,  
> created_by_user_id uuid NULL,  
> updated_by_user_id uuid NULL,  
> deleted_at timestamptz NULL,  
> deleted_by_user_id uuid NULL,  
> row_version bigint NOT NULL DEFAULT 1,  
> CONSTRAINT uq_products\_\_tenant_id_code  
> UNIQUE (tenant_id, code)  
> );  
>   
> CREATE INDEX ix_products\_\_tenant_id_status  
> ON products (tenant_id, status);

## 9.5 Template SQL minimo — tabella operativa con righe

> CREATE TABLE production_orders (  
> id uuid PRIMARY KEY,  
> tenant_id uuid NOT NULL,  
> document_no text NOT NULL,  
> status text NOT NULL,  
> production_model_id uuid NULL,  
> planned_start_at timestamptz NULL,  
> due_date date NULL,  
> created_at timestamptz NOT NULL,  
> updated_at timestamptz NOT NULL,  
> created_by_user_id uuid NULL,  
> updated_by_user_id uuid NULL,  
> row_version bigint NOT NULL DEFAULT 1,  
> CONSTRAINT uq_production_orders\_\_tenant_id_document_no  
> UNIQUE (tenant_id, document_no)  
> );  
>   
> CREATE TABLE production_order_lines (  
> id uuid PRIMARY KEY,  
> tenant_id uuid NOT NULL,  
> production_order_id uuid NOT NULL,  
> line_no integer NOT NULL,  
> item_id uuid NOT NULL,  
> planned_qty numeric(18, 6) NOT NULL,  
> issued_qty numeric(18, 6) NOT NULL DEFAULT 0,  
> created_at timestamptz NOT NULL,  
> updated_at timestamptz NOT NULL,  
> CONSTRAINT fk_production_order_lines\_\_production_order_id  
> FOREIGN KEY (production_order_id)  
> REFERENCES production_orders (id)  
> ON DELETE CASCADE,  
> CONSTRAINT uq_production_order_lines\_\_production_order_id_line_no  
> UNIQUE (production_order_id, line_no)  
> );  
>   
> CREATE INDEX ix_production_orders\_\_tenant_id_status_due_date  
> ON production_orders (tenant_id, status, due_date);

## 9.6 Template SQL minimo — oggetto versionato

> CREATE TABLE bom_templates (  
> id uuid PRIMARY KEY,  
> tenant_id uuid NOT NULL,  
> code text NOT NULL,  
> status text NOT NULL,  
> created_at timestamptz NOT NULL,  
> updated_at timestamptz NOT NULL,  
> CONSTRAINT uq_bom_templates\_\_tenant_id_code  
> UNIQUE (tenant_id, code)  
> );  
>   
> CREATE TABLE bom_template_versions (  
> id uuid PRIMARY KEY,  
> tenant_id uuid NOT NULL,  
> bom_template_id uuid NOT NULL,  
> version_no integer NOT NULL,  
> status text NOT NULL,  
> valid_from date NULL,  
> valid_to date NULL,  
> is_current boolean NOT NULL DEFAULT false,  
> created_at timestamptz NOT NULL,  
> updated_at timestamptz NOT NULL,  
> CONSTRAINT fk_bom_template_versions\_\_bom_template_id  
> FOREIGN KEY (bom_template_id)  
> REFERENCES bom_templates (id)  
> ON DELETE RESTRICT,  
> CONSTRAINT uq_bom_template_versions\_\_bom_template_id_version_no  
> UNIQUE (bom_template_id, version_no)  
> );  
>   
> CREATE TABLE bom_template_version_lines (  
> id uuid PRIMARY KEY,  
> tenant_id uuid NOT NULL,  
> bom_template_version_id uuid NOT NULL,  
> line_no integer NOT NULL,  
> component_item_id uuid NULL,  
> component_description text NULL,  
> qty_per_base numeric(18, 6) NOT NULL,  
> base_qty numeric(18, 6) NOT NULL DEFAULT 1,  
> created_at timestamptz NOT NULL,  
> updated_at timestamptz NOT NULL,  
> CONSTRAINT fk_bom_template_version_lines\_\_bom_template_version_id  
> FOREIGN KEY (bom_template_version_id)  
> REFERENCES bom_template_versions (id)  
> ON DELETE CASCADE,  
> CONSTRAINT
> uq_bom_template_version_lines\_\_bom_template_version_id_line_no  
> UNIQUE (bom_template_version_id, line_no)  
> );

# 10. Glossario operativo minimo

| Termine           | Definizione                                                                                 |
|-------------------|---------------------------------------------------------------------------------------------|
| Template          | Oggetto di libreria riusabile, non coincidente con l’istanza operativa.                     |
| Istanza operativa | Oggetto reale eseguito o movimentato, derivato da un template ma potenzialmente divergente. |
| Famiglia logica   | Identità stabile di un oggetto versionato, indipendente dalle singole versioni.             |
| Versione          | Snapshot controllato di una famiglia logica in uno stato e in un momento preciso.           |
| Chiave tecnica    | Identificativo interno stabile usato da PK e FK.                                            |
| Chiave business   | Codice leggibile da utente o sistema esterno, non usato come PK.                            |

**Esito atteso della validazione.** Dopo approvazione, questo documento
diventa riferimento vincolante: Isabell può modellare nel perimetro
consentito senza reinventare naming, chiavi o strutture base; le
eccezioni passano da validazione DB preventiva.
