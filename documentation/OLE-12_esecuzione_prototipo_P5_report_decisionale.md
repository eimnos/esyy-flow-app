# OLE-12 — Esecuzione prototipo P5 e report decisionale

## Stato deliverable
**Completato**

## Classificazione finale del prototipo
**Chiuso**

## Decisione operativa finale
**Aprire sviluppo controllato**

---

## 1. Obiettivo del prototipo

Validare il perimetro minimo di **bootstrap iniziale ERP verso Esyy Flow** per chiarire in modo operativo il confine tra:

- **dati bootstrapati**
- **dati sincronizzati**
- **dati nativi dell’app**

Il prototipo è stato limitato ai due oggetti minimi già emersi come realistici e disponibili nel Service Layer:

- `Items`
- `ProductTrees`

L’obiettivo non era costruire un onboarding ERP completo, ma verificare se il bootstrap iniziale possa essere congelato in modo pulito su:
- **articolo ERP**
- **struttura materiali minima ERP**

senza anticipare bootstrap impropri di:
- distinta ciclo ricca
- modello produttivo
- pre-industrializzazione
- regole applicative di completezza e consolidamento

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
- Service Layer raggiungibile
- login valido
- oggetti bootstrap candidati leggibili:
  - `Items('FG_P1_ODP_TEST')`
  - `ProductTrees('FG_P1_ODP_TEST')`
- articolo ERP già coerente con uno scenario produttivo:
  - `TreeType = iProductionTree`
  - `ProcurementMethod = bom_Make`
- struttura materiali ERP semplice, leggibile e comprensibile:
  - 1 header
  - 2 righe componenti
  - issue method coerente (`im_Backflush`)

### Mancanti / non raccolti in modo completo
- screenshot UI SAP articolo e BOM non raccolti in modo sistematico
- nessuna prova su import massivo o drift reale multi-oggetto
- nessuna prova su versioning pieno di struttura in app

Questi elementi non invalidano il prototipo, ma confermano che il test era correttamente limitato al **caso minimo decisionale**.

---

## 4. Request/response rilevanti

## 4.1 Read articolo bootstrap candidato
**Request**
`GET /Items('FG_P1_ODP_TEST')`

**Esito**
- HTTP `200`

**Evidenze rilevanti**
- `ItemCode = FG_P1_ODP_TEST`
- `ItemName = FG_P1_ODP_TEST`
- `Valid = tYES`
- `Frozen = tNO`
- `InventoryItem = tYES`
- `SalesItem = tYES`
- `PurchaseItem = tYES`
- `ManageSerialNumbers = tNO`
- `ManageBatchNumbers = tNO`
- `TreeType = iProductionTree`
- `ProcurementMethod = bom_Make`
- `IssueMethod = im_Backflush`

**Lettura**
L’articolo ERP è leggibile e contiene già il nucleo minimo necessario a costruire un bootstrap article record in Esyy Flow.

---

## 4.2 Read struttura materiali bootstrap candidata
**Request**
`GET /ProductTrees('FG_P1_ODP_TEST')`

**Esito**
- HTTP `200`

**Evidenze rilevanti**
- `TreeCode = FG_P1_ODP_TEST`
- `TreeType = iProductionTree`
- `Quantity = 1.0`
- `Warehouse = Mc`
- `ProductDescription = FG_P1_ODP_TEST`

**Righe**
- line 0:
  - `ItemCode = RM_P1_ODP_001`
  - `Quantity = 1.0`
  - `Warehouse = Mc`
  - `IssueMethod = im_Backflush`
  - `ItemType = pit_Item`
  - `ParentItem = FG_P1_ODP_TEST`
- line 1:
  - `ItemCode = RM_P1_ODP_002`
  - `Quantity = 1.0`
  - `Warehouse = Mc`
  - `IssueMethod = im_Backflush`
  - `ItemType = pit_Item`
  - `ParentItem = FG_P1_ODP_TEST`

**Lettura**
La ProductTree è leggibile e sufficiente a rappresentare una **struttura materiali minima ERP bootstrapabile**.

---

## 4.3 Chiusura sessione
**Request**
`POST /Logout`

**Esito**
- HTTP `204`

---

## 5. Payload realmente funzionanti o falliti

### Funzionanti
Nel perimetro del prototipo P5 non erano richiesti `POST` o `PATCH` su ERP.
Sono risultate funzionanti le letture minime:

- `GET /Items('FG_P1_ODP_TEST')`
- `GET /ProductTrees('FG_P1_ODP_TEST')`

### Falliti
Nessuna request fallita nel perimetro del test.

---

## 6. Chiavi ERP effettivamente emerse

### Articolo
- `ItemCode = FG_P1_ODP_TEST`

### Struttura materiali
- `TreeCode = FG_P1_ODP_TEST`

### Componenti struttura
- `RM_P1_ODP_001`
- `RM_P1_ODP_002`

Queste chiavi sono sufficienti per confermare che:
- il bootstrap può usare chiavi ERP leggibili e stabili
- il legame tecnico deve però restare nel layer `int_*`, non nel core domain

---

## 7. Evidenze raccolte

### Raccolte
- read completo articolo ERP
- read completo struttura materiali ERP
- identificazione di campi minimi utili al bootstrap
- identificazione di campi da considerare solo in sincronizzazione successiva
- conferma operativa del confine tra bootstrap e native app
- logout di sessione

### Non raccolte in modo completo
- screenshot UI SAP articolo
- screenshot UI SAP BOM
- prova di variazione successiva ERP per misurare il drift

---

## 8. Classificazione finale del prototipo

**Chiuso**

### Motivazione
Il prototipo permette di congelare in modo chiaro il confine decisionale richiesto:

- **articolo ERP** = bootstrapabile
- **ProductTree ERP** = bootstrapabile come struttura materiali minima
- **distinta ciclo ricca** = non bootstrapata da questo perimetro
- **modello produttivo Esyy Flow** = nativo app
- **pre-industrializzazione** = nativo app
- **regole di completezza/consolidamento** = native app

Non restano ambiguità strutturali sul caso minimo del bootstrap ERP iniziale.

---

## 9. Decisione operativa finale

**Aprire sviluppo controllato**

### Significato operativo
Il workstream integrazioni può aprire un primo slice controllato di bootstrap ERP verso Esyy Flow basato su:

- **articoli ERP (`Items`)**
- **strutture materiali minime ERP (`ProductTrees`)**

senza dover introdurre subito:
- bootstrap di routing/cycle
- bootstrap di modello produttivo
- bootstrap di pre-industrializzazione
- sincronizzazione massiva completa
- mapping esaustivo di tutti i campi ERP disponibili

---

## 10. Confine finale congelato

## 10.1 Dati bootstrapati
### Articolo ERP
Da bootstrapare:
- `ItemCode`
- `ItemName`
- `Valid`
- `Frozen`
- `InventoryItem`
- `SalesItem`
- `PurchaseItem`
- `ManageSerialNumbers`
- `ManageBatchNumbers`
- `TreeType`
- `ProcurementMethod`

### Struttura materiali minima ERP
Da bootstrapare:
- `TreeCode`
- `TreeType`
- `Quantity`
- `Warehouse`
- `ProductDescription`
- righe:
  - `ItemCode`
  - `Quantity`
  - `Warehouse`
  - `IssueMethod`
  - `ItemType`
  - `ParentItem`

---

## 10.2 Dati sincronizzati successivamente
### Articolo
- giacenze per warehouse
- quantità ordinate / impegnate
- variazioni di stato
- variazioni serial/batch
- eventuali metadati tecnici secondari

### Struttura materiali
- modifiche delle righe
- variazioni quantità
- variazioni warehouse di riga
- variazioni `IssueMethod`
- aggiunta/rimozione componenti
- rilevazione drift tra ERP e snapshot bootstrapato

---

## 10.3 Dati nativi dell’app
Restano nativi di Esyy Flow:
- DIBA completa/versionata
- distinta ciclo ricca
- modello produttivo
- stato di completezza
- regole di consolidamento
- pre-industrializzazione
- metadati tenant/app/UI
- semantica applicativa avanzata

---

## 11. Vincoli strutturali da congelare

1. Le chiavi ERP devono restare nel layer `int_*`.
2. Il core domain non deve esporre direttamente campi ERP raw non necessari.
3. `ProductTree` non va confusa con la DIBA piena Esyy Flow.
4. Bootstrap iniziale e sincronizzazione continua restano due problemi distinti.
5. Il modello produttivo Esyy Flow non è derivato automaticamente dall’ERP nel perimetro minimo validato.

---

## 12. Decisione strutturale che il prototipo permette di prendere

È possibile congelare questa baseline:

- **bootstrap iniziale**
  - articolo ERP
  - struttura materiali minima ERP

- **sync successiva**
  - drift e aggiornamenti su articolo/BOM ERP

- **native app**
  - ciclo
  - modello produttivo
  - pre-industrializzazione
  - completezza e consolidamento
  - metadati tenant/app

Questa separazione è sufficientemente concreta da permettere a sviluppo, DB e integrazione di muoversi senza ambiguità.

---

## 13. Sintesi finale

Il prototipo P5 chiude l’ultimo blocco prioritario iniziale integrazioni e conferma che il bootstrap ERP verso Esyy Flow può partire in modo pulito da:
- **articoli**
- **strutture materiali minime**

senza trasformare Esyy Flow in una proiezione dell’ERP e senza anticipare bootstrap impropri di oggetti applicativi più ricchi.

Questo consolida il confine corretto tra:
- **ciò che arriva da ERP**
- **ciò che viene riallineato nel tempo**
- **ciò che deve restare nativo dell’app**

---

## Esito sintetico per PM

- **OLE-12**: pronto da chiudere su base evidenze reali
- **Classificazione finale P5**: **chiuso**
- **Decisione operativa**: **aprire sviluppo controllato**
- **Confine finale**:
  - bootstrap: articoli + strutture materiali minime
  - sync: aggiornamenti e drift
  - native app: ciclo, modello, pre-industrializzazione, completezza, consolidamento
