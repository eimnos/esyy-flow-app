# Esyy Flow App

Bootstrap tecnico iniziale (`MD-01`) per Esyy Flow.

Stack base:
- Next.js (App Router) + TypeScript strict
- Supabase (configurazione via variabili ambiente)
- Deploy target: Netlify

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

1. Crea repository GitHub `esyy-flow-app`.
2. Imposta branch principale `main`.
3. Collega la repository al sito Netlify `esyy-flow-dev`.
4. Configura su Netlify le env:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Verifica deploy branch `main` e endpoint `/api/health` online.

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
