# OLE-10 — Esecuzione prototipo P3 e report decisionale

## Stato deliverable
**Completato**

## Classificazione finale del prototipo
**Chiuso**

## Decisione operativa finale
**Aprire sviluppo controllato**

---

## 1. Obiettivo del prototipo

Validare il **nucleo logistico minimo del conto lavoro passivo** via SAP Business One Service Layer, distinguendo due sottocasi:

- **invio verso terzista**
- **rientro dal terzista**

Il prototipo parte da:
- **P1** già chiuso sugli ODP
- **P2** già chiarito sui movimenti di produzione
- **P4** già congelato sul layer `int_*`

---

## 2. Ambiente effettivamente usato

- **ERP**: SAP Business One test
- **Canale integrazione**: Service Layer OData v4
- **Client di test**: client API locale
- **Modalità di esecuzione**:
  - Ole owner del prototipo e della lettura decisionale
  - esecuzione materiale effettuata lato ambiente SAP test
- **Endpoint / credenziali / database**: omessi intenzionalmente dalla versione condivisa

---

## 3. Prerequisiti confermati o mancanti

### Confermati
- Service Layer raggiungibile e login valido
- metadata coerente con il prototipo:
  - `StockTransfers` presente
  - `InventoryTransferRequests` presente
  - `Warehouse` presente
  - `Item` presente
- warehouse sorgente valido:
  - `Mc`
- warehouse terzista valido:
  - `LODES`
- item di test valido:
  - `RM_P1_ODP_001`
- stock disponibile nel warehouse sorgente:
  - `InStock su Mc = 9999`

### Rilevanti emersi
- `Mc` ha **bin locations abilitate**
- `LODES` **non** ha bin locations abilitate
- il sistema ha comunque gestito il flusso minimo con allocazione bin automatica dove necessario

### Mancanti / non raccolti in modo completo
- screenshot UI SAP non raccolti in modo sistematico anche in P3

La mancanza non invalida la lettura del prototipo, ma resta una debolezza metodologica già segnalata dal PM.

---

## 4. Dati e chiavi ERP effettivamente emerse

### Documento di invio verso terzista
- `DocEntry = 765`
- `DocNum = 202680361`
- `Series = 122`

### Documento di rientro dal terzista
- `DocEntry = 766`
- `DocNum = 202680362`
- `Series = 122`

### Dati logistici di contesto
- warehouse sorgente: `Mc`
- warehouse terzista: `LODES`
- item di test: `RM_P1_ODP_001`

---

## 5. Dataset logistico minimo validato

### Warehouse sorgente
**Request**
`GET /Warehouses('Mc')`

**Esito**
- HTTP `200`

**Evidenze rilevanti**
- `WarehouseCode = Mc`
- `WarehouseName = Magazzino centrale`
- `EnableBinLocations = tYES`
- `DefaultBin = 1`

### Warehouse terzista
**Request**
`GET /Warehouses('LODES')`

**Esito**
- HTTP `200`

**Evidenze rilevanti**
- `WarehouseCode = LODES`
- `WarehouseName = LODES`
- `EnableBinLocations = tNO`

### Item di test
**Request**
`GET /Items('RM_P1_ODP_001')`

**Esito**
- HTTP `200`

**Evidenze rilevanti**
- `ItemCode = RM_P1_ODP_001`
- `ManageSerialNumbers = tNO`
- `ManageBatchNumbers = tNO`
- `InStock su Mc = 9999.0`

**Lettura**
Il dataset minimo per il prototipo logistico è coerente e sufficiente.

---

## 6. Esecuzione prototipo — Invio verso terzista

### 6.1 Create stock transfer outbound
**Request**
`POST /StockTransfers`

**Payload riuscito**
```json
{
  "DocDate": "2026-04-23",
  "Comments": "P3 outbound subcontracting prototype",
  "FromWarehouse": "Mc",
  "ToWarehouse": "LODES",
  "StockTransferLines": [
    {
      "ItemCode": "RM_P1_ODP_001",
      "Quantity": 1,
      "FromWarehouseCode": "Mc",
      "WarehouseCode": "LODES"
    }
  ]
}
```

**Esito**
- HTTP `201`

**Chiavi emerse**
- `DocEntry = 765`
- `DocNum = 202680361`
- `Series = 122`

**Evidenze rilevanti**
- `FromWarehouse = Mc`
- `ToWarehouse = LODES`
- riga:
  - `ItemCode = RM_P1_ODP_001`
  - `Quantity = 1`
- allocazione bin sul warehouse sorgente:
  - `BinActionType = batFromWarehouse`
  - `BinAbsEntry = 1`

**Lettura**
L’invio logistico minimo verso il warehouse terzista è stato creato correttamente.

---

### 6.2 Read stock transfer outbound
**Request**
`GET /StockTransfers(765)`

**Esito**
- HTTP `200`

**Lettura**
Il documento di invio è leggibile via Service Layer e coerente con la request originaria.

---

### 6.3 Verifica giacenze dopo invio
**Request**
`GET /Items('RM_P1_ODP_001')`

**Esito**
- HTTP `200`

**Valori rilevati**
- `InStock su Mc = 9998.0`
- `InStock su LODES = 1.0`

**Lettura**
L’invio ha prodotto l’effetto logistico atteso:
- decremento nel warehouse sorgente
- incremento nel warehouse terzista

---

## 7. Esecuzione prototipo — Rientro dal terzista

### 7.1 Create stock transfer inbound
**Request**
`POST /StockTransfers`

**Payload riuscito**
```json
{
  "DocDate": "2026-04-23",
  "Comments": "P3 inbound subcontracting prototype",
  "FromWarehouse": "LODES",
  "ToWarehouse": "Mc",
  "StockTransferLines": [
    {
      "ItemCode": "RM_P1_ODP_001",
      "Quantity": 1,
      "FromWarehouseCode": "LODES",
      "WarehouseCode": "Mc"
    }
  ]
}
```

**Esito**
- HTTP `201`

**Chiavi emerse**
- `DocEntry = 766`
- `DocNum = 202680362`
- `Series = 122`

**Evidenze rilevanti**
- `FromWarehouse = LODES`
- `ToWarehouse = Mc`
- riga:
  - `ItemCode = RM_P1_ODP_001`
  - `Quantity = 1`
- allocazione bin sul warehouse di destinazione:
  - `BinActionType = batToWarehouse`
  - `BinAbsEntry = 1`

**Lettura**
Il rientro logistico minimo dal warehouse terzista è stato creato correttamente.

---

### 7.2 Read stock transfer inbound
**Request**
`GET /StockTransfers(766)`

**Esito**
- HTTP `200`

**Lettura**
Il documento di rientro è leggibile via Service Layer e coerente con la request originaria.

---

### 7.3 Verifica giacenze finali dopo rientro
**Request**
`GET /Items('RM_P1_ODP_001')`

**Esito**
- HTTP `200`

**Valori rilevati**
- `InStock finale su Mc = 9999.0`
- `InStock finale su LODES = 0.0`

**Lettura**
Il ciclo logistico minimo si richiude correttamente:
- invio riuscito
- rientro riuscito
- giacenze finali riallineate alla situazione iniziale

---

## 8. Chiusura sessione
**Request**
`POST /Logout`

**Esito**
- HTTP `204`

---

## 9. Payload realmente funzionanti o falliti

### Funzionanti

#### Invio verso terzista
```json
{
  "DocDate": "2026-04-23",
  "Comments": "P3 outbound subcontracting prototype",
  "FromWarehouse": "Mc",
  "ToWarehouse": "LODES",
  "StockTransferLines": [
    {
      "ItemCode": "RM_P1_ODP_001",
      "Quantity": 1,
      "FromWarehouseCode": "Mc",
      "WarehouseCode": "LODES"
    }
  ]
}
```

#### Rientro dal terzista
```json
{
  "DocDate": "2026-04-23",
  "Comments": "P3 inbound subcontracting prototype",
  "FromWarehouse": "LODES",
  "ToWarehouse": "Mc",
  "StockTransferLines": [
    {
      "ItemCode": "RM_P1_ODP_001",
      "Quantity": 1,
      "FromWarehouseCode": "LODES",
      "WarehouseCode": "Mc"
    }
  ]
}
```

### Falliti
Nessun payload fallito nel perimetro minimo effettivamente testato.

---

## 10. Evidenze raccolte

### Raccolte
- login e logout
- metadata minimo del prototipo
- read warehouse sorgente e warehouse terzista
- read item di test e giacenze
- create/read del documento di invio
- create/read del documento di rientro
- verifica giacenze post-invio
- verifica giacenze finali post-rientro
- chiavi ERP emerse per entrambi i documenti

### Non raccolte in modo completo
- screenshot UI SAP sistematici del prototipo

Anche in questo caso la mancanza non invalida il risultato, ma va migliorata nei prossimi test.

---

## 11. Classificazione finale del prototipo

**Chiuso**

### Motivazione
- invio verso terzista validato
- rientro dal terzista validato
- chiavi ERP emerse correttamente
- giacenze aggiornate correttamente all’andata e al ritorno
- giacenze finali coerenti con la situazione iniziale
- nessun blocco strutturale emerso nel perimetro minimo testato

---

## 12. Decisione operativa finale

**Aprire sviluppo controllato**

### Significato operativo
Il workstream integrazioni può aprire il primo slice del **conto lavoro passivo logistico minimo** basato su:
- **StockTransfers outbound**
- **StockTransfers inbound**

senza dover introdurre subito:
- `InventoryTransferRequests`
- documenti più ricchi
- logiche applicative avanzate di fase esterna
- orchestration complessa

---

## 13. Vincoli e note strutturali da congelare

1. Il prototipo valida il **nucleo logistico minimo**, non ancora l’intero dominio conto lavoro passivo.
2. Le chiavi ERP dei documenti creati devono restare nel layer `int_*`.
3. Il core domain deve continuare a rappresentare:
   - stato business di invio/rientro
   - semantica di fase esterna / materiale presso terzista
   senza inglobare `DocEntry`, `DocNum`, `Series` nel dominio operativo.
4. `InventoryTransferRequests` resta opzionale e non necessario per aprire il primo slice.
5. La presenza di bin locations sul warehouse sorgente/destinazione non ha bloccato il caso minimo nel vostro ambiente, grazie ad allocazioni automatiche coerenti; questo resta comunque un punto da tenere osservato in prototipi successivi più complessi.

---

## 14. Decisione strutturale che il prototipo permette di prendere

È possibile congelare come baseline del primo slice P3 questa impostazione:

- **invio verso terzista = StockTransfer outbound**
- **rientro dal terzista = StockTransfer inbound**
- **richiesta di trasferimento = non necessaria in V1 del prototipo logistico minimo**

Questa scelta consente di aprire lo sviluppo in modo ordinato, senza anticipare dipendenze eccessive dal modello pieno del conto lavoro.

---

## 15. Sintesi finale

Il prototipo P3 conferma che il **conto lavoro passivo logistico minimo** è tecnicamente percorribile nel vostro ambiente SAP B1 tramite Service Layer usando direttamente `StockTransfers`.

Il flusso minimo:

- warehouse interno → warehouse terzista
- warehouse terzista → warehouse interno

è stato eseguito con successo, con:
- documenti creati correttamente
- chiavi ERP emerse in modo pulito
- giacenze aggiornate in modo coerente
- riallineamento finale completo dello stock

Questo consente di avanzare nel workstream integrazioni senza ambiguità sul primo perimetro logistico del conto lavoro passivo.

---

## Esito sintetico per PM

- **OLE-10**: pronto da chiudere su base evidenze reali
- **Classificazione finale P3**: **chiuso**
- **Decisione operativa**: **aprire sviluppo controllato**
