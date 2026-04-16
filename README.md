# Esyy Flow App

Bootstrap tecnico iniziale (`MD-01`) per Esyy Flow.

Stack base:
- Next.js (App Router) + TypeScript strict
- Supabase (configurazione via variabili ambiente)
- Deploy target: Netlify

## Riferimenti ufficiali

- Repository GitHub: `https://github.com/eimnos/esyy-flow-app.git`
- Branch principale: `main`
- Netlify dev: `https://esyy-flow-dev.netlify.app/`

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

## Struttura iniziale rilevante

```text
src/
  app/
    api/health/route.ts
  lib/
    env.ts
    supabase/client.ts
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
   - oppure alias compatibili: `SUPABASE_URL`, `SUPABASE_ANON_KEY`
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
| `SUPABASE_ANON_KEY` | server (alias) | alternativa | alias compatibile per anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | solo server | sì (per feature server future) | secret, mai nel client |

## Bootstrap minimo (locale + cloud)

1. `git clone https://github.com/eimnos/esyy-flow-app.git`
2. `cp .env.example .env.local`
3. valorizza `.env.local`
4. `npm install`
5. `npm run dev`
6. verifica `http://localhost:3000/api/health`
7. push su `main`
8. verifica deploy su `https://esyy-flow-dev.netlify.app/`

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
