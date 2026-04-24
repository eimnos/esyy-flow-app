# MD-21 — Nota operativa DB/application alignment

## Oggetto
Allineamento dati/runtime per la validazione cloud della relazione **ODP ↔ Fasi** nella tab **Commesse > Produzione**.

## Baseline canonica confermata
Per questa wave la sorgente dati canonica resta:

- `production_orders` = testata ODP tenant-scoped
- `production_order_phases` = fasi reali collegate all'ODP

La relazione con la commessa resta coerente con la struttura tenant-scoped già esposta per la commessa (`projects` o oggetto equivalente già approvato nel runtime del tenant).

## Regola applicativa/DB
- Nessun nuovo oggetto canonico alternativo.
- Eventuali viste/read model sono ammesse solo come adapter tecnico temporaneo di sola lettura.
- Il naming resta coerente con DB-00:
  - tabella principale: `production_orders`
  - tabella figlia: `production_order_phases`

## Dataset minimo per MD-21
Per chiudere l'acceptance cloud è sufficiente predisporre sul tenant di test:

- 1 commessa reale
- 1 ODP reale collegato alla commessa
- almeno 2 fasi reali collegate all'ODP
- preferibilmente:
  - 1 fase regolare
  - 1 fase con segnale utile (`is_delayed = true` e/o `is_blocked = true`)

## Obiettivo della validazione
Permettere a Isabell il rerun cloud mirato verificando su record reali:

- evidenziazione visiva ODP ↔ Fasi
- filtro **Focus ODP**
- indicatori sintetici fasi collegate / ritardi / blocchi nella tabella ODP
- label di associazione ODP nella tabella Fasi
