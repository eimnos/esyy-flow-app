# AF-CF-02 — Sintesi finale V1 campi personalizzati e raccomandazioni di avvio sviluppo

## Stato deliverable
**Pronto per revisione**

## Obiettivo
Chiudere formalmente la fase di analisi specialistica sui **campi personalizzati / attributi dinamici tenant-scoped** e trasformarla in una base operativa per l’avvio di una **V1 ridotta, incrementale e sostenibile**.

Il documento consolida quanto emerso nella baseline specialistica ERP / integrazione e lo traduce in:
1. perimetro V1 effettivo;
2. vincoli operativi;
3. limiti espliciti di esclusione;
4. perimetro iniziale di oggetti, tipi campo, consumi e supporto ERP;
5. ordine consigliato degli slice di sviluppo per Isabell.

---

## 1. Sintesi esecutiva

La V1 dei campi personalizzati deve essere costruita con un principio non negoziabile:

- **motore attributi dinamici = app-native**
- **metadata campo = app-native**
- **valore applicativo = app-native**
- **binding ERP e sincronizzazione tecnica = layer `int_*`**
- **ERP = fonte/destinazione selettiva di alcuni valori, non backend del motore attributi**

Questa impostazione consente di:
- mantenere Esyy Flow app-centrico;
- evitare dipendenze troppo forti dal metadata variabile dell’ERP;
- aprire una V1 utile ma sostenibile;
- differire a una fase successiva tutto ciò che renderebbe fragile il perimetro iniziale.

---

## 2. Cosa entra subito in V1

## 2.1 Motore attributi nativo app
Entra subito in V1:
- definizione campo tenant-scoped
- gruppi / sezioni / categorie logiche
- visibilità base
- obbligatorietà base
- tipo logico campo
- ordinamento
- contesto d’uso del campo
- enablement per tenant / modulo / oggetto

### Ownership
**App**

---

## 2.2 Valori applicativi nativi app
Entra subito in V1:
- salvataggio del valore attributo nel dominio applicativo
- lettura del valore in UI/app
- audit minimo di creazione/modifica
- supporto a query e uso applicativo nel dominio nativo

### Ownership
**App**

---

## 2.3 Binding ERP esplicito nel layer `int_*`
Entra subito in V1:
- definizione di binding tecnico tra campo app e target ERP
- binding tenant-scoped
- binding disattivabile/attivabile
- direzione del flusso
- tracciamento run e log tecnici

### Ownership
**Layer `int_*`**

---

## 2.4 Lettura ERP di campi standard / UDF già esistenti
Entra subito in V1:
- lettura da ERP di campi standard
- lettura da ERP di UDF già esistenti
- solo su oggetti ERP supportati
- con mapping esplicito e governato

### Modalità ammesse
- bootstrap iniziale
- sync manuale
- sync schedulata semplice
- eventuale refresh on-demand

---

## 2.5 Scrittura verso ERP su target già predisposti
Entra subito in V1, ma in forma controllata:
- scrittura verso campo standard ERP già noto
- scrittura verso UDF ERP già esistente
- solo su target in allowlist
- solo per tipi dato semplici

---

## 3. Cosa entra con vincoli

## 3.1 Scrittura verso ERP
La scrittura entra in V1 solo con questi vincoli:
- target ERP predefinito
- campo ERP già esistente
- mapping 1:1
- tipo dato semplice
- validazione coerente
- flusso esplicitamente abilitato
- log tecnico obbligatorio

### Conseguenza
Nessuna scrittura “libera” o generica verso ERP.

---

## 3.2 Bidirezionalità
La bidirezionalità entra solo come **eccezione approvata** e solo se tutti i vincoli seguenti sono soddisfatti:
- campo scalare
- semantica semplice
- ownership chiara del dato
- assenza di logiche concorrenti critiche
- criticità bassa o media
- conflitto gestibile
- target ERP già predisposto

### Regola operativa
La bidirezionalità **non** è una capability standard della V1.  
È una capability selettiva su casi approvati.

---

## 3.3 Supporto ERP custom
Il supporto a UDF esistenti entra con vincoli:
- solo UDF già presenti
- niente creazione automatica runtime
- niente presunzione che i metadata ERP siano uniformi tra tenant/company
- niente discovery automatica trasformata in governance semantica di prodotto

---

## 4. Cosa resta fuori V1

## 4.1 Metadata ERP dinamico runtime
Fuori V1:
- creazione automatica UDF
- creazione automatica UDT
- creazione automatica UDO
- alterazione runtime del modello ERP a partire da nuovi campi app

---

## 4.2 Mapping libero / generalizzato
Fuori V1:
- mapping runtime arbitrario su qualunque oggetto ERP
- mapping multi-hop o molti-a-uno arbitrario
- binding ad-hoc non governato
- configurazioni “power user” senza allowlist e validazione forte

---

## 4.3 Bidirezionalità estesa
Fuori V1:
- bidirezionalità ampia su oggetti critici
- bidirezionalità su campi che impattano workflow o semantica operativa complessa
- bidirezionalità su strutture multiriga, collezioni, allegati o dati complessi

---

## 4.4 ERP come backend del motore attributi
Fuori V1:
- uso di SAP B1 come repository primario del catalogo campi dinamici
- derivazione da ERP di metadata funzionale, UX e regole tenant-native
- dipendenza del motore attributi app dal metadata variabile di ogni company DB

---

## 5. Primo perimetro oggetti supportati

Il primo perimetro deve essere ristretto a oggetti già coerenti con il lavoro di integrazione svolto e con il modello applicativo.

## 5.1 Oggetti app supportati in V1
Consigliati:
- **articoli prodotto**
- **anagrafiche collegate al bootstrap ERP**
- in seconda battuta, se serve e solo con governance chiara:
  - **ODP standard**
  - **documenti/app object già prototipati**

### Non consigliati in V1 iniziale
- commesse con logiche complesse
- fasi ODP ricche
- eventi qualità
- oggetti di conto lavoro completo
- oggetti di pre-industrializzazione

---

## 5.2 Oggetti ERP supportati in V1
Consigliati:
- `Items`
- eventuali oggetti ERP già stabilizzati nel workstream integrazione e solo per use case selettivi
- documenti già prototipati, ma solo se il campo ha reale utilità e semantica semplice

### Non consigliati in V1 iniziale
- UDO come base generale del sistema
- UDT/UDO custom come fallback universale
- oggetti ERP non ancora validati nel perimetro integrazione

---

## 6. Primo perimetro tipi campo

## 6.1 Tipi campo da supportare subito
Consigliati:
- **text short**
- **text medium** (con limiti chiari)
- **integer**
- **decimal**
- **boolean**
- **date**
- **single select enum**

Questi tipi sono sufficienti per una V1 utile e hanno mapping ERP relativamente gestibile.

---

## 6.2 Tipi campo da supportare con cautela
Possibili ma solo se strettamente necessari:
- **long text** con limiti
- **code/reference** semplice
- **read-only derived display** se chiaramente separato dal valore persistito

---

## 6.3 Tipi campo fuori V1
Fuori V1:
- multiselect
- tabelle / griglie
- collezioni
- JSON arbitrario
- allegati
- rich text complesso
- lookup complessi multi-oggetto
- formule con dipendenze ERP
- campi strutturati multiriga

---

## 7. Primo perimetro consumi supportati

Per “consumi” si intendono i modi in cui il sistema userà questi campi.

## 7.1 Consumi supportati subito
- visualizzazione in scheda/dettaglio
- editing manuale app-native
- persistenza applicativa
- bootstrap valore da ERP
- sync manuale semplice
- export/read verso ERP su target già predisposti
- filtri base
- eventuale uso in tabella/lista se il tipo lo consente

---

## 7.2 Consumi supportati con vincoli
- scrittura ERP one-way
- refresh schedulato
- conflitto minimo con log tecnico
- bidirezionale solo su sottoinsieme approvato

---

## 7.3 Consumi fuori V1
- workflow complessi guidati da attributi ERP-synced
- motore regole avanzato basato su attributi dinamici
- dipendenze multiple tra campi sincronizzati
- orchestrazioni evento-driven estese
- formule o automazioni cross-oggetto ad alta criticità
- propagazione massiva complessa tra ERP e app

---

## 8. Primo perimetro ERP supportato

## 8.1 Modalità supportate in V1
- **read** da ERP di campi standard/UDF esistenti
- **write** verso ERP di target già predisposti
- **bind** tecnico tenant-scoped nel layer `int_*`
- **sync manuale** o controllata
- **run/log** obbligatori

---

## 8.2 Modalità supportate con vincoli
- bidirezionale selettivo
- refresh schedulato su perimetro ristretto
- uso di ETag / concurrency control dove rilevante e disponibile

---

## 8.3 Modalità fuori V1
- metadata ERP runtime
- discovery automatica con governo semantico
- write generalizzato su oggetti non governati
- eventing generalizzato come base standard
- UDO/UDT custom come piattaforma primaria degli attributi tenant-scoped

---

## 9. Implicazioni strutturali

## 9.1 App layer
L’app deve possedere:
- definizione campo
- logica semantica
- valore applicativo
- contesto d’uso
- UX / permessi / visibilità

---

## 9.2 Integration layer `int_*`
Il layer `int_*` deve possedere:
- binding campo app ↔ target ERP
- direzione
- stato binding
- run di sync
- log/errori
- conflitti
- drift tecnico

### Strutture minime consigliate
- `int_field_bindings`
- `int_sync_runs`
- `int_message_logs`
- uso di `int_external_links` dove serve per il legame oggetto app ↔ oggetto ERP

---

## 9.3 Core domain
Il core domain **non** deve contenere:
- nomi campi ERP raw
- logiche di trasporto ERP
- riferimenti tecnici diretti a UDF/UDT/UDO non necessari
- semantica di sincronizzazione

---

## 10. Ordine consigliato degli slice di sviluppo per Isabell

## Slice 1 — Fondazione app-native
Implementare:
- definizione campi tenant-scoped
- tipi campo V1
- gruppi / contesti / visibilità base
- persistenza valori app-native
- audit minimo

### Obiettivo
Rendere il motore attributi utile anche senza ERP.

---

## Slice 2 — Fondazione integrazione tecnica
Implementare:
- `int_field_bindings`
- gestione binding tenant-scoped
- run/log tecnici
- stato binding
- enable/disable binding

### Obiettivo
Separare subito metadata/valore da integrazione tecnica.

---

## Slice 3 — Read ERP
Implementare:
- lettura ERP di campi standard/UDF esistenti
- bootstrap valore
- refresh manuale
- mapping 1:1 su allowlist oggetti/campi

### Obiettivo
Aprire la prima integrazione utile e stabile.

---

## Slice 4 — Write ERP one-way
Implementare:
- write verso ERP su target già predisposti
- validazione minima
- logging/error handling
- governance forte dei target

### Obiettivo
Aprire il primo scenario di scrittura senza introdurre bidirezionalità ampia.

---

## Slice 5 — Bidirezionale selettivo
Implementare solo se davvero necessario:
- pochissimi casi approvati
- ownership chiara
- tipo semplice
- conflitto gestibile
- fallback tecnico/manuale

### Obiettivo
Trattare la bidirezionalità come eccezione governata.

---

## 11. Raccomandazioni finali

## 11.1 Regola di perimetro
Ogni nuova estensione deve rispondere prima a questa domanda:
**il campo è davvero nativo dell’app con un binding ERP opzionale, oppure stiamo cercando di trasformare l’ERP nel backend del motore attributi?**

Se la risposta tende alla seconda ipotesi, il caso va rinviato.

---

## 11.2 Regola di sostenibilità
La V1 deve essere utile anche se:
- alcuni tenant non hanno UDF
- i metadata ERP differiscono
- il binding non è attivo
- il write path non è abilitato

Questo conferma che il valore del prodotto deve restare nell’app.

---

## 11.3 Regola di governo
Nessuna capacità “dinamica” deve essere introdotta senza:
- allowlist target
- validazione tipo
- direzione chiara
- log tecnico
- ownership del dato esplicita

---

## 12. Decisione operativa finale

La V1 dei campi personalizzati deve essere avviata così:

### Entra subito
- motore attributi app-native
- metadata campo in app
- valori applicativi in app
- binding ERP in `int_*`
- lettura ERP di campi standard/UDF esistenti
- scrittura one-way controllata su target predisposti

### Entra con vincoli
- bidirezionale selettivo
- sync schedulata
- uso di target ERP più ampi solo con governance forte

### Resta fuori V1
- metadata ERP runtime
- mapping libero/generalizzato
- bidirezionalità estesa
- ERP come backend del motore attributi tenant-scoped
- strutture dati complesse o multiriga

---

## 13. Sintesi finale

La fase di analisi specialistica sui campi personalizzati può considerarsi **formalmente chiusa**.

La base operativa emersa è chiara:
- la V1 è sostenibile solo se il sistema resta app-centrico;
- ERP e Service Layer entrano come integrazione selettiva, non come fondazione del motore;
- la roadmap di sviluppo deve partire da un nucleo piccolo, governato e verificabile.

La raccomandazione finale è quindi:
**avviare una V1 ridotta, incrementale e sostenibile, con metadata e valori nativi app, binding ERP nel layer `int_*` e supporto ERP limitato ai casi realmente governabili.**
