# Esyy Flow — Guida operativa di progetto
## Linee comuni per Codex e per il team

**Versione:** 0.1 baseline operativa  
**Stato:** attiva come riferimento comune fino a revisione successiva  
**Destinatari:** Michael, Larisa, Marit, Nikolay, Ole, Isabell, Codex  
**Scopo:** definire una linea unica di progetto per architettura, sviluppo, handoff tra team, gestione dei deliverable e criteri minimi di qualità.

---

## 1. Finalità del documento

Questo documento serve come riferimento operativo comune per l'intero progetto **Esyy Flow**.

Va usato per:
- allineare il team sulle regole di lavoro;
- dare a Codex un contesto stabile e coerente;
- ridurre decisioni contraddittorie tra analisi funzionale, UX/UI, modello dati, integrazioni e sviluppo;
- garantire che ogni avanzamento sia piccolo, testabile e cumulativo;
- evitare scelte tecniche premature o troppo pesanti per la fase iniziale.

Questo documento **non sostituisce**:
- l'analisi funzionale consolidata;
- le specifiche dettagliate pagina per pagina;
- la documentazione UX/UI finale;
- l'analisi tecnica specialistica delle integrazioni ERP.

Le integra e ne fissa la traduzione operativa per lo sviluppo.

---

## 2. Visione sintetica del prodotto

Esyy Flow è una piattaforma web SaaS multi-tenant orientata alla produzione discreta e su commessa, con estensione MES/shopfloor, gestione nativa del conto lavoro attivo/passivo, qualità, tracciabilità e integrazione iniziale con SAP Business One, mantenendo apertura futura verso altri ERP.

Principi da considerare sempre:
- **centralità della commessa** come contenitore operativo;
- **separazione tra librerie produttive e istanze operative**;
- **ODP come oggetto reale e modificabile**;
- **conto lavoro come parte nativa del processo**;
- **shopfloor semplice, touch-first, leggibile**;
- **configurabilità per tenant**;
- **approccio app-centrico**, senza dipendenza eccessiva dall'ERP per l'operatività quotidiana.

---

## 3. Ruoli di progetto

| Ruolo | Responsabile | Ambito |
|---|---|---|
| Project Management | Michael | Organizzazione progetto, priorità, backlog, dipendenze, milestone, criteri di ingresso/uscita |
| Analisi funzionale | Larisa | Regole funzionali, chiarimenti, test funzionali, validazione comportamenti |
| UX/UI | Marit | Pattern grafici, navigazione, comportamento UI, usabilità, coerenza visuale |
| Database | Nikolay | Modellazione dati, relazioni, convenzioni DB, evoluzione schema |
| Integrazioni / Service Layer | Ole | Flussi ERP, mapping, orchestrazione, riconciliazione, strategia integrazione |
| Sviluppo | Isabell | Implementazione tecnica del prodotto tramite Codex su Visual Studio Code |

### Regola di responsabilità
Ogni decisione va presa dal responsabile corretto, ma deve restare coerente con la baseline di progetto.  
Quando una decisione di dettaglio impatta altri domini, deve essere riportata e consolidata prima di entrare stabilmente nel backlog.

---

## 4. Baseline tecnica iniziale approvata

Questa è la baseline da usare nella fase iniziale salvo diversa decisione formale.

### 4.1 Stack iniziale
- **Frontend / app principale:** Next.js + App Router + TypeScript
- **Repository:** GitHub
- **Deploy cloud iniziale:** Netlify Free
- **Database / Auth / Storage / Realtime:** Supabase Free
- **Runtime locale:** Node.js
- **Docker:** non obbligatorio nella fase iniziale

### 4.2 Motivazioni
- costo iniziale nullo o quasi nullo;
- possibilità di sviluppo cloud-first e testabile;
- riduzione del peso sulla macchina locale;
- una sola codebase per partire;
- rapidità di bootstrap;
- compatibilità con un approccio incrementale tramite Codex.

### 4.3 Cosa NON fare nella fase iniziale
- niente microservizi;
- niente frontend e backend in repository separati;
- niente Docker come prerequisito universale;
- niente integrazioni ERP reali prima della definizione di Ole;
- niente over-engineering architetturale;
- niente refactor massivi senza motivo forte.

---

## 5. Principio operativo di sviluppo

### Regola base
**Ogni sessione di sviluppo deve produrre un deliverable breve, incrementale, testabile e possibilmente validabile in cloud.**

Questo significa che non si lavora per blocchi troppo grandi, ma per piccoli incrementi verticali.

### Esempi corretti
- login funzionante con redirect base;
- elenco articoli con filtri minimi;
- dettaglio DIBA con sola tab materiali;
- elenco ODP con stato e link al dettaglio;
- dashboard shell con accesso protetto.

### Esempi da evitare
- “fare tutto il modulo ODP”;
- “costruire tutto il backend”;
- “impostare tutta la parte MES”;
- “fare il database completo prima di tutto”.

### Formula di lavoro
**scope piccolo + risultato reale + test manuale chiaro**

---

## 6. Modello backlog da usare

Il backlog va organizzato sempre su tre livelli:

### Livello A — Wave
Macro-blocchi di progetto:
1. Core SaaS e accesso
2. Anagrafiche produttive
3. Commesse e ODP
4. MES e logistica di fase
5. Conto lavoro
6. Qualità, tracciabilità, etichette
7. Integrazioni ERP

### Livello B — Feature testabili
Porzioni funzionali coerenti all'interno di ogni wave.

### Livello C — Micro-deliverable
Task da singola sessione Codex, ciascuno con output verificabile.

---

## 7. Definition of Ready

Un task entra in sviluppo solo se ha almeno:

1. obiettivo utente chiaro;
2. perimetro ristretto;
3. dipendenze note;
4. comportamento o schermata sufficientemente definita;
5. criterio di accettazione esplicito;
6. test manuale previsto.

Se uno di questi elementi manca, il task va rifinito prima dello sviluppo.

---

## 8. Definition of Done

Un deliverable è considerato chiuso solo se:

1. è implementato davvero;
2. è apribile o invocabile;
3. non rompe il flusso esistente;
4. ha un test manuale semplice e ripetibile;
5. rispetta il perimetro deciso;
6. dichiara chiaramente cosa resta fuori;
7. è coerente con la baseline architetturale e di progetto;
8. è documentato almeno nel README, changelog o task note di riferimento.

---

## 9. Regole specifiche per l'uso di Codex

Codex deve essere guidato con istruzioni chiare, complete e con scope controllato.

### 9.1 Come vanno scritti i task per Codex
Ogni task deve includere:
- titolo;
- obiettivo utente;
- scope incluso;
- scope escluso;
- prerequisiti;
- file o aree coinvolte;
- snippet o indicazioni tecniche quando utili;
- criteri di accettazione;
- test manuale;
- note implementative.

### 9.2 Regole di buon uso
- una sola responsabilità principale per task;
- evitare richieste troppo estese;
- evitare prompt vaghi;
- non mischiare grandi refactor e nuova feature nello stesso incarico;
- chiedere output completi ma limitati;
- privilegiare una feature minima chiusa rispetto a molte incomplete.

### 9.3 Regole tecniche minime
- TypeScript strict;
- naming coerente;
- nessuna chiave sensibile lato client;
- nessuna nuova dipendenza non motivata;
- preferire semplicità e leggibilità;
- evitare astrazioni premature;
- mantenere il progetto facilmente comprensibile da team umano, non solo da Codex.

---

## 10. Convenzioni architetturali iniziali

### 10.1 Monorepo applicativo
Nella fase iniziale l'app vive in una sola codebase.

### 10.2 Struttura base consigliata
```text
project-root/
├─ public/
├─ src/
│  ├─ app/
│  ├─ components/
│  ├─ features/
│  ├─ lib/
│  ├─ styles/
│  └─ types/
├─ docs/
├─ .env.example
├─ README.md
└─ package.json
```

### 10.3 Principi di organizzazione
- UI e logica business vanno tenute separate quando possibile;
- la logica sensibile resta lato server;
- i file di utilità devono essere espliciti e piccoli;
- le cartelle `docs/` e `adr/` sono raccomandate per decisioni tecniche e note condivise.

### 10.4 Documenti di supporto raccomandati
- `README.md` per setup e stato del progetto;
- `docs/PROJECT-GUIDE-CODEX-TEAM.md` per questo documento;
- `docs/adr/ADR-001-architettura-iniziale.md` per le decisioni tecniche;
- `docs/tasks/` per task formalizzati;
- `docs/changelog/` per riepiloghi sintetici degli avanzamenti.

---

## 11. Regole per il design e per l'implementazione UI

Fino alla chiusura completa del lavoro di Marit si applicano queste regole:

- usare una UI pulita, leggibile, professionale;
- evitare personalizzazioni visive arbitrarie;
- costruire layout già coerenti con una futura sistematizzazione;
- non inventare pattern forti senza una base condivisa;
- usare componenti semplici e facili da sostituire;
- non bloccare lo sviluppo per dettagli grafici minori, ma non introdurre incoerenze strutturali.

Quando arriverà la baseline UX/UI definitiva, i flussi più sensibili dovranno adeguarsi a quella.

---

## 12. Regole per il database e per l'evoluzione schema

Fino alla formalizzazione estesa di Nikolay valgono queste regole:

- introdurre solo schema minimo necessario per sbloccare il deliverable corrente;
- preferire modelli leggibili e facilmente evolvibili;
- evitare ottimizzazioni premature;
- ogni modifica strutturale rilevante va tracciata;
- le entità core vanno nominate in modo chiaro e consistente con il dominio;
- le relazioni multi-tenant vanno pensate fin dall'inizio, anche se in forma minima.

---

## 13. Regole per integrazioni e service layer

Fino alla definizione specialistica di Ole:

- non implementare integrazioni ERP reali;
- non fissare mapping definitivi;
- non progettare flussi tecnici complessi sulla base di ipotesi;
- mantenere il codice pronto a integrare fonti esterne, ma senza simulare prematuramente la soluzione finale.

Sono ammessi solo:
- placeholder tecnici;
- interfacce astratte leggere;
- documentazione dei punti futuri di integrazione.

---

## 14. Strategia di rilascio e test

### 14.1 Obiettivo
Ogni incremento deve poter essere verificato in modo rapido.

### 14.2 Livelli minimi di verifica
- esecuzione locale;
- test manuale dei casi base;
- deploy cloud quando il task lo consente;
- controllo che il nuovo incremento non rompa i flussi esistenti.

### 14.3 Validazione
- **Larisa** valida il comportamento funzionale;
- **Marit** valida coerenza UX/UI quando il task tocca pattern visivi;
- **Michael** valida coerenza con scope, backlog e milestone;
- **Isabell** garantisce implementazione e test tecnico di base.

---

## 15. Handoff tra componenti del team

### 15.1 Da funzionale a sviluppo
Ogni consegna verso Isabell deve chiarire:
- cosa fare;
- cosa non fare;
- comportamento atteso;
- edge case già noti;
- priorità.

### 15.2 Da UX/UI a sviluppo
Ogni consegna verso Isabell deve chiarire:
- layout;
- componenti previsti;
- pattern di navigazione;
- stati;
- eccezioni rilevanti.

### 15.3 Da DB a sviluppo
Ogni consegna verso Isabell deve chiarire:
- entità;
- chiavi;
- relazioni;
- vincoli;
- naming.

### 15.4 Da integrazioni a sviluppo
Ogni consegna verso Isabell deve chiarire:
- confini del flusso;
- direzione dati;
- frequenza;
- gestione errori;
- strategia di riconciliazione.

---

## 16. Cose da evitare

- task troppo grandi per una singola sessione;
- requisiti impliciti non dichiarati;
- scelta autonoma di stack diversi dalla baseline;
- dipendenze aggiunte senza necessità;
- introduzione di pattern UI non condivisi;
- schema DB troppo ambizioso troppo presto;
- integrazioni fittizie spacciate per definitive;
- codice non documentato e non testabile;
- consegne “quasi finite” senza chiusura reale.

---

## 17. Criteri di qualità minimi del codice

Ogni incremento deve puntare a:
- chiarezza;
- semplicità;
- coerenza;
- leggibilità;
- separazione ragionevole delle responsabilità;
- assenza di hardcode sensibili;
- error handling minimo ma presente;
- documentazione sufficiente per il team.

---

## 18. Documenti di riferimento del progetto

Questo documento va letto insieme a:
- analisi funzionale consolidata generale;
- specifiche funzionali dettagliate pagina per pagina;
- documentazione UX/UI quando disponibile;
- decisioni architetturali (ADR);
- task operativi delle singole wave.

---

## 19. Regola finale di progetto

In caso di dubbio, vale questa priorità:

1. coerenza con il modello di prodotto;
2. chiarezza funzionale;
3. semplicità implementativa;
4. deliverable piccolo ma reale;
5. testabilità immediata;
6. costo iniziale minimo;
7. estendibilità futura senza complicare inutilmente il presente.

---

## 20. Stato del documento

Questo documento è una baseline viva.  
Va aggiornato quando cambiano:
- architettura iniziale;
- regole di sviluppo;
- convenzioni di team;
- criteri di handoff;
- modello operativo di Codex.

Finché non viene sostituito da una revisione successiva, deve essere considerato il riferimento operativo comune del progetto.