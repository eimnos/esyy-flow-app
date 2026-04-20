# OLE-02 — Piano di prototipazione tecnica delle criticità prioritarie

## 1. Scopo del deliverable

OLE-02 traduce la baseline OLE-01 in un piano di **prototipazione tecnica guidata dal rischio**.

Il deliverable non definisce ancora:

- connettori completi;
- implementazione estesa del Service Layer;
- mapping campo-per-campo esaustivo;
- infrastruttura definitiva di code, runtime e deployment.

Definisce invece **quali criticità vanno prototipate prima**, **quali casi validare**, **quale ipotesi tecnica testare**, **quale esito atteso ottenere**, **quali rischi di blocco presidiare** e **con quale criterio classificare ogni criticità come chiusa, ridotta o ancora aperta**.

## 2. Baseline di riferimento

Il lavoro si fonda su cinque vincoli già approvati:

1. **Esyy Flow resta app-centrico**: SAP Business One è sistema integrato ma non dominante sulle logiche operative di produzione, MES, conto lavoro, qualità e tracciabilità.
2. **Service Layer SAP Business One** è la baseline primaria da usare per la validazione tecnica iniziale.
3. **DI API** resta fallback mirato e non baseline di progetto.
4. **Le integrazioni devono essere riconciliabili**, con ownership del dato esplicita, stato di sincronizzazione visibile e fallback manuali gestibili.
5. **Lo schema dati deve rispettare DB-00**, in particolare tenant scope, chiavi tecniche UUID, separazione tra dominio core e layer `int_*`, naming prevedibile e derivazione obbligatoria delle tabelle figlie.

## 3. Criterio di priorità dei prototipi

La priorità non è assegnata per complessità tecnica pura ma per **potenziale di blocco del workstream sviluppo**.

### Criteri usati

1. **Blocco architetturale**: senza la decisione il team sviluppo non può modellare in sicurezza il dominio o il layer integrazione.
2. **Dipendenza trasversale**: il tema impatta più workstream (ODP, MES, WIP, conto lavoro, admin integrazioni).
3. **Irreversibilità del modello**: una scelta errata costringerebbe a rifare chiavi, stato, eventi o document model.
4. **Confine app vs ERP**: serve chiarire dove finisce l’ownership applicativa e dove inizia l’effetto ERP.
5. **Rischio di falso avanzamento**: sviluppo apparentemente rapido ma destinato a rework se il prototipo non conferma l’ipotesi.

## 4. Ordine di priorità proposto

| Priorità | Prototipo | Motivo della priorità |
| --- | --- | --- |
| **P1** | **ODP bidirezionali** | Decide il modello di ownership, le chiavi esterne principali e il confine operativo tra Esyy Flow e SAP su uno degli oggetti più centrali del prodotto. |
| **P2** | **Movimenti di magazzino legati alla produzione** | Condiziona MES, avanzamento fase, materiali effettivi, WIP, dichiarazioni e contabilità logistica minima. |
| **P3** | **Conto lavoro passivo / documenti logistici minimi** | È la criticità più esposta a mismatch tra dominio applicativo e modello documentale ERP. |
| **P4** | **Chiavi di riconciliazione e schema `int_*`** | Senza questo non si può implementare in modo robusto idempotenza, stato sync, retry, audit integrazione e fallback manuale. |
| **P5** | **Bootstrap articoli / strutture minime ERP** | È importante ma meno bloccante se si chiarisce prima il perimetro operativo di ODP e movimenti. |

## 5. Vista sintetica dei prototipi

| Priorità | Caso da validare per primo | Ipotesi tecnica da testare | Esito atteso | Rischio di blocco se fallisce |
| --- | --- | --- | --- | --- |
| **P1** | Creazione ODP da app verso SAP + aggiornamento stato | `ProductionOrders` via Service Layer è sufficiente per un round-trip minimo governabile con chiavi stabili (`AbsoluteEntry`, `DocumentNumber`) e update di stato controllati | Conferma del set minimo di campi, delle azioni consentite e del modello di ownership | **Altissimo** |
| **P2** | Issue for production + receipt from production collegati a ODP | `InventoryGenExits` e `InventoryGenEntries` permettono di registrare gli effetti logistici minimi della produzione con riferimento coerente all’ordine | Conferma del modello documentale minimo per consumi e dichiarazioni produzione | **Altissimo** |
| **P3** | Invio a terzista + rientro parziale | Il conto lavoro V1 può essere governato in app e riflesso in SAP con soli documenti logistici minimi, senza demandare all’ERP il dominio completo della fase esterna | Conferma del perimetro documentale ERP minimo accettabile per V1 | **Alto** |
| **P4** | Link esterno su oggetti bidirezionali + tracciamento sync run | Un layer `int_*` minimo basta a governare external link, sync run, retry e stato per oggetto senza inquinare il core domain | Conferma delle tabelle minime e delle chiavi di univocità del layer integrazione | **Altissimo** |
| **P5** | Import selettivo articoli + magazzini + BOM ERP minima | Il bootstrap utile in V1 può essere selettivo e non richiede mirror completo dell’ERP | Conferma di scope minimo del bootstrap e dei confini di sincronizzazione continua | **Medio** |

## 6. Prototipo P1 — ODP bidirezionali

### 6.1 Obiettivo

Validare se l’ordine di produzione può essere gestito come oggetto **bidirezionale ma con ownership applicativa prevalente**, mantenendo SAP come sistema integrato per il documento ERP ufficiale.

### 6.2 Oggetti SAP B1 coinvolti

- `ProductionOrders`
- azioni/stati associati all’ordine di produzione
- eventuale lettura delle relazioni con articolo, warehouse e documenti collegati

### 6.3 Casi da validare per primi

1. **Creazione da app verso SAP** di un ODP con set minimo:
   - articolo;
   - quantità pianificata;
   - data di scadenza;
   - magazzino principale, se richiesto.
2. **Import da SAP verso app** di un ODP creato o modificato fuori Esyy Flow.
3. **Aggiornamento stato** dell’ODP (es. pianificato/rilasciato/chiuso/cancellato, nei limiti del Service Layer).
4. **Aggiornamento controllato di campi non strutturali** dopo la creazione.
5. **Conflitto di ownership**: modifica in SAP e in app sullo stesso ODP tra due sync consecutivi.

### 6.4 Ipotesi tecnica da testare

- Il Service Layer espone `ProductionOrders` con operazioni GET/POST/PATCH e con set minimo sufficiente per creare e aggiornare l’ordine ERP.
- Le chiavi ERP `AbsoluteEntry` e `DocumentNumber` sono sufficienti per il collegamento esterno e per la riconciliazione a livello documento.
- Esyy Flow può mantenere il proprio `production_orders.id` come PK tecnica e usare il layer `int_external_links` per agganciare l’ODP ERP.
- Le fasi reali, i materiali effettivi e gli eventi operativi dettagliati restano **app-native** e non devono essere modellati come round-trip completo su SAP in V1.

### 6.5 Esito atteso della validazione

Il prototipo è considerato riuscito se chiarisce in modo netto:

- quali campi dell’ODP sono davvero governabili in round-trip;
- quale sistema è master per ciascuna famiglia di attributi;
- quali stati/azioni sono realmente supportati dal Service Layer;
- quale conflitto viene gestito come blocco, quale come warning e quale come refresh forzato.

### 6.6 Rischi di blocco per lo sviluppo

- Disegnare il dominio ODP app come se fosse uno specchio dell’ERP.
- Costruire UI e workflow operativi senza sapere quali campi possano essere aggiornati o no su SAP.
- Modellare male l’origine dell’ODP e il collegamento con commessa / OdV MTO / approvvigionamento.
- Introdurre logiche di stato app incompatibili con il documento SAP.

### 6.7 Criterio di uscita

**Chiusa**
- esiste un set minimo di create/update stabile;
- ownership app/ERP è definita per le principali famiglie di dati;
- chiavi di riconciliazione e casi di conflitto sono classificati.

**Ridotta**
- la creazione funziona ma rimangono aperti alcuni update o stati;
- serve limitare V1 a un sottoinsieme più piccolo del lifecycle ODP.

**Ancora aperta**
- il Service Layer non consente un round-trip affidabile minimo;
- non è possibile definire un confine stabile tra stato ERP e stato app.

## 7. Prototipo P2 — Movimenti di magazzino legati alla produzione

### 7.1 Obiettivo

Validare il modello documentale minimo per tradurre in SAP gli eventi operativi di produzione che nascono da MES e ufficio produzione.

### 7.2 Oggetti SAP B1 coinvolti

- `InventoryGenExits`
- `InventoryGenEntries`
- `InventoryTransferRequests`
- eventuali trasferimenti logistici collegati al WIP

### 7.3 Casi da validare per primi

1. **Issue for production** da dichiarazione consumo o conferma materiale.
2. **Receipt from production** da dichiarazione buono / chiusura fase / chiusura ODP.
3. **Movimento parziale** su quantità inferiore al pianificato.
4. **Rettifica / annullamento / documento di cancellazione** nei limiti concessi dal Service Layer.
5. **Movimento WIP** minimo tra magazzino, postazione e fase, chiarendo se in V1 serva documento ERP immediato o se basti un effetto applicativo con export differito.

### 7.4 Ipotesi tecnica da testare

- `InventoryGenExits` è sufficiente per rappresentare il consumo di produzione minimo.
- `InventoryGenEntries` è sufficiente per rappresentare il carico di produzione minimo.
- Il collegamento al contesto produttivo può essere ricostruito attraverso riferimenti al documento ERP e al link esterno dell’ODP, senza imporre all’ERP l’intera granularità MES.
- Per il WIP di fase non tutto deve essere rappresentato in ERP in tempo reale: una parte può restare app-native se non genera un obbligo logistico-contabile immediato.

### 7.5 Esito atteso della validazione

- Definizione del set minimo di eventi applicativi che generano documento ERP.
- Distinzione chiara tra:
  - evento solo app;
  - evento app con export ERP immediato;
  - evento app con export differito o aggregato.
- Regola chiara su storno/cancellazione e su gestione di parziali.

### 7.6 Rischi di blocco per lo sviluppo

- Implementare dichiarazioni MES senza sapere quali generano subito documento ERP.
- Confondere WIP operativo di fase con movimentazione ERP obbligatoria.
- Costruire un modello di materiali effettivi non riconciliabile con i documenti SAP.
- Non avere un criterio idempotente per evitare duplicati documento.

### 7.7 Criterio di uscita

**Chiusa**
- esiste una mappa stabile evento app -> documento ERP minimo;
- issue e receipt sono validati almeno sul caso standard e sul parziale;
- è definita la regola di storno/cancellation.

**Ridotta**
- issue e receipt standard sono confermati, ma WIP o storni complessi restano da limitare in V1.

**Ancora aperta**
- non emerge un modello documentale semplice e ripetibile;
- l’export dei movimenti risulta troppo ambiguo rispetto al dominio applicativo.

## 8. Prototipo P3 — Conto lavoro passivo / documenti logistici minimi

### 8.1 Obiettivo

Validare il **confine documentale minimo** con cui rappresentare in SAP il conto lavoro passivo, lasciando in Esyy Flow la gestione ricca della fase esterna.

### 8.2 Oggetti SAP B1 coinvolti

Da confermare tramite prototipo, con priorità a:

- documenti logistici di trasferimento / richiesta trasferimento;
- eventuali documenti di carico/scarico per invio e rientro;
- eventuale supporto di documenti acquisto/servizio solo se davvero indispensabili al perimetro V1.

### 8.3 Casi da validare per primi

1. **Invio a terzista** con quantità da lavorare.
2. **Invio con quantità di riserva** distinta dalla quantità da lavorare.
3. **Rientro parziale** con quantità buone.
4. **Rientro con quantità non lavorata / da restituire**.
5. **Rientro con non conforme** che deve restare app-native come evento qualità ma produrre eventualmente effetto logistico ERP.

### 8.4 Ipotesi tecnica da testare

- Il dominio della fase esterna resta nell’app: quantità per natura, materiali associati, eventi qualità, ritardi, costi e tracciabilità.
- SAP riceve solo i documenti logistici minimi necessari a rappresentare invio/rientro e giacenze fuori sede.
- In V1 non è necessario modellare in SAP tutto il lifecycle economico e qualitativo del subcontracting.
- L’associazione tra fase esterna app e documenti ERP può essere governata dal layer `int_*` senza introdurre campi ERP-specifici nel core domain.

### 8.5 Esito atteso della validazione

- Decisione chiara sul documento ERP minimo per invio e rientro.
- Decisione chiara su cosa resta solo in app: riserva, non lavorato, NC, ritardo, evento qualità, dettaglio di fase.
- Regola esplicita su quali quantità vanno aggregate nel documento ERP e quali restano nel dominio operativo applicativo.

### 8.6 Rischi di blocco per lo sviluppo

- Costruire la fase esterna con un modello applicativo impossibile da riflettere in ERP.
- Spostare troppo presto sull’ERP concetti che devono restare app-centrici.
- Bloccare UI e workflow di invio/rientro in attesa di una modellazione contabile troppo pesante.

### 8.7 Criterio di uscita

**Chiusa**
- il documento ERP minimo è individuato;
- il confine app vs ERP è chiaro per invii, rientri ed esiti principali;
- le chiavi di collegamento tra fase esterna e documenti ERP sono definite.

**Ridotta**
- il caso standard invio/rientro è chiaro ma restano dubbi su NC/non lavorato/riserva;
- V1 può partire con limitazioni esplicite.

**Ancora aperta**
- non emerge un modello documentale ERP abbastanza lineare per sostenere il conto lavoro V1.

## 9. Prototipo P4 — Chiavi di riconciliazione e schema `int_*`

### 9.1 Obiettivo

Validare la struttura minima del layer integrazione che consente di gestire:

- mapping oggetti app <-> ERP;
- sync run;
- stato di sincronizzazione per oggetto;
- retry;
- payload tecnici e checksum;
- visibilità amministrativa minima nell’area integrazioni.

### 9.2 Oggetti applicativi da presidiare

Almeno per:

- articoli core;
- business partner rilevanti;
- ordini di vendita importati;
- ordini di produzione;
- movimenti di magazzino;
- invii/rientri di conto lavoro.

### 9.3 Casi da validare per primi

1. **Un oggetto app con un link ERP attivo** e univoco.
2. **Un oggetto senza link ancora creato** ma candidato alla sincronizzazione.
3. **Sync run** con più item e stati diversi (ok, warning, failed, skipped).
4. **Retry tecnico** su item fallito senza duplicare il documento ERP.
5. **Supporto amministrativo**: visibilità minima del motivo di errore e dello stato dell’ultimo tentativo.

### 9.4 Ipotesi tecnica da testare

Il layer minimo può essere separato in famiglia logica `int_*` coerente con DB-00, ad esempio con oggetti concettuali del tipo:

- `int_external_links`
- `int_sync_runs`
- `int_sync_run_items`
- `int_sync_errors` oppure struttura equivalente
- eventuale `int_outbox_messages` / `sys_outbox_messages` da decidere in fase successiva

Le ipotesi chiave sono:

- il core domain non deve contenere direttamente chiavi ERP come PK o FK applicative;
- `tenant_id` deve restare obbligatorio sugli oggetti di integrazione riferiti a entità tenant-scoped;
- `code`, `document_no` e `version_no` restano identificativi business, non sostitutivi della PK tecnica;
- il prefisso `int_` è convenzione di naming/logical grouping e non impone ancora una separazione fisica di schema.

### 9.5 Esito atteso della validazione

- Elenco delle tabelle minime del layer integrazione.
- Chiave di univocità del link esterno per oggetto e sistema sorgente/destinazione.
- Regola minima per idempotenza tecnica.
- Tracciato minimo dei campi che servono davvero a supportare il workstream sviluppo.

### 9.6 Rischi di blocco per lo sviluppo

- Inquinare le tabelle core con campi ERP-specifici difficili da governare.
- Implementare sync e retry senza uno stato per oggetto e senza chiavi di idempotenza.
- Disegnare male l’area “Integrazioni ERP / Service Layer” lato admin perché manca un modello tecnico minimo sottostante.
- Violare DB-00 su tenant scope, naming e separazione delle famiglie di tabelle.

### 9.7 Criterio di uscita

**Chiusa**
- il layer `int_*` minimo è definito a livello concettuale;
- esistono regole chiare su external link, sync run, retry e stato oggetto;
- il modello è coerente con DB-00.

**Ridotta**
- external link e sync run sono chiari, ma retry/idempotenza richiedono un approfondimento successivo.

**Ancora aperta**
- non emerge una struttura minima stabile per governare la riconciliazione;
- permane il rischio di modellare l’integrazione direttamente nel core domain.

## 10. Prototipo P5 — Bootstrap articoli / strutture minime ERP

### 10.1 Obiettivo

Validare il **bootstrap utile** per avviare un tenant senza costruire una replica completa dell’ERP.

### 10.2 Oggetti SAP B1 coinvolti

- `Items`
- `BusinessPartners` (solo se rilevanti all’avvio)
- `ProductTrees` come bootstrap selettivo
- riferimenti logistici minimi come magazzini e codifiche operative necessarie

### 10.3 Casi da validare per primi

1. Import selettivo di **articoli core** necessari al primo flusso produttivo.
2. Import di **magazzini** e riferimenti logistici minimi.
3. Import di **BOM ERP** solo come bootstrap iniziale, non come master operativo continuo.
4. Decisione sul set di attributi articolo da considerare obbligatorio in V1.
5. Gestione di un articolo creato in app che successivamente deve esistere anche in ERP.

### 10.4 Ipotesi tecnica da testare

- Il bootstrap V1 può essere **selettivo e guidato**, non full sync.
- `Items` deve restare la sorgente ERP per il set anagrafico minimo condiviso, ma Esyy Flow può arricchire l’articolo con attributi produttivi propri.
- `ProductTrees` può servire solo come sorgente iniziale, da tradurre in DIBA app-versionata, senza introdurre round-trip continuo.
- Il valore del bootstrap non è la completezza, ma la riduzione del tempo di onboarding operativo del tenant.

### 10.5 Esito atteso della validazione

- Definizione dello scope minimo bootstrap.
- Distinzione netta tra:
  - dato da import inizialmente;
  - dato da mantenere sincronizzato;
  - dato solo app-native.
- Chiarezza sul rapporto tra articolo ERP e librerie produttive app.

### 10.6 Rischi di blocco per lo sviluppo

- Costruire l’articolo app come semplice copia impoverita dell’articolo ERP.
- Dare per scontato che BOM ERP e DIBA app coincidano semanticamente.
- Sovraccaricare il bootstrap di campi non necessari al primo rilascio.

### 10.7 Criterio di uscita

**Chiusa**
- esiste un catalogo minimo di dati bootstrap V1;
- il confine tra import una tantum e sincronizzazione continua è definito;
- il bootstrap non mette in discussione l’app-centricità del modello.

**Ridotta**
- articoli e magazzini sono chiari, ma il bootstrap delle strutture produttive resta limitato o rinviato.

**Ancora aperta**
- il bootstrap richiede un mirror troppo esteso dell’ERP per essere sostenibile in V1.

## 11. Rischi trasversali da presidiare

### 11.1 Rischio di dominio
Il rischio principale è trasferire troppo presto nell’ERP logiche che il progetto ha già deciso di mantenere in Esyy Flow: ODP come istanza reale, fasi, materiali effettivi, fase esterna, quantità per natura, esiti, WIP, tracciabilità.

### 11.2 Rischio di modellazione dati
Il rischio principale è sporcare il core domain con chiavi e stati ERP, violando DB-00 e rendendo fragile l’evoluzione del prodotto.

### 11.3 Rischio di falso MVP
Un MVP di integrazione “veloce” ma non prototipato sui punti corretti può generare rework su:

- modello ODP;
- materiali effettivi e dichiarazioni MES;
- conto lavoro;
- area integrazioni admin;
- layer dati `int_*`.

### 11.4 Rischio di ambiguità di ownership
Se non si definisce per ogni area chi è master del dato, lo sviluppo tende a produrre sincronizzazioni bidirezionali implicite e non governabili.

## 12. Regola di classificazione delle criticità

Per tutta OLE-02 si adotta questa tassonomia.

### Criticità **chiusa**
Una criticità è chiusa quando:

- l’ipotesi tecnica principale è confermata;
- il confine app vs ERP è definito;
- le chiavi di riconciliazione minime sono identificate;
- il team sviluppo può partire senza assumere comportamenti impliciti.

### Criticità **ridotta**
Una criticità è ridotta quando:

- il caso principale è chiarito;
- restano zone grigie ma circoscritte;
- è possibile limitare consapevolmente il perimetro V1;
- il rischio residuo è noto e non blocca il modello principale.

### Criticità **ancora aperta**
Una criticità resta aperta quando:

- l’ipotesi tecnica non è confermata;
- non è possibile definire un documento/oggetto ERP minimo stabile;
- il rischio impatta direttamente il modello dati o il lifecycle operativo;
- procedere nello sviluppo produrrebbe quasi certamente rework strutturale.

## 13. Sequenza operativa consigliata per OLE-02

1. **P1 — ODP bidirezionali**
2. **P4 — chiavi di riconciliazione e schema `int_*`**
3. **P2 — movimenti legati alla produzione**
4. **P3 — conto lavoro passivo / documenti logistici minimi**
5. **P5 — bootstrap articoli / strutture minime ERP**

### Motivo della sequenza

- Prima si chiarisce il documento operativo più centrale (**ODP**) e il suo collegamento tecnico (**`int_*`**).
- Poi si definiscono gli effetti logistici della produzione.
- Solo dopo si attacca il caso più ambiguo, cioè il **conto lavoro passivo**.
- Infine si stabilizza il **bootstrap** senza lasciare che esso condizioni impropriamente il dominio applicativo.

## 14. Esito atteso di OLE-02

Alla chiusura di OLE-02 il progetto deve avere:

- un ordine chiaro dei prototipi da eseguire;
- una definizione dei casi da validare per ciascuna criticità;
- ipotesi tecniche verificabili e non generiche;
- un criterio univoco per decidere se ogni criticità è chiusa, ridotta o ancora aperta;
- una base abbastanza concreta da aprire il successivo step tecnico senza ambiguità sul perimetro V1.

## 15. Confini espliciti fuori da OLE-02

OLE-02 non decide ancora:

- il design finale del connettore Service Layer;
- la struttura definitiva dei job/runtime/queue;
- il mapping completo di tutti i campi SAP B1;
- il set completo dei prototipi successivi oltre le priorità indicate;
- le scelte infrastrutturali definitive di deploy e sicurezza;
- il dettaglio UI della cabina integrazioni oltre il minimo necessario a supportare stato/errori/riconciliazione.

