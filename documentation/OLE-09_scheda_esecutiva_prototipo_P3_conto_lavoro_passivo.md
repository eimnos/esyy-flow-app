# OLE-09 — Scheda esecutiva prototipo P3 (conto lavoro passivo / documenti logistici minimi)

## Stato deliverable
**Pronto per esecuzione**

## Obiettivo
Aprire il prossimo prototipo reale del workstream integrazioni sul **conto lavoro passivo**, mantenendo un perimetro:
- pratico
- eseguibile
- non ancora di connettore esteso
- centrato sul **caso minimo decisionale**

Il prototipo usa quanto già consolidato:
- **P1** chiuso sugli ODP standard via Service Layer
- **P2** aperto con vincoli sui movimenti di produzione
- **P4** congelato sul layer `int_*`

## 1. Perimetro minimo del prototipo P3
Il prototipo P3 non prova ancora il conto lavoro passivo completo end-to-end.  
Prova invece il **nucleo logistico minimo**, necessario a capire se il workstream può aprire uno slice controllato.

### In perimetro
1. **Invio minimo a terzista**
   - spostamento logistico di materiale/semilavorato da warehouse interno a warehouse dedicato al terzista
2. **Rientro minimo da terzista**
   - spostamento logistico inverso dal warehouse terzista a warehouse interno
3. **Riconciliazione minima**
   - chiavi ERP dei documenti logistici
   - collegamento a:
     - ODP
     - fase esterna / external phase
     - layer `int_*`

### Fuori perimetro in OLE-09
- contabilità passiva / fattura terzista
- costi esterni
- trasformazione completa del materiale in articolo diverso
- qualità / NC / non lavorato / riserva
- lotti/seriali complessi
- automazione di connettore
- orchestrazione completa tra invio, lavorazione, rientro e consuntivo

## 2. Razionale funzionale
Il modello approvato tratta il **conto lavoro** come parte nativa del processo produttivo, con:
- fasi esterne
- invii
- rientri
- materiali presso terzista
- dettaglio fase esterna

La vista funzionale di prodotto richiede infatti:
- una pagina **Conto Lavoro > Invii**
- una pagina **Conto Lavoro > Rientri**
- una pagina **Conto Lavoro > Materiali presso terzista**
- una vista di commessa con qty inviata/rientrata/residua

Di conseguenza, il primo prototipo SAP non deve ancora coprire tutta la semantica di dominio, ma deve chiarire il **modello documentale logistico minimo** su cui poi agganciare invii e rientri applicativi.

## 3. Ipotesi tecnica di partenza
Per il caso minimo decisionale, l’ipotesi candidata è questa:

### P3-A — Invio minimo
- usare **InventoryTransferRequests** come documento richiesta / prenotazione logistica (opzionale nel minimo)
- usare **StockTransfers** come documento effettivo di invio dal warehouse interno al warehouse terzista

### P3-B — Rientro minimo
- usare **StockTransfers** come documento effettivo di rientro dal warehouse terzista al warehouse interno

### Ipotesi architetturale del test
Il warehouse terzista viene rappresentato in SAP B1 come **warehouse dedicato esterno/logico**, senza introdurre nel prototipo:
- acquisti passivi
- GRPO / AP Invoice
- contabilità di costo
- documento di servizio

Questa è una riduzione intenzionale del caso, utile a decidere se il **conto lavoro passivo** può essere aperto prima sul piano logistico e solo dopo su quello amministrativo/economico.

## 4. Decisione che il prototipo deve permettere di prendere
Alla fine del test P3 dobbiamo poter decidere una di queste tre cose:

1. **Aprire sviluppo controllato**
   - se invio e rientro minimi sono gestibili in modo pulito e riconciliabile
2. **Aprire con vincoli**
   - se il nucleo logistico è valido ma servono assunzioni restrittive
3. **Non aprire ancora lo sviluppo esteso**
   - se il caso minimo è troppo ambiguo o dipende da modellazioni SAP non ancora stabili

## 5. Ambiente e prerequisiti minimi
### Ambiente
- SAP Business One test
- Service Layer OData v4
- client API locale
- sessione valida (`B1SESSION`, eventuale `ROUTEID`)

### Prerequisiti SAP minimi
1. warehouse interno esistente
2. warehouse terzista/logico esistente
3. articolo o semilavorato trasferibile disponibile
4. giacenza sufficiente nel warehouse interno
5. permessi utente su:
   - login
   - lettura Items
   - lettura Warehouses
   - creazione InventoryTransferRequests
   - creazione StockTransfers
   - lettura documenti creati

### Prerequisiti applicativi/concettuali
1. identificativo della fase esterna o del caso di invio da usare come riferimento funzionale
2. chiave applicativa interna candidata da usare in `int_external_links`
3. conferma che le chiavi ERP raw restano fuori dal core domain

## 6. Dataset minimo richiesto
Per mantenere il caso minimo e realmente eseguibile, serve questo dataset:

- **item/semilavorato di test**: un articolo già trasferibile
- **warehouse interno**: `<WH_INTERNAL>`
- **warehouse terzista/logico**: `<WH_SUBCONTRACTOR>`
- **quantità test**: `1`
- **eventuale ODP di riferimento**: opzionale ma raccomandato
- **eventuale external phase reference**: identificativo applicativo fittizio o placeholder

### Regola di riduzione del caso
Nel prototipo il materiale inviato e il materiale rientrato possono coincidere come item.  
Non serve ancora dimostrare la trasformazione dell’item: serve dimostrare la **tenuta del pattern documentale logistico minimo**.

## 7. Sequenza esecutiva proposta

### STEP 0 — Login
`POST /b1s/v2/Login`

### STEP 1 — Verifica dataset
- `GET /Items('<ITEM_TEST>')`
- `GET /Warehouses('<WH_INTERNAL>')`
- `GET /Warehouses('<WH_SUBCONTRACTOR>')`

Se utile, leggere anche disponibilità item per warehouse.

### STEP 2 — Opzionale: create InventoryTransferRequest
`POST /b1s/v2/InventoryTransferRequests`

Scopo:
- capire se il prototipo deve includere un livello di “richiesta” prima del movimento effettivo
- non è il passaggio indispensabile per la validazione del caso minimo

### STEP 3 — Create StockTransfer di invio
`POST /b1s/v2/StockTransfers`

Scopo:
- spostare 1 unità dall’interno al warehouse terzista

### STEP 4 — Read StockTransfer di invio
`GET /b1s/v2/StockTransfers(<DOCENTRY_SEND>)`

### STEP 5 — Verifica giacenze / warehouse dopo invio
Verificare:
- decremento nel warehouse interno
- incremento nel warehouse terzista

### STEP 6 — Create StockTransfer di rientro
`POST /b1s/v2/StockTransfers`

Scopo:
- riportare 1 unità dal warehouse terzista al warehouse interno

### STEP 7 — Read StockTransfer di rientro
`GET /b1s/v2/StockTransfers(<DOCENTRY_RETURN>)`

### STEP 8 — Verifica giacenze finali
Verificare:
- riallineamento tra warehouse interno e warehouse terzista
- coerenza dei documenti logistici

### STEP 9 — Logout
`POST /b1s/v2/Logout`

## 8. Endpoint Service Layer candidati
### Obbligatori
- `POST /Login`
- `GET /Items('<ITEM_TEST>')`
- `GET /Warehouses('<WH_INTERNAL>')`
- `GET /Warehouses('<WH_SUBCONTRACTOR>')`
- `POST /StockTransfers`
- `GET /StockTransfers(<id>)`
- `POST /Logout`

### Opzionali ma utili
- `POST /InventoryTransferRequests`
- `GET /InventoryTransferRequests(<id>)`

## 9. Payload minimi da tentare

### 9.1 InventoryTransferRequest — opzionale
```json
{
  "Comments": "P3 request to subcontractor prototype",
  "FromWarehouse": "<WH_INTERNAL>",
  "ToWarehouse": "<WH_SUBCONTRACTOR>",
  "StockTransferLines": [
    {
      "ItemCode": "<ITEM_TEST>",
      "Quantity": 1,
      "WarehouseCode": "<WH_SUBCONTRACTOR>"
    }
  ]
}
```

### 9.2 StockTransfer di invio
```json
{
  "Comments": "P3 send to subcontractor prototype",
  "FromWarehouse": "<WH_INTERNAL>",
  "ToWarehouse": "<WH_SUBCONTRACTOR>",
  "StockTransferLines": [
    {
      "ItemCode": "<ITEM_TEST>",
      "Quantity": 1,
      "WarehouseCode": "<WH_SUBCONTRACTOR>"
    }
  ]
}
```

### 9.3 StockTransfer di rientro
```json
{
  "Comments": "P3 return from subcontractor prototype",
  "FromWarehouse": "<WH_SUBCONTRACTOR>",
  "ToWarehouse": "<WH_INTERNAL>",
  "StockTransferLines": [
    {
      "ItemCode": "<ITEM_TEST>",
      "Quantity": 1,
      "WarehouseCode": "<WH_INTERNAL>"
    }
  ]
}
```

## 10. Output e chiavi ERP attese
### Per InventoryTransferRequest (se usata)
- `DocEntry`
- `DocNum`
- `Series`

### Per StockTransfer di invio
- `DocEntry`
- `DocNum`
- `Series`

### Per StockTransfer di rientro
- `DocEntry`
- `DocNum`
- `Series`

### Riconciliazione minima attesa
Nel layer `int_*` devono essere riconciliabili almeno:
- chiave applicativa fase esterna / invio / rientro
- `DocEntry` ERP
- `DocNum` leggibile
- `Series`
- tipo documento ERP
- direzione movimento:
  - `send_to_subcontractor`
  - `return_from_subcontractor`

## 11. Evidenze da raccogliere
Per ogni step vanno raccolte:

### API
- request completa
- response completa
- status HTTP
- payload realmente usato
- chiavi ERP emerse

### UI SAP
Da questa fase in avanti la raccolta UI deve essere più sistematica.

Minimo richiesto:
1. screenshot warehouse/item prima dell’invio
2. screenshot documento di invio
3. screenshot warehouse/item dopo l’invio
4. screenshot documento di rientro
5. screenshot warehouse/item dopo il rientro

### Log decisionale
- cosa ha funzionato
- cosa è fallito
- se il fallimento è strutturale o configurativo
- se il caso minimo resta apribile

## 12. Rischi osservabili durante la prova
1. warehouse terzista non utilizzabile come warehouse standard
2. articolo non trasferibile o non disponibile
3. incoerenza tra `FromWarehouse`, `ToWarehouse` e `WarehouseCode` di riga
4. errori di disponibilità stock
5. blocchi dovuti a bin locations / seriali / batch
6. difficoltà a rappresentare il rientro come semplice reverse transfer
7. ambiguità semantica tra documento logistico SAP e oggetto applicativo “invio/rientro”
8. rischio di contaminare il core domain con chiavi documentali ERP

## 13. Criteri di successo / fallimento
### Successo pieno
- invio minimo creato e leggibile
- rientro minimo creato e leggibile
- chiavi ERP emerse in modo stabile
- evidenza UI coerente
- pattern documentale sufficientemente chiaro per aprire sviluppo controllato

### Successo parziale
- invio creato correttamente
- rientro possibile solo con vincoli
- oppure InventoryTransferRequest non utile ma StockTransfer valido

### Fallimento
- impossibilità di rappresentare in modo pulito anche il caso minimo logistico
- documenti non riconciliabili
- ambiguità troppo alta tra logistica SAP e semantica applicativa

## 14. Struttura minima `int_*` impattata
Il prototipo P3 non apre nuove tabelle obbligatorie rispetto a P4, ma chiarisce come valorizzare:

### `int_external_links`
Per:
- fase esterna applicativa
- invio applicativo
- rientro applicativo

Con riferimento a:
- `entity_type`
- `entity_id`
- `external_system_code`
- `external_object_type`
- `external_id` = `DocEntry`
- `external_code_snapshot` = `DocNum`
- `payload_direction` / semantica documento

### `int_sync_runs`
Per tracciare:
- test run invio
- test run rientro

### `int_message_logs`
Per:
- request/response
- errori di validazione
- snapshot minimi

## 15. Campi che devono restare fuori dal core domain
Questi campi non devono entrare in `external_phases`, `subcontract_sends`, `subcontract_returns` o tabelle core equivalenti:

- `DocEntry`
- `DocNum`
- `Series`
- payload raw
- response raw
- HTTP status
- header tecnici
- dettagli di request/response SAP

Nel core domain devono restare solo:
- stato business
- quantità business
- riferimento applicativo a fase/invio/rientro
- eventuale relazione applicativa a ODP/commessa/lotto

## 16. Esempi concreti derivati da P1/P2/P4
### Esempio 1 — chiave tecnica primaria ERP
Come per P1:
- `AbsoluteEntry` è stata la chiave tecnica primaria ODP
Per P3:
- `DocEntry` dei documenti logistici candidati deve essere trattato allo stesso modo nel layer `int_*`

### Esempio 2 — riferimento leggibile
Come per P1/P2:
- `DocumentNumber` / `DocNum` resta il riferimento leggibile lato documento
Per P3:
- l’app può mostrarlo in viste tecniche o amministrative, ma non deve usarlo come FK di dominio

### Esempio 3 — distinzione fra slice apribile e slice vincolato
Come in P2:
- receipt = apribile
- issue = apribile con vincoli
Per P3:
- invio minimo e rientro minimo devono chiarire se il pattern “warehouse terzista” è apribile subito o solo con vincoli

## 17. Decisione strutturale finale che il prototipo deve permettere di prendere
Alla fine del prototipo P3 dobbiamo poter congelare una di queste due baseline:

### Baseline A — warehouse terzista come primo nucleo
- invio/rientro minimi modellati come `StockTransfers`
- richiesta opzionale via `InventoryTransferRequests`
- slice logistico apribile subito

### Baseline B — logistica minima non ancora abbastanza stabile
- troppa ambiguità tra semantica SAP e oggetto applicativo
- serve un ulteriore prototipo prima di aprire sviluppo controllato

## 18. Esito atteso del deliverable
OLE-09 deve consentire di eseguire un test reale e chiudere **OLE-10** con:
- classificazione finale del prototipo P3
- decisione operativa finale
- raccomandazione chiara su invio/rientro minimi e layer `int_*`
