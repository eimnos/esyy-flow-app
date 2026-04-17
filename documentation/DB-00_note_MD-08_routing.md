# MD-08 — Nota operativa di allineamento DB/application per libreria distinte ciclo

## Scopo
Chiarire la baseline dati da usare nella wave MD-08 per la pagina **Anagrafiche > Elenco distinte ciclo**, evitando assunzioni applicative non coerenti con il modello DB approvato.

## Decisione operativa
Per la wave MD-08 la sorgente canonica della libreria cicli è il pattern versionato già coerente con DB-00:

- `routing_templates` = famiglia logica della distinta ciclo
- `routing_template_versions` = versioni della distinta ciclo
- `routing_template_version_steps` = fasi/step della versione

## Regola di allineamento
- Queste tabelle costituiscono la **baseline primaria** del modello dati.
- Eventuali view o read model usati dalla slice applicativa sono ammessi **solo come adapter tecnico temporaneo di sola lettura**.
- Nessuna view/read model diventa oggetto canonico alternativo del dominio.

## Nota runtime
Se il runtime pubblico/app non legge agevolmente il pattern versionato completo, è ammesso un read model derivato per la lista, purché:

1. non introduca un nuovo naming canonico concorrente;
2. non sposti la responsabilità del dominio fuori dalle tabelle versionate;
3. resti chiaramente documentato come compatibilità temporanea di lettura.

## Esito atteso per MD-08
Per chiudere acceptance E2E della wave:

- il runtime deve poter leggere la libreria cicli da struttura esposta coerente;
- devono essere presenti almeno 1-2 cicli di test sul tenant usato dalla slice;
- la pagina deve poter mostrare almeno: stato/versione, numero fasi, tipo processo, presenza qualità.
