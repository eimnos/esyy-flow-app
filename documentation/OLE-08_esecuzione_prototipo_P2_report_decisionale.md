# OLE-08 — Esecuzione prototipo P2 e report decisionale

## Stato deliverable
**Completato**

## Classificazione finale del prototipo
**Ridotto**

## Decisione operativa finale
**Aprire con vincoli**

---

## 1. Obiettivo del prototipo

Validare il comportamento minimo dei **movimenti di magazzino legati alla produzione** via SAP Business One Service Layer, distinguendo due sottocasi:

- **P2-A — Receipt from Production**
- **P2-B — Issue for Production**

Il prototipo parte da:
- **P1** già chiuso sugli ODP bidirezionali
- **P4** già congelato sul layer `int_*`

---

## 2. Ambiente effettivamente usato

- **ERP**: SAP Business One test
- **Canale integrazione**: Service Layer OData v4
- **Endpoint**: endpoint interno/locale di test SAP B1 (**mascherato nella versione condivisa**)
- **Client di test**: client API locale
- **Modalità di esecuzione**:
  - Ole owner del prototipo e della lettura decisionale
  - esecuzione materiale effettuata lato ambiente SAP test
- **Credenziali / database / host**: omessi intenzionalmente dalla versione condivisa

---

## 3. Prerequisiti confermati o mancanti

### Confermati
- Service Layer raggiungibile
- login Service Layer riuscito
- sessione valida ottenuta
- ODP di riferimento P1 leggibile via API
- articoli e BOM già coerenti
- warehouse di lavoro: `Mc`

### Emersi durante la prova
- le righe componente dell’ODP risultano con `ProductionOrderIssueType = im_Backflush`
- per il receipt è stato necessario avere stock disponibile sui componenti nel warehouse `Mc`

### Mancanti / non raccolti come evidenza formale
- screenshot UI SAP del sottocaso P2 non raccolti in questa esecuzione
- verifica stock documentata solo indirettamente tramite esito dei retry

---

## 4. Dati e chiavi ERP effettivamente emerse

### ODP base già esistente da P1
- `AbsoluteEntry = 3585`
- `DocumentNumber = 2026230060`
- `Series = 138`

### Documento di receipt creato in P2-A
- `DocEntry = 6802`
- `DocNum = 202680360`
- `Series = 122`

### Nuovo ODP creato per test issue in P2-B
- `AbsoluteEntry = 3586`
- `DocumentNumber = 2026230061`
- `Series = 138`

---

## 5. Esecuzione prototipo P2-A — Receipt from Production

### 5.1 Read ODP base
**Request**
`GET /ProductionOrders(3585)`

**Esito**
- HTTP `200`

**Evidenze rilevanti**
- `ProductionOrderStatus = boposReleased`
- `CompletedQuantity = 0.0`
- line 0:
  - `ItemNo = RM_P1_ODP_001`
  - `IssuedQuantity = 0.0`
  - `ProductionOrderIssueType = im_Backflush`
- line 1:
  - `ItemNo = RM_P1_ODP_002`
  - `IssuedQuantity = 0.0`
  - `ProductionOrderIssueType = im_Backflush`

**Lettura**
L’ODP è rilasciato, coerente con P1, e le righe sono in backflush.

---

### 5.2 Primo tentativo receipt — fallito
**Request**
`POST /InventoryGenEntries`

**Payload tentato**
```json
{
  "DocDate": "2026-04-23",
  "Comments": "P2-A receipt from production prototype",
  "DocumentLines": [
    {
      "BaseType": 202,
      "BaseEntry": 3585,
      "Quantity": 1,
      "WarehouseCode": "Mc"
    }
  ]
}
```

**Esito**
- HTTP `400`

**Response rilevante**
```json
{
  "error": {
    "code": "-5002",
    "message": "Make sure that the consumed quantity of the component item would not cause the item's inventory to fall below zero  [IGE1.WhsCode][line: 1] , 'Production Order no: 2026230060 Line: 1'  [Message 3559-7]"
  }
}
```

**Lettura**
Il receipt ha raggiunto una validazione reale di produzione ma è stato bloccato dal **consumo automatico componenti in backflush** con stock insufficiente nel warehouse `Mc`.

**Conclusione intermedia**
Il blocco non è strutturale sul receipt; è una precondizione di stock.

---

### 5.3 Retry receipt — riuscito
**Azione preliminare**
Caricato stock sui componenti necessari nel warehouse `Mc`.

**Request**
`POST /InventoryGenEntries`

**Payload riuscito**
```json
{
  "DocDate": "2026-04-23",
  "Comments": "P2-A receipt from production prototype",
  "DocumentLines": [
    {
      "BaseType": 202,
      "BaseEntry": 3585,
      "Quantity": 1,
      "WarehouseCode": "Mc"
    }
  ]
}
```

**Esito**
- HTTP `201`

**Response rilevante**
- `DocEntry = 6802`
- `DocNum = 202680360`
- `Series = 122`
- `BaseType = 202`
- `BaseEntry = 3585`

**Lettura**
Il receipt from production è stato creato correttamente e riconciliato con l’ODP base.

---

### 5.4 Read documento di receipt
**Request**
`GET /InventoryGenEntries(6802)`

**Esito**
- HTTP `200`

**Evidenze rilevanti**
- documento leggibile
- `DocEntry = 6802`
- `DocNum = 202680360`
- `Series = 122`
- riga documento coerente:
  - `ItemCode = FG_P1_ODP_TEST`
  - `Quantity = 1`
  - `WarehouseCode = Mc`
  - `BaseType = 202`
  - `BaseEntry = 3585`

---

### 5.5 Read ODP 3585 dopo il receipt
**Request**
`GET /ProductionOrders(3585)`

**Esito**
- HTTP `200`

**Evidenze rilevanti**
- `CompletedQuantity = 1.0`
- `RejectedQuantity = 0.0`
- line 0:
  - `IssuedQuantity = 1.0`
  - `ProductionOrderIssueType = im_Backflush`
- line 1:
  - `IssuedQuantity = 1.0`
  - `ProductionOrderIssueType = im_Backflush`

**Lettura**
Il receipt:
- ha completato correttamente l’ODP
- ha scaricato automaticamente i componenti in backflush
- non presenta blocchi strutturali lato Service Layer

---

## 6. Esecuzione prototipo P2-B — Issue for Production

### 6.1 Create nuovo ODP pulito per test issue
**Request**
`POST /ProductionOrders`

**Payload riuscito**
```json
{
  "DueDate": "2026-04-25",
  "ItemNo": "FG_P1_ODP_TEST",
  "PlannedQuantity": 1,
  "Warehouse": "Mc"
}
```

**Esito**
- HTTP `201`

**Chiavi emerse**
- `AbsoluteEntry = 3586`
- `DocumentNumber = 2026230061`
- `Series = 138`

**Lettura**
Creato un nuovo ODP pulito per evitare di testare l’issue su un ordine già completato.

---

### 6.2 Release ODP 3586
**Request**
`PATCH /ProductionOrders(3586)`

**Payload riuscito**
```json
{
  "ProductionOrderStatus": "boposReleased",
  "Remarks": "P2-B issue prototype base"
}
```

**Esito**
- HTTP `204`

---

### 6.3 Read ODP 3586 dopo release
**Request**
`GET /ProductionOrders(3586)`

**Esito**
- HTTP `200`

**Evidenze rilevanti**
- `ProductionOrderStatus = boposReleased`
- `CompletedQuantity = 0.0`
- line 0:
  - `ItemNo = RM_P1_ODP_001`
  - `IssuedQuantity = 0.0`
  - `ProductionOrderIssueType = im_Backflush`
- line 1:
  - `ItemNo = RM_P1_ODP_002`
  - `IssuedQuantity = 0.0`
  - `ProductionOrderIssueType = im_Backflush`

**Lettura**
ODP pulito, rilasciato, pronto per il tentativo di issue.

---

### 6.4 Tentativo issue manuale line 0 — fallito in modo informativo
**Request**
`POST /InventoryGenExits`

**Payload tentato**
```json
{
  "DocDate": "2026-04-23",
  "Comments": "P2-B issue for production prototype",
  "DocumentLines": [
    {
      "BaseType": 202,
      "BaseEntry": 3586,
      "BaseLine": 0,
      "Quantity": 1,
      "WarehouseCode": "Mc"
    }
  ]
}
```

**Esito**
- HTTP `400`

**Response rilevante**
```json
{
  "error": {
    "code": "-5002",
    "message": "Issue type cannot be backflush for serial or batch number items  , 'Production Order no: 3586 Line: 1'"
  }
}
```

**Lettura**
Il blocco non è strutturale sul flusso Service Layer.
Il blocco è coerente con la configurazione/metodo di emissione delle righe ODP (`im_Backflush`).

**Conclusione intermedia**
L’issue manuale non può essere assunto come disponibile sul caso testato.

---

## 7. Chiusura sessione
**Request**
`POST /Logout`

**Esito**
- HTTP `204`

---

## 8. Payload realmente funzionanti o falliti

### Funzionanti
#### Receipt from production
```json
{
  "DocDate": "2026-04-23",
  "Comments": "P2-A receipt from production prototype",
  "DocumentLines": [
    {
      "BaseType": 202,
      "BaseEntry": 3585,
      "Quantity": 1,
      "WarehouseCode": "Mc"
    }
  ]
}
```

#### Create ODP pulito per test issue
```json
{
  "DueDate": "2026-04-25",
  "ItemNo": "FG_P1_ODP_TEST",
  "PlannedQuantity": 1,
  "Warehouse": "Mc"
}
```

#### Release ODP per test issue
```json
{
  "ProductionOrderStatus": "boposReleased",
  "Remarks": "P2-B issue prototype base"
}
```

### Falliti
#### Receipt con stock insufficiente componenti
```json
{
  "DocDate": "2026-04-23",
  "Comments": "P2-A receipt from production prototype",
  "DocumentLines": [
    {
      "BaseType": 202,
      "BaseEntry": 3585,
      "Quantity": 1,
      "WarehouseCode": "Mc"
    }
  ]
}
```

**Motivo del fallimento**
Stock insufficiente componenti in warehouse `Mc` per backflush automatico.

#### Issue manuale su riga backflush
```json
{
  "DocDate": "2026-04-23",
  "Comments": "P2-B issue for production prototype",
  "DocumentLines": [
    {
      "BaseType": 202,
      "BaseEntry": 3586,
      "BaseLine": 0,
      "Quantity": 1,
      "WarehouseCode": "Mc"
    }
  ]
}
```

**Motivo del fallimento**
Issue method / configurazione riga ODP incompatibile con issue manuale nel caso testato.

---

## 9. Evidenze raccolte

### Raccolte
- request/response login e logout
- request/response create/read/update ODP di base e ODP pulito
- request/response di receipt fallito e retry riuscito
- request/response read del documento di receipt
- request/response read ODP dopo il receipt
- request/response issue manuale fallito
- chiavi ERP emerse per ODP e receipt

### Non raccolte in forma completa
- screenshot UI SAP del caso P2
- evidenza visuale del documento di receipt in UI
- evidenza visuale dell’ODP dopo receipt / issue

Questa mancanza **non invalida** la lettura del prototipo, ma riduce leggermente il livello di evidenza visuale raccolta.

---

## 10. Classificazione finale del prototipo

**Ridotto**

### Motivazione
- **P2-A — Receipt from Production** è stato validato con successo
- **P2-B — Issue for Production** è stato bloccato in modo coerente da una regola applicativa/configurativa SAP sulle righe in backflush
- il blocco dell’issue non dimostra un limite strutturale del Service Layer, ma un vincolo di processo da tenere esplicitamente nel perimetro

---

## 11. Decisione operativa finale

**Aprire con vincoli**

### Vincoli da congelare subito
1. Il primo slice movimenti di produzione può aprirsi sul **receipt from production**.
2. L’**issue manuale** non deve essere assunto come disponibile su ODP/righe configurate in **backflush**.
3. L’integrazione applicativa deve distinguere esplicitamente:
   - **issue esplicito/manuale**
   - **consumo implicito via receipt con backflush**
4. Le chiavi documento ERP dei movimenti devono restare nel layer `int_*` e non entrare nel core domain operativo.
5. Per i casi issue occorre una matrice successiva per distinguere:
   - righe manual issue
   - righe backflush
   - eventuali vincoli ulteriori su lotti/seriali/configurazioni SAP

---

## 12. Decisione strutturale che il prototipo permette di prendere

Il workstream integrazioni può aprire uno sviluppo controllato del caso **receipt from production** su ODP standard via Service Layer, mantenendo però **fuori dal perimetro iniziale** l’assunzione di un **issue manuale universale** su tutte le righe ODP.

In termini pratici:
- **receipt** = slice apribile
- **issue** = slice apribile solo con vincoli e distinzione preventiva di `IssueType`

---

## 13. Sintesi finale

Il prototipo P2 conferma che:
- l’asse **ODP → receipt from production** è tecnicamente valido e leggibile
- il consumo componenti in backflush avviene coerentemente al momento del receipt
- l’asse **ODP → issue for production** non è da considerare neutro o universale, perché dipende dal metodo di emissione della riga ODP

Questo consente di avanzare nel workstream integrazioni senza ambiguità:
- non aprendo troppo presto uno sviluppo generalizzato dei movimenti
- ma neppure bloccando il valore già validato del caso receipt

---

## Esito sintetico per PM

- **OLE-08**: pronto da chiudere su base evidenze reali
- **Classificazione finale P2**: **ridotto**
- **Decisione operativa**: **aprire con vincoli**
