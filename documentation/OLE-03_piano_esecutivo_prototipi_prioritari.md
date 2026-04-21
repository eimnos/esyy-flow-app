# OLE-03 — Piano esecutivo dei prototipi prioritari

## 1. Scopo del deliverable

OLE-03 trasforma la baseline analitica di OLE-01/OLE-02 in un **piano di prototipazione eseguibile e verificabile** per il workstream integrazioni.

Il documento mantiene un taglio pratico ma **non implementativo esteso**. Non definisce ancora:
- connettori completi;
- orchestrazione definitiva runtime;
- retry policy finale;
- sviluppo Service Layer produttivo;
- mapping campo-per-campo esaustivo.

Definisce invece **quali prove eseguire per prime**, con quali prerequisiti, quali input/output osservare, quali endpoint SAP Business One toccare e quale decisione ogni prova deve sbloccare.

## 2. Principi di esecuzione

Il piano resta coerente con la baseline di progetto:
- **Esyy Flow app-centrico**;
- ERP integrato ma non dominante;
- **Service Layer SAP Business One** come baseline primaria;
- **DI API** solo come fallback mirato se una criticità non è chiudibile con Service Layer;
- coerenza con **DB-00**, in particolare su UUID, tenant scope, separazione core domain vs `int_*`, naming prevedibile e FK sempre tecniche.

## 3. Ordine esecutivo dei prototipi

Ordine vincolante da mantenere:

1. **P1 — ODP bidirezionali**
2. **P4 — Chiavi di riconciliazione e schema `int_*`**
3. **P2 — Movimenti di magazzino legati alla produzione**
4. **P3 — Conto lavoro passivo / documenti logistici minimi**
5. **P5 — Bootstrap articoli / strutture minime ERP**

### Motivo dell’ordine

- **P1** sblocca il cuore del workstream integrazioni e chiarisce se il modello ODP di Esyy Flow può convivere con `ProductionOrders` SAP B1 senza ambiguità.
- **P4** va anticipato subito dopo P1 perché impedisce derive strutturali nel lavoro di Isabell e Nikolay.
- **P2** dipende da P1 e P4: i movimenti vanno provati solo dopo aver chiarito chiavi, origine e riferimenti base.
- **P3** dipende da P2 per verificare se il conto lavoro minimo può essere costruito con documenti logistici standard.
- **P5** chiude il perimetro minimo di bootstrap e si appoggia alle scelte già emerse su chiavi e oggetti.

## 4. Contesto tecnico aggiuntivo emerso

È disponibile localmente una nuova area applicativa `/pre-industrializzazione`, già agganciata alla app shell e protetta dal flusso auth/tenant, ma ancora in empty state e non ancora mergeata su `main` (branch pronto: `feat/md10-production-model-detail`, stackato su MD-10). Questo non costituisce prerequisito bloccante per i prototipi ERP, ma può diventare utile come punto di atterraggio UI per il prototipo **P5** una volta effettuato il checkpoint applicativo combinato MD-10 + MD-11.

## 5. Piano esecutivo per prototipo

---

## P1 — ODP bidirezionali

### 5.1 Obiettivo della prova
Verificare se il Service Layer consente un ciclo minimo credibile di:
- lettura ODP esistenti da SAP B1;
- creazione ODP da Esyy Flow verso SAP B1;
- aggiornamento controllato di campi/stato ODP;
- riconciliazione stabile fra chiave ERP e chiave applicativa.

### 5.2 Prerequisiti minimi
- accesso a un tenant/demo SAP B1 con Service Layer attivo;
- utente tecnico con permessi sufficienti su `ProductionOrders`;
- almeno un articolo producibile già presente su ERP;
- almeno una commessa / ordine di vendita di test, se si vuole verificare anche il collegamento di origine;
- definizione preliminare di una tabella di collegamento `int_external_links` oppure equivalente;
- convenzione minima già approvata per: `tenant_id`, `source_system`, `entity_type`, `external_id`, `external_code`, `sync_status`.

### 5.3 Input attesi
- articolo ERP producibile (`ItemNo` / `ItemCode` coerente);
- payload minimo per creazione ODP: articolo, quantità pianificata, date, magazzino se richiesto;
- eventuale riferimento origine Esyy Flow: UUID ODP applicativo, UUID commessa, eventuale origine da OdV MTO.

### 5.4 Output attesi
- ODP SAP B1 creato correttamente con identificativo ERP valorizzato;
- recupero dell’ODP da Service Layer con chiave tecnica ERP stabile;
- aggiornamento almeno di un set minimo di campi non distruttivi;
- record di riconciliazione persistito nel layer `int_*`.

### 5.5 Endpoint / oggetti Service Layer da toccare
- `POST /b1s/v2/Login`
- `GET /b1s/v2/$metadata`
- `GET /b1s/v2/ProductionOrders`
- `GET /b1s/v2/ProductionOrders(<id>)`
- `POST /b1s/v2/ProductionOrders`
- `PATCH /b1s/v2/ProductionOrders(<id>)`
- `POST /b1s/v2/ProductionOrders(<id>)/Cancel` solo come verifica facoltativa di lifecycle, non come parte obbligatoria del test base
- opzionale: `GET /b1s/v2/Orders(<id>)` se si verifica il collegamento con origine MTO

### 5.6 Criterio di successo
Il prototipo è **successo** se tutte le seguenti condizioni sono vere:
1. l’ODP SAP viene creato o letto senza ambiguità di chiave;
2. la chiave ERP principale da usare nel layer integrazione è identificata in modo stabile;
3. si dimostra che almeno un update controllato è supportato senza rompere la riconciliazione;
4. il team può stabilire un mapping minimale tra ODP applicativo e ODP ERP.

### 5.7 Criterio di fallimento
Il prototipo è **fallito** se emerge uno dei seguenti casi:
- impossibilità di creare o aggiornare `ProductionOrders` nel perimetro richiesto;
- chiave ERP non stabile o non adeguata alla riconciliazione;
- comportamento non deterministico dei cambi stato;
- necessità strutturale di DI API già nel caso minimo.

### 5.8 Evidenze da raccogliere
- request/response HTTP significative;
- entity key reale restituita da SAP (`AbsoluteEntry`/chiave equivalente usata in prova);
- payload minimo funzionante;
- elenco campi effettivamente modificabili in PATCH nel caso minimo;
- tabella decisionale: campi applicativi master in Esyy Flow vs campi ERP derivati;
- esito finale classificato: chiuso / ridotto / aperto.

### 5.9 Impatto atteso su Isabell
- chiarisce il contratto minimo del modulo integrazione ODP;
- evita che Isabell costruisca servizi ODP assumendo chiavi o stati non verificati;
- definisce il boundary fra `production_orders` core e `int_*` di riconciliazione.

### 5.10 Impatto atteso su Nikolay
- sblocca il disegno concreto di `int_external_links`, `int_sync_runs`, eventuale `int_sync_items`;
- chiarisce quale identificativo ERP deve essere persistito e con quali vincoli di unicità;
- evita di modellare FK o unique constraint su chiavi business sbagliate.

### 5.11 Decisione che il prototipo deve permettere di prendere
**Decisione P1:** Service Layer è sufficiente come baseline reale per ODP bidirezionali V1, oppure va aperto subito un fallback DI API per uno specifico sotto-caso.

---

## P4 — Chiavi di riconciliazione e schema `int_*`

### 5.12 Obiettivo della prova
Validare il modello minimo del layer integrazione senza toccare ancora implementazione pesante: chiavi, naming, tenant scope, univocità e separazione netta fra core domain e integrazione.

### 5.13 Prerequisiti minimi
- baseline DB-00 congelata come riferimento vincolante;
- elenco preliminare delle entità da riconciliare: Items, Orders, ProductionOrders, movimenti, ProductTrees;
- scelta iniziale del source system (`sap_b1`);
- definizione preliminare dei casi d’uso da coprire: lookup, sync inbound, sync outbound, retry, audit integrazione.

### 5.14 Input attesi
- UUID applicativi del dominio Esyy Flow;
- identificativi ERP letti dai prototipi P1/P2/P5;
- classificazione dell’oggetto (`entity_type`), direzione flusso, stato sync;
- esempi reali di code business (`ItemCode`, `CardCode`, `DocNum`) e chiavi tecniche ERP.

### 5.15 Output attesi
- set minimo di tabelle `int_*` con naming coerente e scope corretto;
- regole esplicite su unique key, foreign key e campi tecnici;
- chiarimento su quali chiavi restano solo informative e quali sono referenze operative.

### 5.16 Endpoint / oggetti Service Layer da toccare in prova
- `GET /b1s/v2/$metadata`
- `GET /b1s/v2/Items(<key>)`
- `GET /b1s/v2/Orders(<id>)`
- `GET /b1s/v2/ProductionOrders(<id>)`
- `GET /b1s/v2/ProductTrees('<key>')`
- opzionale: `GET /b1s/v2/BusinessPartners('<key>')`

### 5.17 Criterio di successo
Il prototipo è **successo** se produce una convenzione chiara e approvabile su:
1. chiave tecnica applicativa;
2. chiave ERP da salvare;
3. chiavi business informative;
4. unique constraint tenant-scoped;
5. separazione tabellare fra sync runs, external links, eventi di sync e coda errori.

### 5.18 Criterio di fallimento
- impossibilità di determinare una chiave ERP primaria stabile per almeno una delle entità prioritarie;
- necessità di mescolare metadati ERP nel core domain per far funzionare il flusso;
- conflitto strutturale con DB-00.

### 5.19 Evidenze da raccogliere
- bozza ER minima del layer `int_*`;
- matrice chiavi per entità: applicativa / ERP tecnica / business / display;
- proposta di unique key e index minimi;
- esempi di record di riconciliazione per P1 e P2;
- elenco campi vietati nel core domain perché devono vivere in `int_*`.

### 5.20 Impatto atteso su Isabell
- riduce il rischio di introdurre campi ERP-specifici nei modelli core;
- fornisce un contratto dati chiaro prima di scrivere servizi di sync;
- chiarisce come serializzare errori, retry e checksum senza contaminare il dominio.

### 5.21 Impatto atteso su Nikolay
- sblocca la modellazione concreta delle tabelle integrazione;
- definisce vincoli e indici prima che lo sviluppo applicativo crei dipendenze sbagliate;
- rende validabile ogni nuova eccezione al modello dati.

### 5.22 Decisione che il prototipo deve permettere di prendere
**Decisione P4:** il layer `int_*` proposto è sufficiente come base strutturale per tutto il workstream integrazioni, oppure va rivisto prima che Isabell e Nikolay procedano.

---

## P2 — Movimenti di magazzino legati alla produzione

### 5.23 Obiettivo della prova
Verificare il percorso minimo di contabilizzazione ERP per i movimenti originati da produzione/MES:
- issue for production;
- receipt from production;
- eventuale trasferimento logistico minimo collegato al flusso.

### 5.24 Prerequisiti minimi
- esito almeno “ridotto” o “chiuso” di P1 e P4;
- articolo e ODP ERP di test disponibili;
- magazzini ERP di prova identificati;
- regole base su quantità, warehouse code e riferimenti origine;
- dataset minimo coerente con il caso di produzione.

### 5.25 Input attesi
- riferimento ODP ERP o chiave collegata;
- articolo componente / articolo finito;
- quantità di issue e receipt;
- warehouse / eventuale bin allocation se richiesta dal tenant demo;
- riferimento origine Esyy Flow.

### 5.26 Output attesi
- documento ERP di scarico creato correttamente;
- documento ERP di carico creato correttamente;
- relazione verificabile tra movimento e origine produttiva;
- chiarimento se serve o no un `InventoryTransferRequests` nel caso minimo di WIP/trasferimento.

### 5.27 Endpoint / oggetti Service Layer da toccare in prova
- `GET /b1s/v2/ProductionOrders(<id>)`
- `POST /b1s/v2/InventoryGenExits`
- `GET /b1s/v2/InventoryGenExits(<id>)`
- `POST /b1s/v2/InventoryGenEntries`
- `GET /b1s/v2/InventoryGenEntries(<id>)`
- `POST /b1s/v2/InventoryTransferRequests` solo se il caso richiede una richiesta di trasferimento
- `GET /b1s/v2/InventoryTransferRequests(<id>)` se usato
- opzionale di approfondimento successivo: `StockTransferService` / oggetti di trasferimento, se il tenant demo impone quel passaggio

### 5.28 Criterio di successo
Il prototipo è **successo** se:
1. issue e receipt minimi sono eseguibili via Service Layer;
2. si chiarisce quale documento ERP usare per ciascun evento applicativo;
3. è possibile legare ogni movimento all’origine produttiva senza ambiguità;
4. il workstream MES/WIP può proseguire con un mapping eventi→documenti coerente.

### 5.29 Criterio di fallimento
- impossibilità di eseguire issue/receipt minimi via Service Layer;
- necessità di usare già nel caso base un layer più complesso non compatibile con V1;
- tracciabilità insufficiente tra movimento e origine produttiva.

### 5.30 Evidenze da raccogliere
- payload minimi funzionanti per issue e receipt;
- documenti creati e chiavi ERP ritornate;
- elenco campi obbligatori reali emersi in prova;
- valutazione se il flusso WIP minimo passa o no da transfer request / transfer document;
- nota sui limiti di bin location / lotti se emersi.

### 5.31 Impatto atteso su Isabell
- sblocca il mapping eventi MES → documenti ERP;
- chiarisce quali servizi applicativi devono emettere movimenti e con quale granularità;
- evita sviluppo prematuro di logiche WIP basate su ipotesi non provate.

### 5.32 Impatto atteso su Nikolay
- definisce i riferimenti esterni da salvare sui movimenti riconciliati;
- aiuta a modellare eventi tecnici, ledger di sync e relazioni con ODP;
- chiarisce se serve una tabella ponte fra evento applicativo e documento ERP.

### 5.33 Decisione che il prototipo deve permettere di prendere
**Decisione P2:** il flusso V1 dei movimenti produzione può essere basato su `InventoryGenExits` + `InventoryGenEntries` (con eventuale transfer request solo dove necessario), oppure serve un’impostazione diversa.

---

## P3 — Conto lavoro passivo / documenti logistici minimi

### 5.34 Obiettivo della prova
Verificare se il conto lavoro passivo V1 può essere coperto con un set minimo di documenti logistici ERP senza introdurre subito una modellazione troppo pesante lato SAP.

### 5.35 Prerequisiti minimi
- esito almeno “ridotto” o “chiuso” di P2;
- fase esterna/terzista già chiarita funzionalmente;
- business partner fornitore disponibile su ERP;
- articoli/materiali di prova e magazzini di invio/rientro definiti;
- ipotesi minima documentale condivisa: invio, eventuale richiesta di trasferimento, rientro.

### 5.36 Input attesi
- fornitore/terzista di test (`BusinessPartners`);
- articolo / semilavorato / materiale da inviare;
- quantità da lavorare e quantità di riserva se incluse nel caso;
- magazzino origine e magazzino esterno/logistico di destinazione;
- chiave della fase esterna applicativa.

### 5.37 Output attesi
- prova documentata del percorso minimo di invio e rientro;
- chiarimento su quali documenti ERP usare in V1;
- chiarimento su cosa resta solo applicativo in Esyy Flow (esiti per natura, quantità NC, non lavorato, residui).

### 5.38 Endpoint / oggetti Service Layer da toccare in prova
- `GET /b1s/v2/BusinessPartners('<CardCode>')`
- `POST /b1s/v2/InventoryTransferRequests`
- `GET /b1s/v2/InventoryTransferRequests(<id>)`
- `POST /b1s/v2/InventoryGenEntries` e/o `InventoryGenExits` per i casi logistici minimi
- opzionale: verifica `StockTransferService` / oggetti di trasferimento per il modello logistico più corretto sul tenant demo

### 5.39 Criterio di successo
Il prototipo è **successo** se:
1. si individua un set minimo di documenti ERP sufficiente a coprire V1;
2. si chiarisce quali quantità per natura restano master in Esyy Flow;
3. il flusso logistico minimo non costringe il progetto a introdurre prematuramente documenti o logiche non necessari.

### 5.40 Criterio di fallimento
- impossibilità di rappresentare il conto lavoro minimo con documenti standard provabili;
- dipendenza troppo forte dall’ERP per grandezze che il dominio vuole mantenere in app;
- necessità di DI API o verticalizzazione ERP già nel caso minimo.

### 5.41 Evidenze da raccogliere
- matrice documento applicativo → documento ERP;
- caso provato di invio e di rientro;
- elenco dei campi minimi richiesti in ERP;
- elenco di ciò che **non** va demandato a SAP in V1;
- decisione esplicita sul ruolo di `InventoryTransferRequests` nel caso passivo minimo.

### 5.42 Impatto atteso su Isabell
- chiarisce quanto del conto lavoro resta nel dominio Esyy Flow;
- evita di implementare troppo presto un workflow ERP-centrico;
- fornisce i boundary dei documenti logistici da emettere.

### 5.43 Impatto atteso su Nikolay
- aiuta a modellare relazioni fra fase esterna, movimenti, materiali presso terzista e documenti ERP;
- chiarisce se servono entità dedicate di riconciliazione per invii/rientri e materiali esterni.

### 5.44 Decisione che il prototipo deve permettere di prendere
**Decisione P3:** il conto lavoro passivo V1 può essere supportato da un perimetro documentale logistico minimo su Service Layer, lasciando a Esyy Flow il master delle quantità per natura.

---

## P5 — Bootstrap articoli / strutture minime ERP

### 5.45 Obiettivo della prova
Verificare quali anagrafiche e strutture minime devono essere bootstrapate da SAP B1 a Esyy Flow per avviare V1 senza import eccessivi.

### 5.46 Prerequisiti minimi
- articoli ERP di test (`Items`) disponibili;
- almeno una distinta base/prodotto (`ProductTrees`) su ERP;
- convenzione chiavi già chiarita da P4;
- definizione del perimetro minimo di bootstrap per il tenant pilota;
- facoltativo ma utile: checkpoint applicativo MD-10 + MD-11 su `main`, per avere una landing UI pronta all’evoluzione della pre-industrializzazione.

### 5.47 Input attesi
- elenco articoli campione (finiti, componenti, eventuali semilavorati);
- almeno una `ProductTree` / BOM di test;
- eventuali business partner minimi se coinvolti nel setup iniziale;
- classificazione di cosa entra come bootstrap e cosa resta solo applicativo.

### 5.48 Output attesi
- perimetro bootstrap minimo approvabile;
- decisione su cosa importare come master ERP e cosa ricostruire/gestire in app;
- regola di allineamento minima per articoli e strutture base.

### 5.49 Endpoint / oggetti Service Layer da toccare in prova
- `GET /b1s/v2/Items`
- `GET /b1s/v2/Items('<ItemCode>')`
- `GET /b1s/v2/ProductTrees`
- `GET /b1s/v2/ProductTrees('<TreeCode>')`
- opzionale: `GET /b1s/v2/BusinessPartners('<CardCode>')` se il tenant pilota richiede bootstrap BP contestuale

### 5.50 Criterio di successo
Il prototipo è **successo** se:
1. si individua un set minimo di dati ERP sufficiente ad avviare il tenant pilota;
2. è chiaro cosa deve essere importato una tantum, cosa sincronizzato periodicamente e cosa gestito solo in app;
3. non si forza l’app a dipendere da strutture ERP più ricche del necessario.

### 5.51 Criterio di fallimento
- il bootstrap minimo non è sufficiente a far partire i flussi V1;
- il tenant pilota richiede import di strutture troppo estese per il perimetro attuale;
- emerge conflitto fra librerie produttive di Esyy Flow e strutture ERP minime.

### 5.52 Evidenze da raccogliere
- elenco campi minimi articolo da acquisire;
- esempio reale di `ProductTree` e valutazione del suo uso nel bootstrap;
- distinzione netta: bootstrap una tantum / sync periodica / dominio solo app;
- nota esplicita su cosa non importare in V1 per non appesantire il workstream.

### 5.53 Impatto atteso su Isabell
- chiarisce il perimetro iniziale del data ingestion layer;
- evita di costruire pagine o servizi dipendenti da dataset ERP troppo ampi;
- aiuta a preparare il punto di ingresso della pre-industrializzazione senza confondere librerie ERP e oggetti provvisori app.

### 5.54 Impatto atteso su Nikolay
- sblocca tabelle e vincoli minimi per articoli bootstrapati e link ERP;
- chiarisce se `ProductTrees` va mappato come sorgente bootstrap, sola referenza o import strutturale ridotto;
- evita sovramodellazione anticipata delle librerie produttive.

### 5.55 Decisione che il prototipo deve permettere di prendere
**Decisione P5:** definire il bootstrap minimo di V1 e il confine stabile fra anagrafiche/strutture ERP importate e librerie produttive native di Esyy Flow.

---

## 6. Evidenze trasversali obbligatorie

Ogni prototipo deve produrre un pacchetto minimo di evidenze riusabile:

1. **Scheda test** con data, ambiente, attore, prerequisiti e obiettivo.
2. **Request/response** dei punti Service Layer rilevanti.
3. **Payload minimo funzionante** e payload fallito se utile a capire i limiti.
4. **Chiavi ERP emerse** e proposta di salvataggio nel layer `int_*`.
5. **Decisione operativa** presa o non presa.
6. **Classificazione finale**:
   - **Chiusa** = caso validato senza blocchi residui significativi;
   - **Ridotta** = caso validato nel nucleo minimo, ma restano limiti o approfondimenti non bloccanti per V1;
   - **Aperta** = mancano dati/permessi/coverage tecnica per autorizzare sviluppo affidabile.

## 7. Regole di uscita del piano OLE-03

OLE-03 può considerarsi eseguito correttamente quando:
- esiste una scheda prototipo completa per ciascuna priorità P1/P4/P2/P3/P5;
- i prerequisiti sono ordinati in modo eseguibile;
- ogni prova ha un criterio di successo/fallimento verificabile;
- è esplicito l’impatto sul lavoro di **Isabell** (sviluppo) e **Nikolay** (DB);
- ogni prototipo abilita una decisione concreta e non solo una raccolta di osservazioni.

## 8. Raccomandazione operativa finale

L’avvio effettivo del workstream integrazioni dovrebbe seguire questo ritmo:

- **Sprint prototipi 1**: P1 + P4
- **Sprint prototipi 2**: P2 + P3
- **Sprint prototipi 3**: P5 + consolidamento decisioni

Questo riduce il rischio di far partire Isabell con assunzioni tecniche premature e consente a Nikolay di consolidare il layer `int_*` solo dopo prove sufficientemente concrete.

