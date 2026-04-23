# OLE-05 — Esecuzione prototipo P1 e report decisionale

## Stato deliverable
- **Prototipo:** P1 — ODP bidirezionali
- **Esito generale:** prova eseguita
- **Classificazione finale prototipo:** **chiuso**
- **Decisione operativa finale:** **aprire con vincoli**

## 1. Ambiente effettivamente usato
- **Ambiente SAP:** SAP Business One test locale / rete interna cliente
- **Canale integrazione testato:** SAP Business One Service Layer
- **Root usato:** `https://win-nsichqot7rv.v-tronik.locale:50000/b1s/v2`
- **Modalità di esecuzione:** Postman Desktop / agent locale, non cloud
- **Utente SAP usato:** `manager`
- **CompanyDB usato:** `SB02643_VTK`
- **Hostname:** privato `.locale`, raggiungibile solo da rete locale / contesto interno

## 2. Prerequisiti confermati o mancanti

### Confermati
- Endpoint Service Layer raggiungibile dalla rete locale
- Login Service Layer riuscito
- Oggetti OData necessari presenti nel metadata:
  - `ProductionOrders`
  - `Items`
  - `ProductTrees`
- Dataset minimo disponibile:
  - articolo padre `FG_P1_ODP_TEST`
  - BOM di produzione valida su `FG_P1_ODP_TEST`
  - componenti `RM_P1_ODP_001` e `RM_P1_ODP_002`
  - warehouse coerente `Mc`
- Serie numerica ODP disponibile
- Create / Read / Update / Logout eseguibili

### Non mancanti / non bloccanti per questa prova
- Nessun fallback DI API necessario
- Nessuna apertura esterna del Service Layer necessaria
- Nessun connettore Esyy Flow implementato

## 3. Request / response rilevanti

### 3.1 Login
**Request**
```http
POST /b1s/v2/Login
Content-Type: application/json

{
  "CompanyDB": "SB02643_VTK",
  "UserName": "manager",
  "Password": "wizard"
}
```

**Response**
- Status: `200`
- Body rilevante:
```json
{
  "SessionId": "a2d816ea-3d94-11f1-8000-d4f5ef3ac620",
  "Version": "1000191",
  "SessionTimeout": 30
}
```
- Cookie rilevanti:
  - `B1SESSION=bf0f752e-3d94-11f1-8000-d4f5ef3ac620`
  - `ROUTEID=.node5`

### 3.2 Metadata
**Request**
```http
GET /b1s/v2/$metadata
Cookie: B1SESSION=...; ROUTEID=.node5
```

**Response**
- Status: `200`
- Oggetti verificati presenti:
  - `ProductionOrders`
  - `Items`
  - `ProductTrees`

### 3.3 Verifica dataset minimo
**Request**
```http
GET /b1s/v2/Items('FG_P1_ODP_TEST')
GET /b1s/v2/ProductTrees('FG_P1_ODP_TEST')
```

**Response**
- `Items(...)` → `200`
- `ProductTrees(...)` → `200`
- Dati confermati:
  - `TreeType = iProductionTree`
  - `Warehouse = Mc`
  - componenti BOM presenti

### 3.4 Create ODP
**Request**
```http
POST /b1s/v2/ProductionOrders
Content-Type: application/json
Cookie: B1SESSION=...; ROUTEID=.node5

{
  "DueDate": "2026-04-25",
  "ItemNo": "FG_P1_ODP_TEST",
  "PlannedQuantity": 1,
  "Warehouse": "Mc"
}
```

**Response**
- Status: `201`
- Header rilevante:
  - `Location: .../ProductionOrders(3585)`
- Body rilevante:
```json
{
  "AbsoluteEntry": 3585,
  "DocumentNumber": 2026230060,
  "Series": 138,
  "ItemNo": "FG_P1_ODP_TEST",
  "ProductionOrderStatus": "boposPlanned",
  "ProductionOrderOrigin": "bopooManual",
  "Warehouse": "Mc"
}
```

### 3.5 Read ODP creato
**Request**
```http
GET /b1s/v2/ProductionOrders(3585)?$select=AbsoluteEntry,DocumentNumber,Series,ItemNo,PlannedQuantity,DueDate,PostingDate,StartDate,ProductionOrderStatus,ProductionOrderOrigin,Warehouse,Remarks
Cookie: B1SESSION=...; ROUTEID=.node5
```

**Response**
- Status: `200`
- Body rilevante:
```json
{
  "AbsoluteEntry": 3585,
  "DocumentNumber": 2026230060,
  "Series": 138,
  "ItemNo": "FG_P1_ODP_TEST",
  "ProductionOrderStatus": "boposPlanned",
  "ProductionOrderOrigin": "bopooManual",
  "Remarks": null,
  "Warehouse": "Mc"
}
```

### 3.6 Update ODP
**Request**
```http
PATCH /b1s/v2/ProductionOrders(3585)
Content-Type: application/json
Cookie: B1SESSION=...; ROUTEID=.node5

{
  "ProductionOrderStatus": "boposReleased",
  "Remarks": "P1 prototype update"
}
```

**Response**
- Status: `204`
- Nessun body

### 3.7 Read finale post update
**Request**
```http
GET /b1s/v2/ProductionOrders(3585)?$select=AbsoluteEntry,DocumentNumber,Series,ProductionOrderStatus,Remarks,Warehouse,ItemNo
Cookie: B1SESSION=...; ROUTEID=.node5
```

**Response**
- Status: `200`
- Body rilevante:
```json
{
  "AbsoluteEntry": 3585,
  "DocumentNumber": 2026230060,
  "Series": 138,
  "ItemNo": "FG_P1_ODP_TEST",
  "ProductionOrderStatus": "boposReleased",
  "Remarks": "P1 prototype update",
  "Warehouse": "Mc"
}
```

### 3.8 Logout
**Request**
```http
POST /b1s/v2/Logout
Cookie: B1SESSION=...; ROUTEID=.node5
```

**Response**
- Status: `204`

## 4. Payload realmente funzionanti o falliti

### Funzionanti
#### Create ODP
```json
{
  "DueDate": "2026-04-25",
  "ItemNo": "FG_P1_ODP_TEST",
  "PlannedQuantity": 1,
  "Warehouse": "Mc"
}
```

#### Update ODP
```json
{
  "ProductionOrderStatus": "boposReleased",
  "Remarks": "P1 prototype update"
}
```

### Falliti
- Nessun payload critico fallito nella prova eseguita
- Nessuna correzione richiesta in corso prova su create/read/update/logout

## 5. Chiavi ERP effettivamente emerse
- **AbsoluteEntry:** `3585`
- **DocumentNumber:** `2026230060`
- **Series:** `138`

### Lettura operativa delle chiavi
- `AbsoluteEntry` = chiave ERP tecnica da usare come riferimento principale di riconciliazione
- `DocumentNumber` = riferimento documento leggibile lato SAP/UI
- `Series` = contesto di numerazione ERP da conservare come metadata di supporto

## 6. Evidenze raccolte
- Endpoint locale raggiungibile via HTTPS
- Login riuscito con sessione Service Layer valida
- Metadata OData coerente con il perimetro prototipo
- Dataset minimo esistente e coerente
- ODP creato via API e visibile in SAP UI
- BOM esplosa correttamente in righe ODP
- ODP letto via API con chiavi coerenti
- ODP aggiornato via API da `Planned` a `Released`
- `Remarks` aggiornato correttamente
- Coerenza API/UI SAP confermata prima e dopo update
- Logout riuscito

## 7. Classificazione finale del prototipo
**Classificazione:** **chiuso**

### Motivazione
Il prototipo P1, nel perimetro minimo definito in OLE-04, è stato eseguito con esito positivo completo su:
- create
- read
- update
- verifica UI SAP
- chiusura sessione

L’anomalia osservata in UI è stata dichiarata dal team come effetto di una personalizzazione **B1UP** non incidente sull’obiettivo del prototipo e quindi **non viene considerata bloccante né rilevante** ai fini della classificazione finale.

## 8. Decisione operativa finale
**Decisione:** **aprire con vincoli**

### Vincoli da mantenere
1. Aprire sviluppo controllato solo sul **perimetro minimo validato**:
   - create/read/update di ODP standard via Service Layer
   - riconciliazione su `AbsoluteEntry`
   - conservazione di `DocumentNumber` e `Series`
2. Non estendere ancora il workstream a:
   - ODP con origine MTO reale
   - legami Sales Order / origin entry
   - movimenti di magazzino di produzione
   - issue/receipt
   - conto lavoro
3. Modellare subito il layer `int_*` coerente con quanto emerso:
   - link esterno ERP basato su chiave tecnica ERP
   - tracciamento request/response essenziali
   - storage del contesto documento ERP
4. Separare chiaramente nel design tecnico:
   - dominio core Esyy Flow
   - identificativi ERP
   - log / sync run / external link nel layer `int_*`

## 9. Impatto operativo atteso

### Su Isabell
- può aprire uno sviluppo controllato del primo slice integrazione ODP
- può assumere come valido il pattern Service Layer su ODP standard
- può usare `AbsoluteEntry` come chiave primaria di link ERP nel layer integrazione
- non deve ancora implementare flussi estesi oltre il perimetro P1 validato

### Su Nikolay
- può modellare le strutture `int_*` minime per ODP ERP linkate a entità core
- deve mantenere separazione tra core domain e external links
- deve preservare la differenza tra chiave tecnica ERP e numero documento ERP

## 10. Decisione che il prototipo ha permesso di prendere
La prova consente di decidere che il workstream integrazioni può partire sul primo slice ODP con **Service Layer come baseline primaria effettivamente validata**, senza necessità di fallback immediato su DI API per il caso minimo di create/read/update ODP standard.

## 11. Conclusione sintetica
Il prototipo P1 ha confermato che, nell’ambiente SAP B1 test disponibile, gli ODP standard possono essere:
- creati via Service Layer,
- riletti con chiavi ERP stabili,
- aggiornati nel cambio stato minimo,
- verificati con coerenza anche lato UI SAP.

Il workstream può quindi avanzare, ma in modo **controllato e con perimetro iniziale stretto**, rinviando le varianti più complesse ai prototipi successivi.
