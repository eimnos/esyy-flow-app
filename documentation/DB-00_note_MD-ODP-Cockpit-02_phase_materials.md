# MD-ODP-Cockpit-02 — Nota operativa DB / runtime

## Scopo
Abilitare la validazione cloud del livello **ODP -> Fase -> Materiali** nel cockpit, senza introdurre nuovi oggetti canonici alternativi.

## Baseline canonica confermata
- `production_orders` = testata ODP tenant-scoped
- `production_order_phases` = fasi reali dell'ODP
- `production_order_phase_materials` = materiali reali collegati alla singola fase
- `production_order_phase_events` = eventi/movimenti di fase utili per indicatori sintetici e drill-down

## Regola di allineamento
Il livello materiali sotto fase è runtime data alignment su entità operative reali, non revisione di dominio.

La pagina cockpit deve poter leggere:
- contatore materiali per fase
- presenza di materiali critici
- eventuali eventi/movimenti warning o error sulla fase

## Read model ammesso
È ammessa la view read-only `production_order_phase_overviews` come adapter tecnico temporaneo per contatori e badge sintetici.

La baseline primaria del dato resta comunque:
- `production_order_phases`
- `production_order_phase_materials`
- `production_order_phase_events`

## Dataset minimo di questa wave
Sul tenant test viene predisposto almeno:
- 1 ODP reale
- 1 fase reale collegata
- 2 materiali reali collegati alla fase
- 1 evento warning collegato alla fase

## Obiettivo acceptance
Consentire il rerun cloud di MD-ODP-Cockpit-02 verificando su record reali:
- visibilità del livello Materiali sotto Fase
- coerenza dei contatori sintetici sulla riga fase
- drill-down materiali leggibile
- presenza di un segnale utile warning/evento collegato
