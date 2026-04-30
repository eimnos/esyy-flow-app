# MD-ODP-Cockpit-02 — Note operativa DB (pass 3)

## Obiettivo
Rendere verificabile nel runtime cloud il livello reale:

**ODP -> Fase -> Materiali**

senza introdurre nuovi oggetti canonici e senza modificare il dominio.

## Baseline invariata
La baseline DB resta:

- `production_orders`
- `production_order_phases`
- `production_order_phase_materials`
- `production_order_phase_events`

## Correzione applicata
Il passaggio precedente aveva mostrato un drift tecnico sulla view `production_order_phase_overviews`.

Con questo fix:

- i materiali vengono inseriti sulla fase reale `ASM` se presente;
- la view di supporto viene **droppata e ricreata** in modo esplicito;
- i contatori `materials_count`, `critical_materials_count`, `events_count`, `alert_events_count` vengono calcolati tramite `LATERAL`, evitando duplicazioni tra join materiali/eventi.

## Dataset minimo garantito
Sul tenant `tenant_test_a` il passaggio assicura almeno:

- 1 ODP reale
- 1 fase reale
- 2 materiali reali collegati alla fase
- 1 evento warning collegato alla stessa fase

## Effetto atteso
Dopo applicazione dello script, il cockpit deve poter mostrare su record reali:

- livello Materiali sotto Fase
- contatori sintetici materiali sulla riga fase
- drill-down materiali coerente
- presenza simultanea di materiali ed eventi/movimenti
