# OLE-11 — Scheda esecutiva prototipo P5 (bootstrap articoli / strutture minime ERP)

## Stato deliverable
**Pronto per revisione**

## Obiettivo
Definire un prototipo **pratico, eseguibile e non ancora di connettore esteso** per validare il perimetro minimo di **bootstrap iniziale da ERP verso Esyy Flow** relativo a:

1. **articoli prodotto / componenti minimi**
2. **struttura materiali minima ERP**
3. **confine operativo tra dati da bootstrapare, dati da sincronizzare e dati nativi dell’app**

L’obiettivo non è ancora costruire il flusso completo di onboarding ERP, ma congelare il **caso decisionale minimo** che permetta al workstream integrazioni di aprire il primo slice di import iniziale senza ambiguità.

---

## 1. Contesto e motivazione

La baseline funzionale di Esyy Flow distingue chiaramente:
- **articoli prodotto**
- **DIBA**
- **distinte ciclo**
- **modelli produttivi**
- **pre-industrializzazione**

e considera DIBA, ciclo e modello come librerie produttive separate, mentre l’area di pre-industrializzazione può esistere anche prima della formalizzazione ERP/app. Inoltre il modello produttivo collega articolo, DIBA di default e cicli compatibili, mentre il consolidamento progressivo può sostituire componenti descrittivi con articoli ufficiali ERP/app.

Sul lato DB, **DB-00** impone:
- separazione tra dati di dominio, configurazione, operatività e integrazione;
- uso del layer `int_*` per riconciliazione e mapping ERP;
- divieto di introdurre campi ERP-specifici nelle tabelle core di dominio se non strettamente giustificati.

Di conseguenza, il prototipo P5 deve chiarire in modo operativo:
- cosa può essere **letto e bootstrapato da ERP**
- cosa può essere **sincronizzato successivamente**
- cosa deve restare **nativo dell’app**

---

## 2. Lettura operativa di partenza

### 2.1 Ciò che SAP B1 può già fornire in modo utile al bootstrap minimo
Nel lavoro già svolto nei prototipi precedenti sono emersi con certezza:
- `Items`
- `ProductTrees`

Questo indica che il perimetro minimo già realistico per il bootstrap iniziale è:

- **anagrafica articolo ERP**
- **struttura materiali ERP di tipo BOM/Production Tree**

### 2.2 Ciò che non conviene assumere come bootstrap universale in V1
Non va dato per scontato che SAP B1 possa bootstrapare in modo nativo e già semanticamente coerente con Esyy Flow:
- **distinta ciclo ricca**
- **modello produttivo Esyy Flow**
- **completeness state / operational state**
- **pre-industrializzazione**
- **regole applicative evolute di consolidamento**

Questi oggetti hanno una semantica applicativa più ricca di quanto il bootstrap ERP minimo possa garantire in modo universale.

---

## 3. Decisione da sbloccare con il prototipo

Il prototipo P5 deve permettere di prendere una decisione chiara sul bootstrap iniziale:

### Decisione strutturale attesa
Confermare se il primo bootstrap ERP verso Esyy Flow può essere congelato così:

- **bootstrap iniziale**:
  - articoli ERP (`Items`)
  - strutture materiali minime (`ProductTrees`)
- **sincronizzazione successiva / condizionata**:
  - aggiornamenti di articoli e BOM ERP
  - stato di validità / differenze / drift
- **dati nativi dell’app**:
  - distinte ciclo ricche
  - modelli produttivi Esyy Flow
  - pre-industrializzazione
  - stati di completezza / regole di consolidamento
  - metadati applicativi e UX/admin

---

## 4. Perimetro del prototipo

## 4.1 Dentro il prototipo P5
### P5-A — Bootstrap articolo minimo
Validare la lettura/importabilità minima di un articolo ERP come oggetto bootstrap.

### P5-B — Bootstrap struttura materiali minima
Validare la lettura/importabilità minima di una BOM/Production Tree ERP come base DIBA-like minima.

### P5-C — Decisione di confine
Definire, sulla base di P5-A e P5-B, quali dati:
- entrano nel bootstrap iniziale
- entrano nella sincronizzazione successiva
- restano nativi dell’app

## 4.2 Fuori dal prototipo P5
- import massivo completo
- connettore schedulato
- merge conflict / retry policy completi
- gestione versioning piena di DIBA/ciclo/modello
- mapping campo-per-campo esaustivo
- sincronizzazione ODP completa
- creazione di routing/cycle da ERP
- copertura di pre-industrializzazione

---

## 5. Entità candidate e baseline tecnica

### 5.1 Entità SAP B1 da usare nel prototipo
- `Items`
- `ProductTrees`

### 5.2 Entità SAP B1 opzionali ma non richieste per il caso minimo
- `BillOfMaterials` equivalenti solo se emergono come alias/variante nell’ambiente
- eventuali UDF articolo/BOM solo se già indispensabili per identificazione minima

### 5.3 Baseline tecnica proposta
- **Service Layer** come canale primario
- letture puntuali e controllate (`GET`)
- nessuna scrittura ERP richiesta nel prototipo
- nessun `PATCH/POST` salvo eventuali necessità tecniche solo per preparare dataset di prova

---

## 6. Criterio di separazione: bootstrap vs sync vs native app

## 6.1 Dati da bootstrapare
Sono i dati che servono a Esyy Flow per **partire** con un oggetto ERP già esistente senza doverlo ricreare manualmente.

### Articoli
Da bootstrapare:
- `ItemCode`
- `ItemName`
- indicatori base:
  - `Valid`
  - `Frozen`
  - `InventoryItem`
  - `SalesItem`
  - `PurchaseItem`
- gestione seriali/lotti:
  - `ManageSerialNumbers`
  - `ManageBatchNumbers`
- warehouse info minima rilevante
- eventuali UDF solo se necessarie a riconoscimento minimo

### Struttura materiali minima
Da bootstrapare:
- `TreeCode`
- `TreeType`
- `Quantity`
- `Warehouse`
- linee struttura:
  - `ItemCode`
  - `Quantity`
  - `Warehouse`
  - `IssueMethod`
  - `ItemType`

## 6.2 Dati da sincronizzare successivamente
Sono dati ERP che possono cambiare nel tempo e che non servono necessariamente tutti al bootstrap iniziale.

Esempi:
- validità/stato articolo nel tempo
- variazioni di BOM ERP
- nuove righe, modifiche quantità, variazioni issue method
- checksum / drift structure
- riallineamenti di metadati tecnici

## 6.3 Dati che devono restare nativi dell’app
Sono dati con semantica più ricca o specifica di Esyy Flow.

Esempi:
- DIBA versionata in forma piena Esyy Flow
- distinta ciclo ricca con tempi, setup, qualità, fasi esterne, rami alternativi
- modello produttivo con DIBA default, cicli compatibili e regole di scelta
- area di pre-industrializzazione
- stato di completezza dell’articolo
- regole tenant-specifiche di consolidamento
- audit e metadati UX/amministrativi

---

## 7. Subcaso P5-A — Bootstrap articolo minimo

## Obiettivo
Verificare che un articolo ERP possa essere letto in modo sufficiente a creare o aggiornare in Esyy Flow una **scheda bootstrap articolo** senza contaminare il dominio con campi ERP raw superflui.

## Prerequisiti minimi
- login Service Layer riuscito
- item ERP esistente e leggibile
- meglio se item già usato nei prototipi precedenti per continuità evidenze

## Dataset suggerito
- articolo padre di produzione già usato nei prototipi:
  - `FG_P1_ODP_TEST`
oppure
- componente semplice già usato nei prototipi logistici:
  - `RM_P1_ODP_001`

## Request da eseguire
`GET /Items('<ITEM_CODE>')`

## Output attesi
- response leggibile
- identificazione chiara dell’articolo
- metadati minimi sufficienti a costruire un bootstrap record

## Cosa verificare
- codice articolo
- descrizione
- flags base
- serial/batch management
- warehouse presence minima
- eventuale appartenenza a contesti produttivi rilevanti (`TreeType`, procurement hints, ecc.) senza eccedere in mapping prematuro

## Evidenze da raccogliere
- request/response completa
- screenshot UI SAP articolo, se possibile
- elenco campi considerati:
  - bootstrap
  - sync
  - native app

## Criterio di successo
È possibile definire un **bootstrap article payload minimo** coerente, senza portare nel core domain campi ERP-specifici non necessari.

---

## 8. Subcaso P5-B — Bootstrap struttura materiali minima

## Obiettivo
Verificare che una `ProductTree` ERP possa essere letta come **base DIBA-like minima** sufficiente al bootstrap iniziale.

## Prerequisiti minimi
- item padre esistente
- `ProductTree` esistente e leggibile
- struttura semplice e piccola, già nota dai prototipi precedenti

## Dataset suggerito
- `FG_P1_ODP_TEST` con `ProductTrees('FG_P1_ODP_TEST')`

## Request da eseguire
`GET /ProductTrees('<TREE_CODE>')`

## Output attesi
- response leggibile
- linee struttura comprensibili
- possibilità di derivare:
  - header struttura minima
  - righe componenti minime

## Cosa verificare
- codice struttura
- tipo struttura
- quantità base
- warehouse
- componenti
- issue method
- natura item/component line

## Evidenze da raccogliere
- request/response completa
- screenshot UI SAP BOM, se possibile
- elenco campi considerati:
  - bootstrap
  - sync
  - native app

## Criterio di successo
È possibile definire una **minimal material structure bootstrap** utilizzabile in Esyy Flow come base iniziale senza assumere di aver già bootstrapato la DIBA completa Esyy Flow.

---

## 9. Subcaso P5-C — Decisione di confine

## Obiettivo
Trasformare l’esito dei due read reali in una decisione strutturale per l’applicazione.

## Decisioni che il prototipo deve permettere di prendere
1. Gli articoli ERP possono alimentare un **bootstrap master record**?
2. Le `ProductTrees` ERP possono alimentare una **struttura materiali minima iniziale**?
3. La distinta ciclo ricca resta fuori dal bootstrap ERP minimo?
4. Il modello produttivo Esyy Flow resta nativo dell’app?
5. Il bootstrap deve creare:
   - record di dominio minimi
   - link tecnici nel layer `int_*`
   - stato di provenienza / bootstrap status

---

## 10. Proposta di struttura minima risultante in Esyy Flow

## 10.1 Risultato atteso lato dominio
### Per articolo bootstrapato
- record articolo/app
- stato di provenienza ERP
- completezza distinta da “operativo”
- nessuna esposizione diretta di `ItemCode` come PK tecnica
- legame ERP nel layer `int_*`

### Per struttura materiali bootstrapata
- record DIBA minima o staging equivalente
- header struttura
- righe componenti minime
- provenienza ERP esplicita
- assenza di assunzioni premature su versioning pieno / regole DIBA avanzate

## 10.2 Risultato atteso lato integrazione
Nel layer `int_*` servono almeno:
- external link tra articolo app e `Items.ItemCode`
- external link tra struttura minima app e `ProductTrees.TreeCode`
- sync run del bootstrap iniziale
- message log tecnico del tentativo

---

## 11. Rischi tecnici da osservare nel prototipo

1. **Rischio di bootstrap troppo “ricco”**
   - portare nel dominio troppi campi ERP raw e contaminare il core domain.

2. **Rischio di confondere ProductTree con DIBA piena Esyy Flow**
   - la BOM ERP non copre automaticamente tutta la semantica DIBA/versioning/app rules.

3. **Rischio di assumere un ciclo ERP nativo dove non c’è**
   - routing/model richiedono lettura specialistica separata o restano app-native.

4. **Rischio di accoppiare bootstrap e sync continua**
   - il prototipo deve chiarire che bootstrap iniziale e sincronizzazione successiva non sono lo stesso problema.

5. **Rischio di perdere il perimetro pre-industrializzazione**
   - l’app deve poter vivere anche con strutture provvisorie/non ancora formalizzate in ERP.

---

## 12. Criteri di successo / fallimento

## Successo
Il prototipo è riuscito se consente di congelare in modo concreto:
- quali campi articolo entrano nel bootstrap iniziale;
- quali campi BOM/ProductTree entrano nella struttura materiali minima;
- quali dati restano nel layer `int_*`;
- quali oggetti restano nativi dell’app.

## Fallimento
Il prototipo è fallito se:
- l’articolo ERP non è leggibile in modo sufficiente al bootstrap;
- la `ProductTree` non è leggibile o non è abbastanza stabile per costruire una struttura minima;
- non emerge un confine chiaro tra bootstrap, sync e native app.

## Classificazione attesa del prototipo
- **Chiuso** se articolo e ProductTree consentono di congelare chiaramente il perimetro
- **Ridotto** se articolo sì, struttura minima solo parziale ma già sufficiente a decidere il bootstrap iniziale
- **Aperto** se il confine resta ambiguo e il bootstrap non è ancora definibile

---

## 13. Ordine operativo suggerito per l’esecuzione

1. Login Service Layer
2. Read item padre o item componente scelto
3. Classificazione campi:
   - bootstrap
   - sync
   - native app
4. Read `ProductTrees('<TREE_CODE>')`
5. Classificazione campi struttura:
   - bootstrap
   - sync
   - native app
6. Chiusura decisionale del perimetro P5

---

## 14. Output atteso per OLE-12

Alla fine della prova devono essere disponibili:
- ambiente realmente usato
- prerequisiti confermati o mancanti
- request/response articolo e ProductTree
- campi classificati per bootstrap / sync / native app
- chiavi ERP emerse
- evidenze raccolte
- classificazione finale del prototipo
- decisione operativa finale

---

## 15. Sintesi finale

Il prototipo P5 è l’ultimo del blocco prioritario iniziale integrazioni e serve a congelare il **bootstrap ERP minimo** senza trasformare Esyy Flow in una mera proiezione dell’ERP.

La proposta operativa è questa:

- **bootstrap iniziale**
  - articoli ERP
  - strutture materiali minime ERP
- **sincronizzazione successiva**
  - drift e aggiornamenti ERP
- **nativo app**
  - ciclo
  - modello produttivo
  - pre-industrializzazione
  - regole di completezza e consolidamento

Questo permette di chiudere il primo blocco integrazioni con un confine tecnico pulito tra import iniziale, sync continua e valore nativo dell’app.
