## Nota operativa — MD-05 / Anagrafiche > Articoli prodotto

Per la wave **MD-05**, la sorgente dati canonica della slice **Anagrafiche > Articoli prodotto** è la tabella tenant-scoped **`products`**.

### Regola operativa
- **Baseline primaria:** `products`
- **Chiave di scoping:** `tenant_id`
- **Naming business:** `code`
- **Nome leggibile:** `name`
- **Lifecycle minimo:** `status`

### Allineamento DB / applicazione
- La slice non deve assumere come baseline primaria una view o una struttura alternativa.
- Eventuali view di compatibilità sono ammesse **solo come adapter tecnico temporaneo di lettura** e non diventano oggetto canonico del modello dati.
- Eventuali naming alternativi o strutture parallele richiedono validazione preventiva DB.

### Set minimo atteso per questa wave
Campi minimi di riferimento:
- `id`
- `tenant_id`
- `code`
- `name`
- `status`
- `created_at`
- `updated_at`
- `row_version`

### Dati di test
Per chiusura acceptance MD-05 devono essere presenti almeno **2 articoli di test** sul tenant usato dal vertical slice / E2E.

### Coerenza con DB-00
Questa nota non modifica la baseline DB-00: esplicita solo che, per la wave MD-05, l’oggetto canonico da usare lato applicazione per le anagrafiche prodotto è `products`, coerentemente con lo standard già approvato.
