# OLE-01 — Matrice tecnica per dominio

## Criterio generale

- **Esyy Flow resta app-centrico**: ERP integrato ma non dominante sulle logiche operative di produzione, MES, conto lavoro, qualità e tracciabilità.
- **Service Layer SAP Business One** è la baseline primaria da investigare, usando **OData v4** come default.
- **DI API** resta fallback da valutare solo dove il Service Layer non copre in modo affidabile l’operazione richiesta o dove emergono limiti funzionali/di transazione.
- **V1** privilegia flussi chiari, riconciliabili e con ownership esplicita del dato, evitando di sincronizzare tutto.

## Matrice tecnica per dominio

| Dominio funzionale | Oggetti SAP B1 da usare / investigare | Direzione V1 | Chiavi di riconciliazione preliminari | Mapping preliminare ad alto livello | Orchestrazione / sincronizzazione | Criticità da prototipare prima dello sviluppo | Fuori V1 / note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **1. Anagrafica articoli core** | `Items`; da investigare `ItemGroups`, `Warehouses`, eventuali UDF articolo | **Bidirezionale controllato** | ERP: `ItemCode`; App: `products.id`; link esterno: `int_external_links` | ERP `Items` -> App `products` + attributi logistici minimi; App -> ERP solo per articoli creati in Esyy Flow che devono esistere anche in SAP | Import iniziale tenant; sync incrementale schedulata; export on-demand/evento di creazione articolo | Gestione articoli esistenti in ERP vs articoli nativi app; policy su update concorrenti; UDF cliente-specifici | Non sincronizzare in V1 attributi descrittivi non usati operativamente o media/allegati complessi |
| **2. Librerie produttive / distinte base ERP** | `ProductTrees`; da investigare relazione con `Items` e campi UDF | **Fuori V1 come master operativo**; ammesso **import bootstrap selettivo** | ERP: `TreeCode`, `ItemCode`; App: `bom_templates.id`, `bom_template_versions.id` | Eventuale import solo come sorgente iniziale; in app diventano DIBA/versioni, non editing round-trip verso ERP | Bootstrap una tantum o import guidata per tenant; nessuna sincronizzazione continua in V1 | Traduzione tra BOM ERP e DIBA app-versionata; componenti descrittivi/non codificati; alternative/opzionali | ERP non governa DIBA/cicli/modelli in V1 |
| **3. Business partner rilevanti** | `BusinessPartners`; da investigare contatti/indirizzi e UDF | **Import** | ERP: `CardCode`; App: `customers.id` / `suppliers.id` / `subcontractors.id` con external link | ERP `BusinessPartners` -> anagrafiche cliente/fornitore/terzista in app, con tipo e riferimenti logistici minimi | Import iniziale + refresh schedulato; possibilità di refresh puntuale da UI integrazioni | BP multi-ruolo; classificazione cliente/fornitore/terzista; qualità dei dati ERP | In V1 niente anagrafica BP app->ERP |
| **4. Ordini di vendita MTO** | `Orders` | **Import** | ERP: `DocEntry`, `DocNum`, `LineNum`; App: `sales_orders.id`, `sales_order_lines.id`, origine commessa/ODP | ERP `Orders` -> ordini cliente MTO/commessa/origine ODP; righe -> fabbisogno iniziale di commessa o domanda di produzione | Polling schedulato + import manuale puntuale; trigger applicativo di generazione commessa/ODP | Quali ordini sono “MTO”; aggiornamenti di righe/quantità/date; cancellazioni/reopen/close | In V1 non scrivere ordini vendita in SAP da Esyy Flow |
| **5. Ordini di produzione** | `ProductionOrders`; da investigare eventuali actions di rilascio/chiusura e campi custom | **Bidirezionale** | ERP: `AbsoluteEntry`, `DocumentNumber`; App: `production_orders.id`; mantenere link origine (`sales_order`, `job`, `procurement`) | SAP -> import ordini esistenti o creati fuori app; App -> export ordini creati/aggiornati in Esyy Flow con set minimo condiviso | Eventi applicativi su creazione/modifica stato; riconciliazione asincrona; refresh puntuale per ordine | Ownership dello stato; modifiche concorrenti; granularità dei campi effettivamente scrivibili; differenze tra template app e struttura ERP | In V1 evitare round-trip completo delle strutture operative di fase/materiali effettivi |
| **6. Movimenti di magazzino produzione** | `InventoryGenExits`, `InventoryGenEntries`, `StockTransfers`, `InventoryTransferRequests`; da investigare lotti/bin/UDF | **Export** con riconciliazione di esito | ERP: `DocEntry`, `DocNum`; App: `inventory_movements.id`, `wip_transfers.id`, `phase_material_missions.id` | Dichiarazioni MES/ufficio -> issue for production, receipt from production, trasferimenti WIP o trasferimenti logistici | Orchestrazione event-driven da dichiarazioni/fasi/missioni; queue applicativa; retry idempotente; refresh stato documento in caso di errore | BaseEntry/BaseType su movimenti collegati a produzione; lotti/bin; parziali; annullamenti/storni | In V1 niente sincronizzazione continua delle giacenze ERP verso app come fonte real-time |
| **7. Conto lavoro passivo / fasi esterne** | Da investigare combinazione tra `ProductionOrders`, `StockTransfers`, `InventoryTransferRequests`, eventuali `PurchaseOrders`/documenti acquisto se necessari | **Bidirezionale limitato** | ERP: chiavi dei documenti logistici (`DocEntry`/`DocNum`) + eventuale ordine/fornitore (`CardCode`); App: `external_phases.id`, `subcontracting_shipments.id`, `subcontracting_returns.id` | App governa fase esterna, invio, rientro, quantità per natura; ERP riceve i documenti logistici ufficiali e restituisce identificativi/stato documento | Invio/rientro da eventi applicativi; riconciliazione asincrona documentale; refresh manuale per singola fase esterna | Disegno minimo V1 del subcontracting SAP B1; rappresentazione documentale più coerente; rientri parziali, NC, non lavorato, riserva | Fuori V1 automazione contabile completa del terzista |
| **8. Qualità e tracciabilità** | Da investigare solo i movimenti/documenti ERP necessari come impatto; non esiste bisogno V1 di sincronizzare l’intero dominio qualità | **Fuori V1 come dominio integrato** | App: `quality_events.id`, `trace_units.id`; verso ERP solo eventuali riferimenti a doc di magazzino | NC, genealogia, esiti e tracciabilità restano app-native; verso ERP passano solo gli effetti logistici/economici indispensabili | Nessuna sincronizzazione dominio-dominio in V1; solo aggancio ai documenti ERP generati da movimenti | Confine tra esito qualità app e documento ERP; gestione rilavorazioni con effetto magazzino | Nessuna replica completa di NC/genealogia su SAP in V1 |
| **9. Bootstrap tenant e configurazioni logistiche minime** | `Warehouses`; da investigare UoM, magazzini, eventuali liste condivise rilevanti | **Import** | ERP: `WarehouseCode` e analoghi codici lookup; App: `warehouses.id`, `cfg_*`, `ref_*`/master tenant-scoped | ERP -> magazzini e riferimenti minimi per permettere ODP, missioni, WIP e conto lavoro | Import iniziale guidato; refresh manuale o schedulato a bassa frequenza | Allineamento codici magazzino; configurazioni tenant vs dati ERP | In V1 non importare tutto il catalogo ERP “per default”; solo ciò che serve ai flussi operativi |

## Direzione definitiva sintetica per area

- **Import**: business partner, ordini di vendita MTO, bootstrap magazzini/configurazioni minime.
- **Export**: movimenti di magazzino e WIP con effetto ERP.
- **Bidirezionale**: articoli core (in modo controllato), ordini di produzione, conto lavoro passivo/documenti logistici correlati.
- **Fuori V1**: DIBA/cicli/modelli come master ERP, qualità completa, genealogia completa, replica totale dei dati di shopfloor su SAP.

## Chiavi di riconciliazione preliminari

### Regola base
- In app la chiave primaria resta sempre tecnica (`id` UUID).
- Le chiavi ERP restano in mapping dedicato o comunque come external business keys, non come PK applicative.
- Per i domini bidirezionali serve una tabella/strato di collegamento esterno coerente con DB-00, separato dal core domain.

### Set minimo per dominio
- **Articoli**: `ItemCode`
- **Business partner**: `CardCode`
- **Ordini vendita**: `DocEntry`, `DocNum`, `LineNum`
- **Ordini produzione**: `AbsoluteEntry`, `DocumentNumber`
- **Movimenti magazzino**: `DocEntry`, `DocNum`, eventuale `BaseEntry`/`BaseType`
- **Trasferimenti**: `DocEntry`, `DocNum`
- **Conto lavoro**: chiave fase esterna app + chiavi documenti ERP collegati + `CardCode` terzista
- **Magazzini**: `WarehouseCode`

## Mapping preliminare ad alto livello

### A. ERP -> App
1. `Items` -> `products`
2. `BusinessPartners` -> clienti / fornitori / terzisti
3. `Orders` -> domanda cliente MTO / origine commessa
4. `ProductionOrders` -> testata ODP ERP collegata all’ODP app
5. `Warehouses` -> master logistici minimi tenant
6. `ProductTrees` -> import bootstrap verso DIBA solo se necessario in avvio

### B. App -> ERP
1. ODP creati in app -> `ProductionOrders`
2. Dichiarazioni di consumo -> `InventoryGenExits`
3. Dichiarazioni di produzione -> `InventoryGenEntries`
4. Trasferimenti WIP / logistici -> `StockTransfers` o `InventoryTransferRequests`
5. Invii/rientri a terzista -> documenti logistici SAP da definire nel prototipo conto lavoro
6. Articoli creati in app -> `Items` solo se fanno parte del perimetro ERP del tenant

## Punti di orchestrazione e sincronizzazione

### Orchestrazione prioritaria V1
- **Bootstrap tenant**: import iniziale guidato.
- **Import ordini vendita MTO**: schedulato + refresh puntuale manuale.
- **Produzione**: creazione/modifica ODP da evento applicativo con riconciliazione asincrona.
- **MES / movimenti**: emissione documento ERP da dichiarazione o missione confermata.
- **Conto lavoro**: invio/rientro generano evento applicativo e produzione documenti ERP collegati.
- **Reconciliation UI**: necessario uno stato per macro-area e per singolo oggetto/documento.

### Modalità suggerita per V1
- **Schedulato** per import strutturali o non time-critical.
- **Event-driven applicativo** per export di eventi operativi (ODP, movimenti, invii/rientri).
- **Refresh puntuale manuale** per la risoluzione rapida dei casi ambigui e per il supporto.

## Criticità da prototipare prima dello sviluppo

1. **Ordini di produzione bidirezionali**
   - confermare set minimo di campi realmente governabile via Service Layer;
   - verificare politica di update e stato.

2. **Movimenti legati a produzione**
   - prova end-to-end issue/receipt/transfer con riferimenti a ordine di produzione;
   - verifica parziali, storni, annullamenti.

3. **Conto lavoro passivo**
   - identificare il modello SAP B1 minimo da usare in V1;
   - decidere se il documento ufficiale è solo logistico o anche acquisto/servizio.

4. **Import articoli + bootstrap strutture**
   - capire il livello utile di anagrafica da importare;
   - decidere se `ProductTrees` entra solo come bootstrap una tantum.

5. **Chiavi e riconciliazione**
   - validare uno schema `int_*` coerente con DB-00 per external links, sync runs, errori e retry.

6. **Customer-specific fields**
   - stimare quanto l’uso di UDF/Udo SAP condizioni i domini V1.

## Confini espliciti fuori V1

- Round-trip completo delle DIBA/cicli/modelli tra Esyy Flow e SAP.
- Replica in SAP della logica completa di qualità, NC, genealogia e tracciabilità.
- Sincronizzazione real-time generale di tutte le anagrafiche e di tutte le giacenze.
- Gestione finanziaria/contabile completa del conto lavoro.
- Mapping campo-per-campo esaustivo per ogni oggetto prima del prototipo.
- Decisioni infrastrutturali definitive su code, runtime e deployment.

## Esito operativo di OLE-01

OLE-01 definisce una matrice già abbastanza concreta da aprire il workstream integrazioni con perimetro, ownership del dato, chiavi di riconciliazione, punti di orchestrazione e prototipi prioritari, senza anticipare ancora i connettori o l’implementazione tecnica.
