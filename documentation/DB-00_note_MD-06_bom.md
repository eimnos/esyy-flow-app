## MD-06 — Allineamento operativo DIBA / runtime app

Per la wave **MD-06** la baseline dati da assumere per la libreria **Anagrafiche > Elenco DIBA** è la seguente:

- **modello canonico**: `bom_templates`, `bom_template_versions`, `bom_template_version_lines`
- **nessun oggetto canonico alternativo** ammesso per la DIBA in questa fase
- eventuale view/read model di runtime ammesso **solo** come adapter tecnico temporaneo di lettura, senza valore di baseline primaria

### Regola operativa

La DIBA è un oggetto **versionato** e separato dal ciclo. Di conseguenza:

- `bom_templates` rappresenta la **famiglia logica** della DIBA
- `bom_template_versions` rappresenta le **versioni esplicite** della struttura
- `bom_template_version_lines` rappresenta le **righe materiali** della singola versione

### Implicazione per l'app

Per la slice **Elenco DIBA** l'app può leggere:

1. direttamente le tabelle canoniche necessarie; oppure
2. una view/read model temporaneo di sola lettura costruito sopra il modello canonico

In entrambi i casi, la sorgente logica di riferimento resta il pattern versionato `bom_templates` / `bom_template_versions` / `bom_template_version_lines`.

### Nota di governance

L'introduzione di naming alternativi o di una nuova struttura primaria per la DIBA non è ammessa senza validazione preventiva del responsabile DB.
