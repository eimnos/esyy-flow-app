# OLE-14 — Campi personalizzati / attributi dinamici tenant-scoped  
## Baseline specialistica ERP / integrazione

## Stato deliverable
**Pronto per revisione**

## Obiettivo
Chiarire il perimetro sostenibile di collegamento tra:
- **campi personalizzati / attributi dinamici dell’app**
- **campi standard o custom dell’ERP SAP Business One**

con focus specifico su:
- scenari sostenibili di sola lettura, scrittura e bidirezionalità
- limiti del Service Layer per campi custom e mapping dinamici
- confine tra metadata campo, valore applicativo, riferimento ERP e sincronizzazione tecnica
- implicazioni sul layer `int_*`
- vincoli da imporre alla V1

---

## 1. Sintesi esecutiva

La conclusione operativa è questa:

### Fattibile subito
- **lettura da ERP** di campi standard e **UDF già esistenti** su oggetti ERP esplicitamente supportati e già mappati
- **scrittura verso ERP** di valori su campi ERP standard/UDF già esistenti, ma solo con mapping statico-governato e perimetro ridotto
- **metadata campo, tassonomie, regole di visibilità e significato funzionale** gestiti **nativamente nell’app**, non in ERP

### Fattibile con vincoli
- bidirezionale solo su un sottoinsieme molto limitato di campi:
  - scalari
  - a semantica semplice
  - senza logiche di calcolo concorrenti
  - senza molteplicità righe/collezioni
  - con ownership chiara del dato
- uso di UDO/UDT solo in casi mirati e non come fondazione generale del motore attributi tenant-scoped

### Fuori V1
- creazione dinamica generalizzata di metadata ERP per tenant
- motore di mapping completamente runtime/free-form su qualunque oggetto ERP
- bidirezionalità estesa per attributi ad alta criticità operativa
- modellazione in ERP di metadata campo, UX e logiche tenant-native dell’app
- uso del Service Layer come backend universale del sistema attributi dinamici di Esyy Flow

---

## 2. Principio guida

Il sistema attributi dinamici tenant-scoped deve restare **app-centrico**.

SAP Business One può essere:
- **fonte** di alcuni valori
- **destinazione** di alcuni valori
- **punto di riconciliazione** per un sottoinsieme controllato

ma **non** deve diventare il luogo in cui viene modellato il sistema generale di metadata dinamici del prodotto.

### Regola operativa
Il **significato del campo** appartiene all’app.  
L’ERP può ospitare:
- un valore
- un riferimento tecnico
- un alias di campo esistente
- un UDF già predisposto

ma non deve guidare la semantica globale del motore attributi tenant-scoped.

---

## 3. Fatti tecnici rilevanti lato SAP Business One / Service Layer

### 3.1 UDF
In SAP Business One i user-defined fields vengono creati su tabelle esistenti o user-defined tables e in database assumono prefisso `U_`. Le definizioni sono registrate in tabelle tecniche come `CUFD`, mentre i valid values finiscono in `UFD1`.

### 3.2 Service Layer e UDF
Nel Service Layer:
- i **UDF** compaiono come proprietà dinamiche / open type
- da versioni successive è possibile gestire anche la metadata dei UDF e fare CRUD come su entità regolari

### 3.3 Metadata variabile
Metadata e disponibilità di UDF/UDT/UDO **variano da company database a company database**. Questo è un punto strutturale importante per un SaaS multi-tenant app-centrico.

### 3.4 UDT
Le **UDT** sono direttamente accessibili dal Service Layer in modo semplice solo per tabelle di tipo **“no object”**.

### 3.5 UDO
Le **UDO** supportano CRUD via Service Layer e sono esposte anche nel metadata/event catalog, ma introducono un livello di estendibilità ERP molto più forte e quindi anche molto più vincolante.

---

## 4. Confine concettuale da fissare

Per evitare confusione, i quattro livelli devono essere distinti.

## 4.1 Metadata campo
Definisce:
- nome funzionale
- codice interno app
- tipo logico
- visibilità
- obbligatorietà
- lista valori / enum
- help text
- gruppo / categoria
- scope tenant
- contesto di utilizzo
- regole UX

### Ownership corretta
**App**

### Motivo
Questo è dominio di configurazione tenant-scoped del prodotto.  
Non è sostenibile modellarlo in ERP come fonte primaria per il motore attributi dinamici.

---

## 4.2 Valore applicativo
Definisce il valore assegnato a un campo per un oggetto business dell’app:
- articolo
- commessa
- ODP
- fase esterna
- evento qualità
- ecc.

### Ownership corretta
**App**, salvo casi selettivi in cui il valore è letto o scritto su ERP.

### Motivo
Il valore deve vivere nel contesto del dominio Esyy Flow, con audit, tenant scope, storia e regole applicative.

---

## 4.3 Riferimento ERP
Definisce il legame tecnico tra un campo app e un target ERP:
- oggetto ERP
- entità Service Layer
- campo standard o `U_...`
- direzione
- regole di sincronizzazione
- trasformazione minima
- abilitazione/disabilitazione del binding

### Ownership corretta
**Layer `int_*`**

### Motivo
È integrazione tecnica, non metadata funzionale del dominio.

---

## 4.4 Sincronizzazione tecnica
Definisce:
- run di sync
- messaggi
- errori
- stato invio/ricezione
- retry
- hash/checksum
- drift
- conflitti

### Ownership corretta
**Layer `int_*`**

### Motivo
È meccanica di integrazione, non significato business del campo.

---

## 5. Scenari sostenibili

## 5.1 Sola lettura da ERP
### Scenario consigliato V1
L’app definisce il campo personalizzato tenant-scoped e lo collega a:
- campo standard ERP
- oppure UDF ERP già esistente

Il valore viene letto da ERP:
- al bootstrap
- on demand
- o con job di sync controllato

### Quando è sostenibile
- il campo ERP esiste già
- la semantica è stabile
- il mapping è uno-a-uno
- il valore è scalare
- il target ERP è chiaro
- non serve creare metadata ERP dinamica

### Esempi buoni
- attributo articolo “famiglia commerciale ERP”
- codice classificazione esterno
- flag semplice già presente come UDF ERP
- data tecnica descrittiva già governata in SAP

### Giudizio
**Fattibile subito**

---

## 5.2 Scrittura verso ERP
### Scenario sostenibile
L’app conserva il proprio metadata campo e scrive il valore verso:
- un campo standard ERP
- oppure un UDF ERP già predisposto

### Quando è sostenibile
- target ERP predefinito
- tipo dato semplice
- semantica controllata
- regole di validazione allineate
- write path esplicitamente abilitato
- nessuna necessità di creare UDF runtime

### Esempi buoni
- scrittura di un attributo descrittivo articolo su UDF articolo già predisposto
- invio di un riferimento applicativo leggibile verso UDF documento
- scrittura di un flag operativo semplice e non critico

### Rischi
- mismatch di tipo/valid values
- campi obbligatori ERP
- differenze per company database
- conflitti con automazioni ERP / query / UDV / add-on

### Giudizio
**Fattibile con vincoli**

---

## 5.3 Bidirezionale
### Scenario sostenibile solo in casi limitati
La bidirezionalità è sostenibile solo dove:
- il campo è scalare
- il significato è univoco
- non esistono formule/derivazioni concorrenti
- esiste ownership chiara del dato
- il target ERP è predefinito
- il conflitto è gestibile
- la criticità operativa è bassa o media

### Esempi potenzialmente sostenibili
- campo descrittivo semplice
- codice ausiliario
- riferimento esterno non transazionale
- flag non critico

### Esempi non sostenibili in V1
- campi che influenzano logiche operative complesse
- insiemi di attributi multiriga
- collezioni
- campi dipendenti da workflow o approvazioni
- attributi che impattano versioning, ciclo, modello produttivo, ODP o qualità in modo critico

### Giudizio
**Bidirezionale solo dove realmente sostenibile e con allowlist molto stretta**

---

## 6. Limiti del Service Layer per campi custom e mapping dinamici

## 6.1 Limite 1 — metadata variabile per company database
Poiché UDF/UDT/UDO cambiano da database a database, il metadata del Service Layer non è una base stabile per progettare un motore attributi SaaS globale.

### Implicazione
Il mapping deve essere:
- per tenant
- per connettore/company
- esplicito
- versionabile lato app

Non può essere “universale” a livello prodotto.

---

## 6.2 Limite 2 — UDT semplici solo per “no object”
Le UDT direttamente trattabili come semplici entità sono quelle di tipo **no object**.

### Implicazione
Non conviene basare la V1 su UDT/UDO custom come strategia generalizzata per ospitare il motore attributi dinamici in SAP.

---

## 6.3 Limite 3 — UDO/metadata management esistono, ma allargano troppo il perimetro
Il Service Layer permette CRUD e metadata management anche per UDO/UDF/UDT.

### Implicazione
Questo **non** significa che sia una scelta sostenibile per la V1.
Creare o alterare metadata ERP runtime per tenant:
- amplia l’autorizzazione richiesta
- introduce divergenza tra tenant/company
- complica deploy e governance
- sposta troppo valore strutturale fuori dall’app

---

## 6.4 Limite 4 — open type ≠ motore dinamico illimitato
Il fatto che i UDF siano esposti come proprietà dinamiche/open type non rende sostenibile un mapping runtime arbitrario su qualunque oggetto ERP.

### Implicazione
Serve comunque:
- catalogo target supportati
- tipi consentiti
- regole di naming
- validazione
- direzione del flusso
- ownership del dato

---

## 6.5 Limite 5 — concorrenza e conflitti
Per le scritture concorrenti il Service Layer supporta ETag/If-Match per evitare blind updates.

### Implicazione
Se si apre la bidirezionalità su campi dinamici, il sistema deve almeno prevedere:
- version check / optimistic concurrency
- gestione conflitto
- log tecnico
- fallback manuale

Per V1 conviene ridurre drasticamente i casi bidirezionali.

---

## 6.6 Limite 6 — webhook/eventing esiste ma non elimina il problema semantico
Il Service Layer supporta webhooks e l’event catalog include anche UDO e UDT.

### Implicazione
Questo può aiutare la sincronizzazione tecnica futura, ma non risolve il confine tra:
- metadata campo
- valore
- mapping
- dominio nativo app

Quindi non giustifica un’apertura ampia della V1.

---

## 7. Modello raccomandato per Esyy Flow

## 7.1 Metadata campo = nativo app
Da modellare in tabelle tenant-scoped di configurazione, non in ERP.

### Esempio concettuale
- `cfg_field_definitions`
- `cfg_field_groups`
- `cfg_field_option_values`
- `cfg_field_context_bindings`

### Contenuti
- codice campo
- label
- tipo logico
- enum/lookup
- required
- visibilità
- contesto di utilizzo
- audit configurazione

---

## 7.2 Valore campo = nativo app
Il valore deve stare nel dominio Esyy Flow, non nell’ERP come fonte primaria universale.

### Esempio concettuale
- `product_attribute_values`
- `project_attribute_values`
- `production_order_attribute_values`
- ecc.

oppure un pattern equivalente, purché coerente con DB-00 e con la queryabilità attesa.

---

## 7.3 Binding ERP = `int_*`
Va separato in oggetti tecnici di integrazione.

### Estensione raccomandata
- `int_field_bindings`
- `int_field_binding_versions` (solo se serve)
- `int_field_sync_states` (solo se emerge un bisogno reale)
- uso di:
  - `int_external_links`
  - `int_sync_runs`
  - `int_message_logs`

### Campi minimi consigliati in `int_field_bindings`
- `id`
- `tenant_id`
- `code`
- `status`
- `app_field_definition_id`
- `source_system_code`
- `erp_entity_set`
- `erp_object_type` o equivalente
- `erp_field_name`
- `erp_is_udf`
- `direction_mode` (`read_only`, `write_only`, `bidirectional`)
- `sync_mode` (`bootstrap`, `manual`, `scheduled`, `event_driven`)
- `is_enabled`
- `created_at`
- `updated_at`

### Nota
`int_external_links` resta per il **legame oggetto app ↔ oggetto ERP**.  
`int_field_bindings` serve invece per il **legame definizione campo app ↔ target campo ERP**.

---

## 8. Cosa è fattibile subito

## 8.1 Lettura di UDF/campi ERP già esistenti
Fattibile subito:
- mappare campi app a campi ERP esistenti
- leggere valori da ERP per bootstrap o sync controllata
- usare allowlist di oggetti ERP supportati

### Perimetro consigliato V1
- articoli
- business partner
- eventuali documenti già prototipati/validati
- eventuali oggetti ERP stabili e già nel perimetro integrazione

---

## 8.2 Scrittura one-way verso ERP su campi già predisposti
Fattibile subito con perimetro molto controllato:
- scrittura verso UDF ERP già creati
- niente creazione automatica metadata
- niente mapping libero per tenant verso qualunque oggetto ERP

---

## 8.3 Metadata e UX del campo completamente in app
Fattibile subito e raccomandato:
- definizione del campo
- raggruppamento
- permessi/visibilità
- regole di presentazione
- audit configurazione
- enablement per tenant/modulo

---

## 9. Cosa è fattibile con vincoli

## 9.1 Scrittura verso ERP
Consentita solo se:
- target ERP è in allowlist
- tipo dato è in allowlist
- semantica è semplice
- il campo ERP esiste già
- esiste binding esplicito
- esiste fallback log/manuale

### Tipi consigliati V1
- testo breve
- numero/decimale semplice
- data
- boolean
- enum a lista chiusa

### Tipi da evitare in V1
- multivalue
- rich text
- allegati
- griglie/collezioni
- strutture JSON-like
- riferimenti multipli

---

## 9.2 Bidirezionale
Consentita solo con tutti questi vincoli:
- ownership chiara
- criticità bassa/media
- mapping 1:1
- tipo semplice
- assenza di logiche concorrenti ERP/app
- conflitto gestibile
- ETag/optimistic concurrency dove disponibile

### Regola pratica V1
La bidirezionalità deve essere **eccezione approvata**, non comportamento standard.

---

## 9.3 Uso di UDO/UDT
Possibile solo in casi mirati:
- use case realmente specialistico
- vantaggio netto rispetto a UDF su oggetto standard
- schema ERP già governato
- impatto di authorizations, governance e lifecycle accettato

### Regola pratica V1
Non usare UDO/UDT come base generale del sistema attributi tenant-scoped.

---

## 10. Cosa deve restare fuori V1

## 10.1 Creazione automatica di metadata ERP
Fuori V1:
- creazione runtime di UDF per tenant
- creazione runtime di UDT/UDO come comportamento standard prodotto
- alterazione automatica del modello ERP a fronte di nuove definizioni campo app

---

## 10.2 Mapping completamente libero
Fuori V1:
- tenant che mappa liberamente ogni campo app su qualunque oggetto ERP
- mapping multi-hop o molti-a-uno arbitrario
- mapping su righe/collezioni senza perimetro prototipato

---

## 10.3 ERP come sistema di metadata primario
Fuori V1:
- usare SAP B1 come sorgente principale del catalogo campi dinamici tenant-scoped
- derivare da ERP la semantica UX/tenant del campo
- far dipendere il motore attributi app dal metadata variabile di ogni company DB

---

## 10.4 Bidirezionalità ampia
Fuori V1:
- attributi dinamici critici su ODP, fasi, qualità, costi, conto lavoro completo
- campi che alterano workflow, avanzamenti, conformità o semantica processo
- sincronizzazione in tempo reale generalizzata campo-per-campo

---

## 11. Vincoli raccomandati per la V1

1. **Metadata campo sempre app-native**
2. **ERP target in allowlist**
3. **Scrittura solo su campi ERP/UDF già esistenti**
4. **Bidirezionalità solo per eccezioni approvate**
5. **No creazione automatica metadata ERP**
6. **Tipi dato consentiti solo se semplici**
7. **Mapping 1:1 in V1**
8. **Ogni binding ERP tenant-scoped nel layer `int_*`**
9. **Run, errori e retry sempre tracciati in `int_sync_runs` / `int_message_logs`**
10. **Nessun campo ERP raw nel core domain**

---

## 12. Raccomandazione finale

La strategia sostenibile è questa:

### App
- possiede il motore attributi dinamici tenant-scoped
- possiede il metadata funzionale del campo
- possiede il valore applicativo nel dominio

### ERP
- può fornire o ricevere valori selezionati
- può ospitare UDF già predisposti
- può essere endpoint tecnico di sincronizzazione controllata

### Layer `int_*`
- governa binding, riconciliazione, run, log, drift e conflitti

Questa impostazione consente di:
- tenere Esyy Flow app-centrico
- evitare un perimetro fragile o ingestibile in V1
- supportare use case realistici subito
- lasciare aperta un’evoluzione futura senza compromettere il dominio

---

## 13. Esito sintetico

### Fattibile subito
- lettura ERP di campi standard/UDF già esistenti
- metadata campo nativo app
- binding ERP nel layer `int_*`

### Fattibile con vincoli
- scrittura verso ERP su target già predisposti
- bidirezionale solo per casi selettivi e semplici
- uso mirato di UDO/UDT solo se realmente giustificato

### Fuori V1
- metadata ERP dinamico runtime
- motore di mapping libero/generalizzato
- bidirezionalità estesa
- ERP come backend del motore attributi tenant-scoped
