# Esyy Flow App

Bootstrap tecnico iniziale (`MD-01`) e auth base (`MD-02`) per Esyy Flow.

Stack base:
- Next.js (App Router) + TypeScript strict
- Supabase (configurazione via variabili ambiente)
- Deploy target: Netlify

## Riferimenti ufficiali

- Repository GitHub: `https://github.com/eimnos/esyy-flow-app.git`
- Branch principale: `main`
- Netlify dev: `https://esyy-flow-dev.netlify.app/`
- Last deploy trigger: `2026-04-16` (manual refresh commit)

## Prerequisiti

- Node.js 22+
- npm 11+

## Setup locale

1. Copia variabili ambiente:

```bash
cp .env.example .env.local
```

2. Imposta valori reali Supabase in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (solo server-side, non esporre mai al client)
- alias supportati per compatibilità:
  - URL: `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PROJECT_URL`, `SUPABASE_PROJECT_URL`
  - Key: `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PUBLISHABLE_KEY`

3. Installa dipendenze:

```bash
npm install
```

4. Avvia in sviluppo:

```bash
npm run dev
```

5. Verifica health check:

- `http://localhost:3000/api/health`

## Script disponibili

- `npm run dev`: avvio locale
- `npm run lint`: linting
- `npm run build`: build produzione
- `npm run start`: avvio build prod

## Endpoint tecnico

### `GET /api/health`

Risposta 200 JSON con:
- stato servizio
- timestamp
- stato configurazione env Supabase (`configured` / `missing`)

## Flusso auth MD-02

- `/login` pubblico
- `/dashboard` protetta
- utente anonimo su `/dashboard` -> redirect a `/login`
- utente autenticato su `/login` -> redirect a `/dashboard`
- login via Supabase Auth (email/password)
- logout via Supabase Auth

## Flusso tenant bootstrap MD-03

- `/select-tenant` per scelta tenant dopo autenticazione
- utente con una sola membership: auto-selezione tenant e redirect a `/dashboard`
- utente con più membership: scelta esplicita tenant e salvataggio in cookie `esyy_tenant_id`
- utente senza membership valida: blocco su `/select-tenant` con messaggio
- middleware aggiornata: un utente autenticato senza tenant selezionato non entra in `/dashboard`

## Shell dashboard MD-04

- area protetta in route group `src/app/(app)`
- layout condiviso con header + sidebar
- logout disponibile nell&apos;header
- pagine protette in shell: `/dashboard`, `/anagrafiche`, `/odp`, `/mes`, `/conto-lavoro`

## Anagrafiche articoli MD-05

- nuova pagina dominio read-only: `/anagrafiche/articoli-prodotto`
- query tenant-scoped via server-side Supabase admin client
- tabella filtrabile (ricerca, stato, copertura ERP/DIBA/ciclo/modello)
- dettaglio read-only articolo: `/anagrafiche/articoli-prodotto/[productId]`
- azioni rapide placeholder navigabili:
  - `/anagrafiche/articoli-prodotto/[productId]/diba`
  - `/anagrafiche/articoli-prodotto/[productId]/ciclo`
  - `/anagrafiche/articoli-prodotto/[productId]/modello`
- fallback schema-aware: adapter con candidati tabella (`products`, `product_items`, `items`)

## Elenco DIBA MD-06

- nuova pagina dominio read-only: `/anagrafiche/elenco-diba`
- lista tenant-scoped DIBA con stato e versione visibili
- filtri base: ricerca, stato, presenza versione, collegamento articolo, collegamento modello, evidenza alternative
- collegamento rapido:
  - dettaglio DIBA: `/anagrafiche/elenco-diba/[dibaId]`
- placeholder modello produttivo: `/anagrafiche/elenco-diba/[dibaId]/modello`
  - link rapido ad articolo prodotto quando disponibile
- query schema-aware candidate per famiglie DIBA/versioni in linea DB-00

## Dettaglio DIBA MD-07

- pagina dettaglio DIBA potenziata: `/anagrafiche/elenco-diba/[dibaId]`
- sezioni principali con tab read-only: Materiali, Testata, Versione e stato
- griglia materiali centrale con:
  - quantita, base, UM, opzionale, alternativa, note
  - dettaglio riga navigabile (query param `line`)
- dettaglio riga read-only con supporto (dove disponibile) per:
  - base di calcolo e moltiplicatore
  - conversioni UM e arrotondamenti
  - multipli di prelievo e minimo prelevabile
  - distinzione consumo teorico vs prelievo reale
- query reale su baseline canonica DB-00:
  - `bom_templates`
  - `bom_template_versions`
  - `bom_template_version_lines`

## Elenco distinte ciclo MD-08

- nuova pagina dominio read-only: `/anagrafiche/elenco-distinte-ciclo`
- lista tenant-scoped cicli con stato e versione visibili
- filtri base: ricerca, stato, versione, tipo processo, presenza qualita, collegamento modello
- colonne principali: numero fasi, tipo processo (interno/misto/esterno), presenza qualita
- accesso rapido al modello produttivo:
  - `/anagrafiche/elenco-distinte-ciclo/[cycleId]/modello`
- query schema-aware candidate per famiglie ciclo/versioni/fasi in linea DB-00

## Dettaglio distinta ciclo MD-09

- pagina dettaglio ciclo: `/anagrafiche/elenco-distinte-ciclo/[cycleId]`
- tab/sezioni principali: Fasi, Testata, Versione e stato
- griglia fasi centrale con supporto read-only per:
  - reparto/centro/terzista
  - tipo fase interna/esterna
  - qualita
  - tempi standard
  - setup
  - risorse parallele
- dettaglio fase (drawer via query param `phase`) con:
  - modalita tempo fisso/proporzionale/batch
  - capacita e simulazione tempo risultante dove disponibile
  - regole operative
  - evidenza fase esterna e controlli qualita
- query reale su baseline canonica ciclo:
  - `routing_templates`
  - `routing_template_versions`
  - `routing_template_version_steps`

## Struttura iniziale rilevante

```text
src/
  app/
    (app)/layout.tsx
    (app)/dashboard/page.tsx
    (app)/anagrafiche/page.tsx
    (app)/anagrafiche/articoli-prodotto/page.tsx
    (app)/anagrafiche/articoli-prodotto/[productId]/page.tsx
    (app)/anagrafiche/articoli-prodotto/[productId]/diba/page.tsx
    (app)/anagrafiche/articoli-prodotto/[productId]/ciclo/page.tsx
    (app)/anagrafiche/articoli-prodotto/[productId]/modello/page.tsx
    (app)/anagrafiche/elenco-diba/page.tsx
    (app)/anagrafiche/elenco-diba/[dibaId]/page.tsx
    (app)/anagrafiche/elenco-diba/[dibaId]/modello/page.tsx
    (app)/anagrafiche/elenco-distinte-ciclo/page.tsx
    (app)/anagrafiche/elenco-distinte-ciclo/[cycleId]/page.tsx
    (app)/anagrafiche/elenco-distinte-ciclo/[cycleId]/modello/page.tsx
    (app)/odp/page.tsx
    (app)/odp/[odpId]/page.tsx
    (app)/mes/page.tsx
    (app)/conto-lavoro/page.tsx
    api/health/route.ts
    api/auth/logout/route.ts
    (auth)/login/page.tsx
    (auth)/select-tenant/page.tsx
    api/tenant/auto-select/route.ts
    api/tenant/select/route.ts
  lib/
    env.ts
    supabase/client.ts
    supabase/admin.ts
    supabase/server.ts
    supabase/middleware.ts
    tenant/constants.ts
    tenant/memberships.ts
    domain/products.ts
    domain/diba.ts
    domain/diba-detail.ts
    domain/cycles.ts
    domain/cycle-detail.ts
    domain/odp.ts
middleware.ts
```

## Setup cloud (GitHub + Netlify)

1. Clona la repository ufficiale:

```bash
git clone https://github.com/eimnos/esyy-flow-app.git
cd esyy-flow-app
```

2. Collega Netlify al repository e imposta deploy del branch `main`.
3. Configura su Netlify le env:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - oppure alias compatibili:
     - URL: `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PROJECT_URL`, `SUPABASE_PROJECT_URL`
     - Key: `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (secret server-side)
4. Verifica deploy branch `main` e endpoint cloud:
   - `https://esyy-flow-dev.netlify.app/`
   - `https://esyy-flow-dev.netlify.app/api/health`

## Variabili ambiente richieste

| Variabile | Scope | Obbligatoria | Note |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | client+server | sì | URL progetto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client+server | sì | chiave anon pubblica |
| `SUPABASE_URL` | server (alias) | alternativa | alias compatibile per URL Supabase |
| `NEXT_PUBLIC_SUPABASE_PROJECT_URL` | client+server (alias) | alternativa | alias URL usato in alcuni setup |
| `SUPABASE_PROJECT_URL` | server (alias) | alternativa | alias URL usato in alcuni setup |
| `SUPABASE_ANON_KEY` | server (alias) | alternativa | alias compatibile per anon key |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | client+server (alias) | alternativa | alias publishable key |
| `SUPABASE_PUBLISHABLE_KEY` | server (alias) | alternativa | alias publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | solo server | sì | required da MD-03 per query membership tenant; secret, mai nel client |

## Bootstrap minimo (locale + cloud)

1. `git clone https://github.com/eimnos/esyy-flow-app.git`
2. `cp .env.example .env.local`
3. valorizza `.env.local`
4. `npm install`
5. `npm run dev`
6. verifica `http://localhost:3000/api/health`
7. push su `main`
8. verifica deploy su `https://esyy-flow-dev.netlify.app/`

## Verifica minima auth

1. apri `/login`
2. esegui login con utente Supabase valido
3. verifica accesso a `/dashboard`
4. esegui logout da `/dashboard`
5. verifica redirect anonimo su `/dashboard` verso `/login`

## Scope completato in MD-01

- bootstrap app Next.js
- base Supabase via env
- endpoint `/api/health`
- README operativo locale/cloud

## Fuori scope MD-01

- auth/login
- gestione tenant e membership
- dashboard applicativa
- pagine dominio (anagrafiche, ODP, MES, ecc.)

## Scope MD-02

- login/logout base con Supabase
- route protection base su `/dashboard`
- redirect anonimo/autenticato su `/login` e `/dashboard`

## Fuori scope MD-02

- RBAC granulare
- tenant bootstrap avanzato
- integrazioni ERP
- modellazione DB di dominio oltre standard DB-00

## Scope MD-03

- bootstrap tenant con selezione `/select-tenant`
- auto-selezione per membership singola
- blocco accesso dashboard se tenant non selezionato
- persistenza tenant corrente in cookie httpOnly `esyy_tenant_id`

## Scope MD-04

- layout shell area protetta con header e sidebar
- dashboard placeholder in `(app)`
- pagine placeholder moduli principali in `(app)`
- protezione middleware per tutte le route shell

## Scope MD-05

- Anagrafiche > Articoli prodotto read-only con query reali DB tenant-scoped
- filtri base su elenco (ricerca testuale, stato, copertura configurazione)
- badge copertura: ERP, DIBA, ciclo, modello
- dettaglio articolo read-only e link placeholder navigabili per DIBA/ciclo/modello
- nessun CRUD e nessuna integrazione ERP reale in questa fase

## Scope MD-06

- Anagrafiche > Elenco DIBA read-only con query reali DB tenant-scoped
- stato e versione DIBA visibili in lista
- collegamento rapido al modello produttivo (placeholder tecnico) e all'articolo dove disponibile
- evidenza alternative/opzionali dove disponibile dalle righe versione
- nessun CRUD esteso e nessuna gestione completa del versioning avanzato in UI

## Scope MD-07

- Anagrafiche > Dettaglio DIBA con testata, tab/sezioni principali e griglia materiali centrale
- lettura riga materiali: quantita, UM, alternative/opzionali, note, versione/stato
- dettaglio riga read-only con regole di consumo/prelievo dove disponibili nel DB
- nessun editing DIBA, nessun workflow avanzato di versioning, nessuna variazione strutturale DB autonoma

## Scope MD-08

- Anagrafiche > Elenco distinte ciclo read-only con query reali DB tenant-scoped
- stato/versione visibili, numero fasi visibile, tipo processo visibile
- presenza qualita visibile e collegamento rapido ai modelli produttivi
- focus solo elenco/lettura, nessun editing completo e nessuna gestione avanzata rami/vista grafica ciclo

## Scope MD-09

- Anagrafiche > Dettaglio distinta ciclo con testata, tab/sezioni principali e griglia fasi centrale
- lettura fase: reparto/centro/terzista, tipo fase, qualita, tempi standard, setup, risorse parallele, stato/versione
- dettaglio fase read-only con modalita tempo, capacita/simulazione, regole operative, evidenza fase esterna e controlli qualita
- nessun editing completo ciclo, nessuna vista grafica editabile, nessuna variazione strutturale DB autonoma

## Scope MD-22

- Ordini di Produzione > Elenco ODP read-only tenant-scoped su `/odp`
- filtri base: ricerca, stato, ritardo, criticita, legame commessa, origine
- evidenza operativa in elenco: avanzamento, ritardo, criticita, legame con commessa, origine, conteggio fasi
- quick link riga verso dettaglio ODP, fasi, materiali e conto lavoro (con fallback placeholder)
- placeholder strutturato dettaglio ODP su `/odp/[odpId]` in attesa di MD-23

## Scope MD-23

- evoluzione `/odp/[odpId]` da placeholder a dettaglio ODP read-only
- testata ODP con stato, avanzamento, origine e sorgente dati
- blocchi sintetici per quantita/date/criticita e legame commessa
- accessi rapidi verso fasi, materiali e conto lavoro (con fallback placeholder dove necessario)
- nessun editing operativo e nessuna logica MES introdotta in questa wave
