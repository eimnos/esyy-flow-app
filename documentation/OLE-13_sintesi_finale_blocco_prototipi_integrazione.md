# OLE-13 — Sintesi finale del blocco prototipi integrazione e raccomandazioni di avvio sviluppo

## Stato deliverable
**Pronto per revisione**

## Obiettivo
Chiudere formalmente la fase iniziale di prototipazione integrazione SAP Business One / Esyy Flow e trasformarla in una **base operativa per l’avvio dello sviluppo reale**.

Questo artefatto consolida gli esiti dei prototipi:
- **P1 — ODP bidirezionali**
- **P4 — chiavi di riconciliazione e schema `int_*`**
- **P2 — movimenti di magazzino legati alla produzione**
- **P3 — conto lavoro passivo / documenti logistici minimi**
- **P5 — bootstrap articoli / strutture minime ERP**

---

## 1. Sintesi esecutiva

Il blocco iniziale dei prototipi integrazione può considerarsi **chiuso con esito positivo**.

La baseline che emerge è coerente con l’impostazione di progetto:
- **Esyy Flow resta app-centrico**
- **SAP Business One è integrato ma non dominante**
- **Service Layer è la baseline primaria**
- **DI API resta fallback mirato**
- **chiavi e riferimenti ERP restano nel layer `int_*`**
- **il core domain non deve assorbire campi ERP raw non necessari**

Dal punto di vista operativo, il workstream integrazioni può aprire lo sviluppo reale su un primo perimetro controllato, distinguendo però con chiarezza:
- ciò che è **apribile subito**
- ciò che è **apribile con vincoli**
- ciò che deve restare **fuori dal primo avvio**

---

## 2. Cosa è stato validato

## 2.1 P1 — ODP bidirezionali
**Esito:** chiuso  
**Decisione:** aprire con vincoli

### Validato
- login Service Layer
- metadata coerente
- dataset minimo confermato
- create ODP riuscita
- read ODP riuscita
- update ODP riuscito
- verifica UI SAP coerente
- logout riuscito

### Conclusione
Gli **ODP standard** via Service Layer sono tecnicamente percorribili nel perimetro minimo validato.

### Chiavi validate
- `AbsoluteEntry` come chiave ERP tecnica primaria
- `DocumentNumber` come riferimento leggibile
- `Series` come metadato di supporto

---

## 2.2 P4 — chiavi di riconciliazione e schema `int_*`
**Esito:** chiuso  
**Decisione:** baseline strutturale da congelare

### Validato
- distinzione chiavi applicative vs chiavi ERP
- ruolo di:
  - `int_external_links`
  - `int_sync_runs`
  - `int_message_logs`
- conferma che le chiavi ERP raw non devono entrare nel core domain

### Conclusione
Il primo nucleo corretto del layer `int_*` è stato definito e può essere considerato base strutturale per sviluppo DB/integrazione.

---

## 2.3 P2 — movimenti di magazzino legati alla produzione
**Esito:** ridotto  
**Decisione:** aprire con vincoli

### Validato
- **Receipt from Production** riuscito
- consumo implicito coerente con il comportamento dell’ODP in backflush
- chiavi ERP del movimento emerse correttamente
- aggiornamento ODP coerente con il receipt

### Non universalmente validato
- **Issue for Production** non assumibile come universale nel perimetro iniziale
- nel caso testato il blocco è risultato coerente con righe ODP in `im_Backflush`

### Conclusione
Il primo slice dei movimenti produzione è apribile **solo sul receipt**, mantenendo distinto:
- issue manuale
- consumo implicito via receipt con backflush

---

## 2.4 P3 — conto lavoro passivo / documenti logistici minimi
**Esito:** chiuso  
**Decisione:** aprire sviluppo controllato

### Validato
- invio outbound verso warehouse terzista
- rientro inbound dal warehouse terzista
- uso diretto di `StockTransfers`
- aggiornamento corretto delle giacenze
- riallineamento finale completo dello stock
- gestione coerente anche in presenza di bin locations automatiche sul warehouse interno

### Non reso obbligatorio
- `InventoryTransferRequests`

### Conclusione
Il **nucleo logistico minimo del conto lavoro passivo** è tecnicamente percorribile via Service Layer con:
- `StockTransfers` outbound
- `StockTransfers` inbound

---

## 2.5 P5 — bootstrap articoli / strutture minime ERP
**Esito:** chiuso  
**Decisione:** aprire sviluppo controllato

### Validato
- lettura articolo ERP (`Items`)
- lettura struttura materiali minima ERP (`ProductTrees`)
- identificazione pulita del confine tra:
  - dati bootstrapati
  - dati sincronizzati
  - dati nativi dell’app

### Conclusione
Il bootstrap iniziale può partire in modo pulito da:
- **articoli ERP**
- **strutture materiali minime ERP**

Restano invece nativi dell’app:
- distinta ciclo ricca
- modello produttivo
- pre-industrializzazione
- stato di completezza
- regole di consolidamento
- metadati tenant/app/UI

---

## 3. Cosa è apribile subito

Sono aree che possono entrare nel primo avvio sviluppo senza necessità di nuovi prototipi preliminari.

## 3.1 Layer `int_*` minimo
Apribile subito:
- `int_external_links`
- `int_sync_runs`
- `int_message_logs`

### Scopo
- riconciliazione chiavi ERP/app
- tracciamento run
- logging tecnico
- separazione netta dal core domain

---

## 3.2 ODP standard via Service Layer
Apribile subito nel perimetro già validato:
- create
- read
- update controllato
- riconciliazione su `AbsoluteEntry`

### Vincolo da rispettare
Non aprire ancora automaticamente:
- MTO reale
- sales order linkage
- issue/receipt completo non filtrato
- estensioni documentali non validate

---

## 3.3 Receipt from Production
Apribile subito:
- registrazione receipt minimo
- riconciliazione documento ERP
- collegamento a ODP nel layer integrazione

### Vincolo
Va trattato come slice separato dall’issue manuale.

---

## 3.4 Conto lavoro passivo logistico minimo
Apribile subito:
- invio outbound verso warehouse terzista
- rientro inbound dal warehouse terzista
- uso diretto di `StockTransfers`

### Vincolo
Per ora solo nucleo logistico minimo, non modello pieno di fase esterna.

---

## 3.5 Bootstrap iniziale ERP
Apribile subito:
- bootstrap articoli ERP
- bootstrap strutture materiali minime ERP

### Vincolo
Non confondere `ProductTree` con la DIBA piena/versionata Esyy Flow.

---

## 4. Cosa è apribile con vincoli

## 4.1 ODP bidirezionali
Apribili con vincoli:
- solo standard ODP minimi già validati
- chiave primaria ERP = `AbsoluteEntry`

### Vincoli
- no MTO reale iniziale
- no legame sales order automatico non ancora prototipato
- no estensioni avanzate di update senza proof aggiuntiva

---

## 4.2 Movimenti produzione
Apribili con vincoli:
- **receipt** sì
- **issue** solo in presenza di regole chiarite per `ProductionOrderIssueType`

### Vincoli
- distinguere esplicitamente:
  - issue manuale
  - consumo implicito via backflush

---

## 4.3 Conto lavoro passivo
Apribile con vincoli:
- solo lato logistico minimo
- solo invio/rientro su magazzini

### Vincoli
Fuori dal primo slice:
- costi
- avanzamento fase esterna
- materiali di riserva
- NC
- fatturazione
- semantica completa di processo conto lavoro

---

## 4.4 Bootstrap ERP
Apribile con vincoli:
- solo articoli e strutture materiali minime

### Vincoli
Fuori:
- ciclo
- modello produttivo
- pre-industrializzazione
- completezza/configurazione tenant-specifica

---

## 5. Cosa resta fuori per ora

Questi temi non dovrebbero entrare nel primo avvio sviluppo integrazione.

## 5.1 Fuori dal blocco iniziale ODP
- MTO reale completo
- sales order linkage
- mapping esteso ODP multi-origine
- orchestrazione completa end-to-end ODP

## 5.2 Fuori dal blocco iniziale movimenti produzione
- issue universale senza distinzione per `IssueType`
- copertura completa di tutte le casistiche serial/batch
- automazioni avanzate multi-step di consumo

## 5.3 Fuori dal blocco iniziale conto lavoro
- fase esterna ricca
- costificazione
- materiali di riserva
- non conformità
- fatturazione passiva/attiva
- semantica completa di subcontracting oltre il trasferimento logistico

## 5.4 Fuori dal blocco iniziale bootstrap ERP
- distinta ciclo ricca
- modello produttivo
- pre-industrializzazione
- consolidamento progressivo app/ERP
- import massivo avanzato e conflict resolution completo

---

## 6. Implicazioni operative per Isabell

Isabell può aprire lo sviluppo integrazione, ma in modo fortemente sequenziale e con confini puliti.

## 6.1 Slice che può aprire
1. **infrastruttura base integrazione**
   - client Service Layer
   - session management
   - error handling minimo
   - logging tecnico
2. **ODP standard minimi**
   - create/read/update
3. **receipt from production**
4. **stock transfer outbound/inbound per conto lavoro minimo**
5. **bootstrap article + product tree**

## 6.2 Vincoli per Isabell
- non usare le chiavi ERP come chiavi di dominio
- non accoppiare bootstrap e sync continua nello stesso flow iniziale
- non modellare ProductTree come DIBA completa
- non aprire issue produzione come comportamento universale
- non anticipare fase esterna ricca o conto lavoro completo

## 6.3 Raccomandazione pratica
Ogni slice deve uscire:
- piccolo
- verificabile
- riconciliabile nel layer `int_*`
- senza contaminare il core domain

---

## 7. Implicazioni strutturali per Nikolay

Nikolay deve trasformare gli esiti di prototipazione in base DB concreta e conservativa.

## 7.1 Priorità DB
### Già da consolidare
- `int_external_links`
- `int_sync_runs`
- `int_message_logs`

### Da preparare coerentemente
- supporto al bootstrap article
- supporto alla struttura materiali minima bootstrapata
- stato/origine record bootstrapati
- tracking di drift / sync successiva

## 7.2 Vincoli DB
- tenant scope rigoroso
- unique key coerenti con riconciliazione ERP
- nessuna invasione di campi ERP raw nelle tabelle core
- separazione netta tra:
  - dominio operativo
  - configurazione
  - integrazione
  - staging/bootstrap tecnico

## 7.3 Raccomandazione pratica
Conviene introdurre un livello chiaro tra:
- **record di dominio**
- **provenienza ERP**
- **link tecnico ERP**
- **stato di bootstrap/sync**

in modo da non rendere fragile il dominio applicativo quando cambiano le regole di integrazione.

---

## 8. Ordine consigliato di avvio sviluppo integrazione

## Fase 1 — Fondazione integrazione
1. client Service Layer
2. gestione sessione
3. gestione errori minima
4. logging tecnico
5. schema DB `int_*` minimo

## Fase 2 — ODP standard
6. create/read/update ODP standard
7. riconciliazione chiavi ODP
8. primo flusso controllato applicazione → ERP → layer `int_*`

## Fase 3 — Movimenti produzione
9. receipt from production
10. aggancio documento movimento a ODP / run integrazione
11. lasciare issue manuale fuori dal primo rilascio generalizzato

## Fase 4 — Conto lavoro logistico minimo
12. stock transfer outbound verso warehouse terzista
13. stock transfer inbound da warehouse terzista
14. collegamento ai record applicativi di invio/rientro senza estendere ancora la semantica completa

## Fase 5 — Bootstrap ERP iniziale
15. bootstrap articoli ERP
16. bootstrap strutture materiali minime ERP
17. registrazione provenienza, snapshot e link tecnici
18. lasciare ciclo/modello/pre-industrializzazione nel dominio nativo app

---

## 9. Raccomandazioni finali di avvio sviluppo

## 9.1 Principio guida
Lo sviluppo deve partire da ciò che è già stato validato in ambiente, non da ciò che è solo plausibile teoricamente.

## 9.2 Regole di avvio
- aprire solo slice già prototipati o confinati
- mantenere il dominio applicativo indipendente
- spostare le dipendenze ERP nel layer `int_*`
- distinguere bootstrap iniziale da sync continua
- distinguere logistica minima da semantica processo completa

## 9.3 Rischio principale da evitare
Il rischio più pericoloso in questa fase è **accoppiare troppo presto il dominio Esyy Flow alla forma dei documenti ERP**, perdendo:
- evolvibilità del prodotto
- chiarezza del perimetro SaaS
- separazione tra dato operativo e dato tecnico di integrazione

---

## 10. Decisione strutturale finale del blocco prototipi

Il blocco iniziale dei prototipi consente di congelare questa baseline:

### Apribile subito
- `int_*` minimo
- ODP standard
- receipt from production
- stock transfers logistici minimi conto lavoro
- bootstrap articoli
- bootstrap strutture materiali minime

### Apribile con vincoli
- ODP oltre il caso standard
- issue produzione
- semantica conto lavoro oltre il minimo logistico
- sync ERP oltre il bootstrap iniziale

### Fuori per ora
- MTO reale completo
- ciclo ricco
- modello produttivo
- pre-industrializzazione
- conto lavoro completo
- costi / NC / fatturazione
- orchestrazioni estese non ancora prototipate

---

## 11. Sintesi finale

La fase di prototipazione iniziale integrazione può considerarsi **formalmente chiusa**.

Gli esiti ottenuti sono sufficienti per avviare lo sviluppo reale con una base concreta, perché chiariscono:
- cosa è stato validato davvero in ambiente
- quali slice possono partire subito
- quali richiedono vincoli espliciti
- quali ambiti vanno rinviati
- come preservare il confine tra ERP e dominio SaaS

La raccomandazione finale è quindi:
**avviare lo sviluppo integrazione in modo incrementale, partendo dai casi già validati e lasciando fuori dal primo ciclo tutto ciò che estenderebbe prematuramente la dipendenza dall’ERP.**

---

## Esito sintetico per PM

- blocco iniziale prototipi integrazione: **chiuso**
- baseline tecnica consolidata: **sì**
- avvio sviluppo reale: **raccomandato**
- modalità raccomandata: **incrementale, controllata, app-centrica**
