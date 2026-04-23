# OLE-07 — Scheda esecutiva prototipo P2
## Movimenti di magazzino legati alla produzione

## 1. Scopo del prototipo

Trasformare il prossimo caso decisionale del workstream integrazioni in una prova eseguibile e verificabile, successiva a:
- **P1 chiuso** sugli ODP bidirezionali
- **P4 congelato** sul nucleo minimo del layer `int_*`

Il prototipo P2 deve validare se il perimetro minimo dei **movimenti di magazzino collegati a un ODP standard** può essere gestito via **SAP Business One Service Layer**, mantenendo Esyy Flow app-centrico e senza anticipare un connettore esteso.

## 2. Domanda decisionale del prototipo

La decisione che P2 deve permettere di prendere è questa:

**Possiamo aprire uno sviluppo controllato del primo slice movimenti produzione su SAP B1, basato su ODP standard già esistente, distinguendo chiaramente issue e receipt e mantenendo le chiavi ERP nel layer `int_*`?**

## 3. Caso minimo decisionale da testare

Il caso minimo da validare è articolato in due sottocasi consecutivi:

### P2-A — Receipt from Production minimo
Creare via Service Layer un movimento di carico produzione collegato a un ODP standard già rilasciato.

### P2-B — Issue for Production minimo
Creare via Service Layer un movimento di scarico produzione collegato allo stesso ODP, su almeno una riga materiale valida.

## 4. Perimetro esplicito incluso / escluso

### Incluso
- ODP standard già creato in SAP B1 test
- test di `InventoryGenEntries` come receipt from production
- test di `InventoryGenExits` come issue for production
- raccolta chiavi ERP minime del documento movimento
- verifica coerenza API/UI SAP
- verifica della riconducibilità del movimento all’ODP

### Escluso
- connettore esteso Esyy Flow ↔ SAP
- issue/receipt multi-riga complessi
- lotti, seriali, bin locations obbligatori
- WIP multi-fase avanzato
- transfer request / transfer inter-magazzino completi
- conto lavoro passivo
- cancellazioni e storni documentali completi
- logiche MTO / Sales Order linkage

## 5. Precondizioni derivate da P1 e P4

### P1 già validato
- login, metadata e gestione sessione Service Layer
- ODP standard creato e aggiornato via `ProductionOrders`
- chiavi ERP disponibili:
  - `AbsoluteEntry`
  - `DocumentNumber`
  - `Series`

### P4 già congelato
- nessuna chiave ERP raw nel core domain
- chiavi e mapping nel layer `int_*`
- uso di `int_external_links`, `int_sync_runs`, `int_message_logs` o equivalenti

## 6. Ambiente e prerequisiti minimi della prova

### Ambiente minimo
- SAP Business One test con Service Layer OData v4 raggiungibile
- utente test con permessi su:
  - `ProductionOrders`
  - `InventoryGenEntries`
  - `InventoryGenExits`
- client di test locale / Postman desktop nella rete SAP test

### Prerequisiti SAP minimi
1. esiste un ODP standard già rilasciato
2. l’ODP è riferito a un articolo producibile con BOM valida
3. il magazzino usato dall’ODP è valido
4. per il test issue, almeno una riga componente è effettivamente emettibile nel contesto SAP test
5. se l’ambiente usa issue method `Backflush`, il test issue va considerato a rischio e deve essere validato con un dataset che non blocchi la prova per sola configurazione articolo/BOM

## 7. Dataset minimo richiesto

### Dataset base
- articolo padre già usato in P1 oppure equivalente
- ODP standard già creato e rilasciato
- quantità minima: `1`
- warehouse coerente con ODP e BOM

### Dati da raccogliere prima della prova
- `ProductionOrders.AbsoluteEntry`
- `ProductionOrders.DocumentNumber`
- `ProductionOrders.Series`
- `Warehouse`
- stato ODP prima della prova
- righe materiali dell’ODP con almeno:
  - `LineNumber`
  - `ItemNo`
  - `Warehouse`
  - `ProductionOrderIssueType` o configurazione issue method osservabile

## 8. Endpoint Service Layer da usare nell’ordine corretto

### Sequenza proposta
1. `POST /b1s/v2/Login`
2. `GET /b1s/v2/ProductionOrders(<AbsoluteEntry>)`
3. `POST /b1s/v2/InventoryGenEntries`
4. `GET /b1s/v2/InventoryGenEntries(<DocEntry>)`
5. `POST /b1s/v2/InventoryGenExits`
6. `GET /b1s/v2/InventoryGenExits(<DocEntry>)`
7. `GET /b1s/v2/ProductionOrders(<AbsoluteEntry>)`
8. `POST /b1s/v2/Logout`

## 9. Payload minimi da tentare

## 9.1 Payload minimo P2-A — receipt from production

```json
{
  "DocDate": "<posting_date>",
  "DocDueDate": "<posting_date>",
  "DocumentLines": [
    {
      "BaseEntry": "<production_order_absolute_entry>",
      "BaseType": "202",
      "Quantity": 1,
      "WarehouseCode": "<warehouse_code>"
    }
  ]
}
```

### Razionale
- usa il riferimento al documento produzione via `BaseEntry`
- usa `BaseType = 202` come riferimento a produzione
- riduce il test al solo carico minimo collegato all’ODP

## 9.2 Payload minimo P2-B — issue for production

```json
{
  "DocDate": "<posting_date>",
  "DocDueDate": "<posting_date>",
  "DocumentLines": [
    {
      "BaseEntry": "<production_order_absolute_entry>",
      "BaseLine": <production_order_line_number>,
      "BaseType": "202",
      "Quantity": 1,
      "WarehouseCode": "<warehouse_code>"
    }
  ]
}
```

### Razionale
- vincola lo scarico a una riga reale dell’ODP
- usa `BaseLine` per evitare ambiguità materiale
- mantiene il caso minimo su quantità unitaria

## 10. Input / output attesi

## 10.1 Input minimi
- sessione Service Layer valida
- `AbsoluteEntry` ODP
- riga componente valida per issue
- warehouse coerente
- posting date del test

## 10.2 Output attesi P2-A
- documento `InventoryGenEntries` creato
- chiavi ERP movimento carico emerse:
  - `DocEntry`
  - `DocNum`
  - `Series` se disponibile
- evidenza di collegamento all’ODP di origine

## 10.3 Output attesi P2-B
- documento `InventoryGenExits` creato
- chiavi ERP movimento scarico emerse:
  - `DocEntry`
  - `DocNum`
  - `Series` se disponibile
- evidenza di collegamento alla riga ODP di origine

## 11. Evidenze da raccogliere

Per ciascun sottocaso:
- request completa
- response completa
- header rilevanti
- payload realmente usato
- chiavi ERP restituite
- screenshot SAP UI del documento creato
- screenshot SAP UI dell’ODP dopo il movimento
- eventuale impatto su quantità emesse / ricevute leggibile in UI
- eventuali errori o warning tecnici

## 12. Criteri di successo / fallimento

## 12.1 Successo P2-A
Il sottocaso receipt è considerato riuscito se:
- `POST InventoryGenEntries` restituisce documento creato
- il documento è leggibile via GET
- la UI SAP mostra il movimento coerente
- il movimento risulta riconducibile all’ODP testato

## 12.2 Successo P2-B
Il sottocaso issue è considerato riuscito se:
- `POST InventoryGenExits` restituisce documento creato
- il documento è leggibile via GET
- la UI SAP mostra il movimento coerente
- la riga dell’ODP o il documento movimento mantiene il collegamento all’origine

## 12.3 Fallimento forte
Il prototipo è da considerare fallito se:
- non è possibile creare alcun movimento riferito all’ODP
- il collegamento all’origine produzione non emerge
- la create API riesce ma il documento non è coerente o non compare in UI SAP
- il dataset standard richiede personalizzazioni tali da invalidare il caso minimo

## 12.4 Fallimento riducibile
Il prototipo è da considerare riducibile ma non bloccato se:
- il receipt funziona e l’issue no per sola configurazione issue method
- servono campi aggiuntivi minimi non previsti nel primo payload
- servono serie o warehouse espliciti ma il comportamento resta coerente

## 13. Rischi osservabili durante la prova

1. **Issue method incompatibile**
   - componenti in backflush non facilmente emettibili con test manuale minimo

2. **Serie numeriche mancanti o non coerenti**
   - documenti magazzino non numerabili nel DB test

3. **Warehouse / bin constraints**
   - ambiente con vincoli logistici non coperti dal payload minimo

4. **Base document linkage non sufficiente**
   - il documento si crea ma il legame all’ODP non è leggibile come atteso

5. **Divergenza API / UI**
   - documento creato via API ma rappresentazione incompleta o differente in SAP UI

6. **Campi extra obbligatori per localizzazione o customizzazioni**
   - l’ambiente richiede dati non presenti nel payload standard

## 14. Impatto atteso su Isabell e Nikolay

## 14.1 Impatto su Isabell
Se P2 passa:
- può progettare uno slice controllato di orchestrazione movimenti produzione
- può mantenere fuori dal core domain i dettagli ERP raw dei documenti di magazzino
- può usare il layer `int_*` per legare ODP ↔ movimenti SAP senza contaminare `production_orders`

Se P2 fallisce o è solo parziale:
- deve evitare di accoppiare la UX MES/WIP direttamente al posting SAP
- deve introdurre uno strato applicativo di pending movement / requested movement prima della sincronizzazione ERP

## 14.2 Impatto su Nikolay
Se P2 passa:
- può estendere il nucleo `int_*` con mapping minimi per documenti magazzino produzione
- può definire link separati per:
  - `production_order`
  - `inventory_gen_entry`
  - `inventory_gen_exit`
- può mantenere una struttura relazionale chiara tra run, messaggi e external links

Se P2 fallisce o è parziale:
- deve evitare di fissare prematuramente cardinalità o vincoli rigidi tra ODP e movimenti ERP
- deve lasciare spazio a mapping più elastici o a step intermedi di riconciliazione

## 15. Decisione strutturale finale che il prototipo deve permettere di prendere

P2 deve permettere di scegliere tra tre esiti strutturali:

### Esito A — aprire sviluppo controllato
Se receipt e issue funzionano entrambi in modo coerente:
- si apre il primo slice movimenti produzione standard
- il layer `int_*` viene esteso ai documenti magazzino collegati a ODP
- si può pianificare il prototipo successivo senza introdurre adapter speciali

### Esito B — aprire con vincoli
Se receipt funziona e issue richiede dataset/configurazione più mirata:
- si apre sviluppo controllato solo sul movimento supportato
- si rinvia l’altro sottocaso a una scheda successiva o a un dataset dedicato

### Esito C — non aprire ancora lo sviluppo esteso
Se il collegamento produzione ↔ movimenti non è sufficientemente stabile:
- non si apre ancora lo sviluppo del posting ERP reale
- si mantiene in Esyy Flow la registrazione operativa come evento applicativo, non ancora come posting SAP definitivo

## 16. Raccomandazione operativa iniziale

La prova va eseguita in due tempi:
1. **prima il receipt from production (P2-A)**, perché è il sottocaso più diretto per verificare il legame documento produzione → movimento di carico
2. **poi l’issue for production (P2-B)**, che è più sensibile a riga componente, issue method e vincoli di magazzino

Questo ordine massimizza il valore decisionale e riduce il rischio di interpretare come blocco strutturale un problema che potrebbe essere solo di configurazione del dataset issue.

