# Nota operativa DB-00 — MD-10 Production Models

## Allineamento wave MD-10

Per la wave **MD-10** la sorgente canonica del dettaglio **Modello produttivo** resta il pattern versionato già coerente con DB-00:

- `production_models` = famiglia logica del modello produttivo
- `production_model_versions` = versioni del modello
- `production_model_version_routing_links` = collegamento tra versione del modello e cicli compatibili

## Regola operativa

La baseline dati **non** introduce oggetti canonici alternativi.

Se il runtime pubblico/app richiede una sorgente più semplice di lettura, è ammessa una **view/read model temporanea di sola lettura**, purché:

- non sostituisca il modello canonico;
- non diventi nuova baseline primaria;
- resti un adapter tecnico coerente con DB-00.

## Copertura funzionale minima della wave

Il read side della wave MD-10 deve consentire almeno la lettura di:

- articolo collegato;
- DIBA di default;
- uno o più cicli compatibili;
- stato operativo;
- stato di completezza;
- regola di scelta del ciclo.

## Nota di governance

Eventuali estensioni strutturali ulteriori del modello produttivo oltre questo perimetro continuano a richiedere validazione DB preventiva.
