# OLE-04 — Scheda esecutiva prototipo P1 (ODP bidirezionali)

## 0. Scopo del prototipo

Trasformare **P1 — ODP bidirezionali** nel primo prototipo concretamente eseguibile del workstream integrazioni, senza aprire ancora lo sviluppo esteso del connettore.

Il prototipo deve verificare in modo minimo ma decisionale che Esyy Flow possa:

1. **creare** un ordine di produzione in SAP Business One tramite Service Layer;
2. **rileggere** l’ordine creato e acquisire le chiavi ERP necessarie alla riconciliazione;
3. **aggiornare** almeno un sottoinsieme minimo di campi dell’ordine;
4. **confermare** che la lettura di ritorno è sufficiente a sostenere un primo ciclo app → ERP → app.

## 1. Ambiente e prerequisiti minimi della prova

### 1.1 Ambiente SAP richiesto

- Un ambiente SAP Business One raggiungibile via **Service Layer OData v4** (`/b1s/v2`).
- Un `CompanyDB` di test non condiviso con attività operative reali.
- Credenziali tecniche con permessi sufficienti su:
  - login Service Layer;
  - lettura `Items`;
  - lettura `ProductTrees`;
  - CRUD su `ProductionOrders`.
- Certificato TLS accettato dal client di prova oppure eccezione SSL gestita solo in ambiente test.

### 1.2 Prerequisiti applicativi minimi lato Esyy Flow

- Un tenant di test dedicato.
- Un identificativo tecnico interno dell’ODP da usare come chiave applicativa (`production_order.id` UUID).
- Una convenzione temporanea per il layer `int_*` già definita a livello documento, anche se non ancora implementata in DB definitivo.
- Una convenzione di naming coerente con DB-00 per i record che saranno necessari dopo il prototipo:
  - `production_orders`
  - `production_order_events`
  - `production_order_status_history`
  - `int_sync_runs`
  - `int_external_links`
  - `int_message_logs` oppure equivalente tecnico approvabile

### 1.3 Prerequisiti organizzativi minimi

- Finestra di prova dedicata, con possibilità di ripetere il test almeno 2 volte.
- Una persona in grado di verificare i risultati anche dalla UI SAP, non solo dalle API.
- Regola condivisa: nessuna modifica manuale ERP sullo stesso ODP durante l’esecuzione del prototipo.

---

## 2. Dataset minimo richiesto

Il prototipo P1 deve usare un dataset volutamente ridotto.

### 2.1 Dati ERP minimi obbligatori

- **1 item producibile** già esistente in SAP B1, ad esempio `FG_P1_TEST`.
- **1 BOM / Product Tree** valido per lo stesso item.
- **1 warehouse** valido, ad esempio `MD01`.
- Numerazione documentale attiva per gli ordini di produzione.
- Nessun blocco noto di approvazione o regola custom che impedisca la creazione standard.

### 2.2 Dati Esyy Flow minimi obbligatori

- `tenant_id` di test.
- `production_order.id` UUID generato internamente.
- Campi minimi applicativi da usare come input logico del prototipo:
  - `item_code`
  - `planned_qty`
  - `posting_date`
  - `due_date`
  - `warehouse_code`
  - `internal_order_uuid`
  - `source_type = app_test`

### 2.3 Dataset volutamente escluso dal primo prototipo

Per il primo giro P1 **non sono obbligatori**:

- ordine di vendita MTO collegato;
- commessa reale collegata;
- materiali effettivi ODP;
- fasi ODP mappate in dettaglio;
- conto lavoro;
- UDF ERP custom;
- sincronizzazione real-time.

L’obiettivo è validare il ciclo minimo di vita dell’ODP ERP, non il dominio completo.

---

## 3. Endpoint Service Layer da usare nell’ordine corretto

### Sequenza esecutiva proposta

#### Step 1 — Login

`POST /b1s/v2/Login`

Scopo:
- aprire sessione;
- ottenere `B1SESSION` e `ROUTEID`;
- verificare che l’ambiente sia pronto.

#### Step 2 — Metadata sanity check

`GET /b1s/v2/$metadata`

Scopo:
- confermare che il nodo espone OData v4;
- verificare presenza dell’entità `ProductionOrders`.

> Questo step è consigliato all’avvio della sessione, non necessariamente ad ogni run successivo.

#### Step 3 — Verifica anagrafica item

`GET /b1s/v2/Items('FG_P1_TEST')?$select=ItemCode,ItemName`

Scopo:
- verificare che l’item esista;
- evitare falsi negativi di creazione dovuti a item mancanti.

#### Step 4 — Verifica Product Tree / BOM

`GET /b1s/v2/ProductTrees('FG_P1_TEST')`

Scopo:
- verificare che l’item sia producibile nel contesto ERP;
- confermare che il BOM esista prima della creazione ODP.

#### Step 5 — Creazione ODP

`POST /b1s/v2/ProductionOrders`

Scopo:
- creare il primo ODP ERP partendo da payload minimale;
- verificare la risposta SAP e le chiavi generate.

#### Step 6 — Rilettura puntuale ODP

`GET /b1s/v2/ProductionOrders(<AbsoluteEntry>)?$select=AbsoluteEntry,DocumentNumber,Series,ItemNo,PlannedQuantity,PostingDate,DueDate,Warehouse,ProductionOrderStatus`

Scopo:
- acquisire le chiavi ERP definitive;
- verificare che la lettura puntuale sia sufficiente alla riconciliazione.

#### Step 7 — Aggiornamento minimale ODP

`PATCH /b1s/v2/ProductionOrders(<AbsoluteEntry>)`

Scopo:
- verificare che l’ordine creato sia aggiornabile via Service Layer;
- tentare una modifica minima ma utile, senza entrare ancora in logiche pesanti.

#### Step 8 — Rilettura post-update

`GET /b1s/v2/ProductionOrders(<AbsoluteEntry>)?$select=AbsoluteEntry,DocumentNumber,ProductionOrderStatus,Remarks`

Scopo:
- verificare l’effettiva persistenza dell’update;
- distinguere campi realmente aggiornabili da campi solo formalmente patchabili.

#### Step 9 — Logout

`POST /b1s/v2/Logout`

Scopo:
- chiudere la sessione in modo pulito;
- evitare effetti collaterali fra run successivi.

---

## 4. Payload minimo da tentare

## 4.1 Payload di login

```json
{
  "CompanyDB": "<COMPANY_DB>",
  "UserName": "<SERVICE_USER>",
  "Password": "<PASSWORD>"
}
```

## 4.2 Payload minimo di creazione ODP

```json
{
  "DueDate": "2026-04-20",
  "ItemNo": "FG_P1_TEST",
  "PlannedQuantity": 3,
  "PostingDate": "2026-04-18",
  "Warehouse": "MD01"
}
```

### Note sul payload di creazione

- Va usata la forma più vicina possibile agli esempi standard SAP.
- Non introdurre in questa prova campi custom, UDF o mapping applicativi non ancora validati.
- Nessun riferimento a commessa o ordine vendita nel payload minimo del primo run.

## 4.3 Payload minimo di update ODP

### Variante A — update ultra-sicuro

```json
{
  "Remarks": "P1 prototype update"
}
```

### Variante B — update con cambio stato da validare

```json
{
  "ProductionOrderStatus": "R",
  "Remarks": "P1 prototype release"
}
```

### Regola di esecuzione

- Eseguire prima la **Variante A**.
- Eseguire la **Variante B** solo se il primo update è andato a buon fine e il contesto ERP non presenta vincoli evidenti.

---

## 5. Output e chiavi ERP attese

## 5.1 Output atteso dal login

- `HTTP 200 OK`
- cookie `B1SESSION`
- cookie `ROUTEID`
- `SessionId`
- `SessionTimeout`

## 5.2 Output atteso dalla creazione ODP

Output standard atteso:
- `HTTP 201 Created`
- body con entità creata oppure, se si usa `Prefer: return-no-content`, `HTTP 204` con `Location`

Chiavi ERP attese da intercettare:
- `AbsoluteEntry`
- `DocumentNumber`
- `Series`
- `ProductionOrderStatus`
- `ItemNo`
- `Warehouse`

## 5.3 Chiavi minime da riportare nel layer di integrazione

Anche senza DB definitivo, il prototipo deve produrre il modello concettuale di riconciliazione:

- `tenant_id`
- `internal_order_uuid`
- `external_system = SAP_B1`
- `external_object_type = ProductionOrders`
- `external_primary_key = AbsoluteEntry`
- `external_document_no = DocumentNumber`
- `sync_direction = outbound_create`
- `sync_status = success | failed | partial`

---

## 6. Evidenze da raccogliere

Perché il prototipo sia considerato utile, le evidenze devono essere raccolte in modo ordinato.

## 6.1 Evidenze tecniche obbligatorie

- richiesta HTTP completa per ciascuno step, con dati sensibili mascherati;
- response code di ciascuno step;
- body JSON di risposta per create / read / patch / read-back;
- header significativi:
  - `Set-Cookie`
  - `Location` se presente
  - eventuali header di preferenza
- tempo di risposta osservato per create, read, patch.

## 6.2 Evidenze funzionali obbligatorie

- screenshot o verifica manuale in UI SAP dell’ODP creato;
- conferma che i valori chiave coincidano tra API e UI ERP;
- conferma che l’update scelto sia effettivamente riflesso nell’ordine.

## 6.3 Evidenze decisionali da produrre a fine prova

- elenco delle chiavi ERP realmente affidabili per riconciliazione;
- esito sulla fattibilità del create standard;
- esito sulla fattibilità dell’update standard;
- nota su eventuali vincoli ERP non previsti;
- raccomandazione finale: Service Layer sufficiente / Service Layer sufficiente con vincoli / fallback da valutare.

---

## 7. Rischi osservabili durante la prova

## 7.1 Rischi di blocco immediato

- item non producibile o BOM assente;
- warehouse non coerente;
- autorizzazioni insufficienti del service user;
- sessione non stabile o cookie non riutilizzati correttamente;
- mismatch fra ambiente test atteso e configurazione reale SAP.

## 7.2 Rischi funzionali osservabili

- il create riesce ma restituisce chiavi non sufficienti al layer `int_*`;
- il PATCH accetta `Remarks` ma non accetta il cambio di stato desiderato;
- l’ordine viene creato con default ERP non previsti e non leggibili in modo consistente;
- l’ordine richiede passaggi manuali ERP aggiuntivi non compatibili con un flusso app-centrico.

## 7.3 Rischi architetturali osservabili

- necessità di UDF per ottenere una correlazione robusta;
- necessità di regole di idempotenza più forti già in fase iniziale;
- necessità di distinguere create/update/read con granularità maggiore nel layer `int_*`;
- necessità di fallback DI API per operazioni non gestibili via Service Layer standard.

---

## 8. Criterio di successo / fallimento del prototipo

## Successo pieno

Il prototipo è **successo pieno** se:

- il login è stabile;
- l’ODP viene creato via Service Layer senza custom ERP;
- SAP restituisce chiavi ERP riutilizzabili in modo affidabile;
- il read-back consente di allineare l’ordine nel layer `int_*`;
- almeno un update minimo riesce e viene confermato da rilettura;
- non emergono blocchi che impongano DI API o interventi manuali strutturali.

## Successo parziale

Il prototipo è **successo parziale** se:

- la creazione riesce;
- la rilettura funziona;
- l’update è parzialmente limitato oppure richiede regole più rigide;
- resta comunque possibile procedere con design tecnico del connettore P1.

## Fallimento decisionale

Il prototipo è **fallimento decisionale** se:

- non si riesce a creare l’ODP in modo affidabile;
- le chiavi restituite non bastano a sostenere la riconciliazione;
- l’ordine creato non è rileggibile in modo coerente;
- l’update minimo è incompatibile con le regole reali SAP;
- emerge dipendenza sostanziale da custom ERP o da DI API già nel caso minimo.

---

## 9. Impatto atteso su Isabell e Nikolay

## 9.1 Impatto su Isabell

Il prototipo P1 deve permettere a Isabell di capire:

- se il primo connettore ODP può essere costruito su un flusso standard `login → create → read → patch → read`;
- quali campi minimi servono nel DTO applicativo iniziale;
- quali errori e response code devono essere gestiti fin dal primo adapter;
- se il primo ciclo può restare leggero, senza orchestrazione complessa.

## 9.2 Impatto su Nikolay

Il prototipo P1 deve permettere a Nikolay di fissare o confermare:

- le chiavi da memorizzare nel layer `int_*`;
- il perimetro minimo di `int_external_links`;
- la struttura di `int_sync_runs` e `int_message_logs`;
- il confine fra chiavi tecniche interne e chiavi business ERP;
- i campi snapshot realmente utili rispetto a quelli da non duplicare.

---

## 10. Decisione finale che il prototipo deve permettere di prendere

Il prototipo P1 deve consentire una decisione esplicita e binaria:

### Decisione attesa

**Possiamo aprire il workstream ODP bidirezionali partendo da Service Layer standard e da un primo adapter leggero, oppure no?**

### Esiti ammessi

#### Esito A — aprire sviluppo controllato

Si può procedere al passo successivo se il prototipo conferma che:
- create e read-back sono affidabili;
- le chiavi ERP sono sufficienti;
- l’update minimo è gestibile;
- non serve DI API per il caso base.

#### Esito B — aprire sviluppo con vincoli espliciti

Si può procedere ma con nota vincolante se:
- create e read funzionano;
- l’update è solo parzialmente disponibile;
- servono regole più strette su mapping o stato;
- servono campi di riconciliazione aggiuntivi nel layer `int_*`.

#### Esito C — non aprire ancora sviluppo esteso

Non si deve aprire lo sviluppo del connettore ODP se:
- il caso base non è stabile;
- le chiavi ERP non sono sufficienti;
- emerge forte dipendenza da custom ERP;
- la fattibilità standard Service Layer non è confermata.

---

## 11. Raccomandazione operativa finale per l’esecuzione

L’esecuzione di OLE-04 deve essere trattata come **prova singola guidata**, non come mini-sviluppo.

Ordine operativo consigliato:

1. login e sanity check;
2. verifica item e BOM;
3. create ODP;
4. read-back chiavi;
5. update ultra-minimo (`Remarks`);
6. eventuale update con stato solo come step aggiuntivo;
7. raccolta evidenze;
8. decisione finale.

Questa sequenza è sufficiente a validare il nucleo del prototipo P1 senza introdurre ancora complessità non necessarie.
