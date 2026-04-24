# MD-13 — Nota operativa di allineamento DB/applicazione per Commesse > Overview

Per la wave **MD-13**, la baseline canonica lato DB per la commessa tenant-scoped è:

- `projects` = entità principale della commessa
- `project_parties` = attori coinvolti della commessa
- `project_events` = timeline operativa e criticità aperte

Eventuale adattatore di sola lettura ammesso in questa wave:

- `project_overviews` = read model / view temporanea per consumo applicativo della overview

Regola vincolante:

- `project_overviews` non è un nuovo oggetto canonico di dominio
- la baseline primaria resta `projects` con tabelle figlie coerenti
- eventuali ulteriori strutture di storico specifico (es. `project_status_history`) possono essere introdotte in una wave successiva solo se richieste da un caso d’uso operativo esplicito

Obiettivo della nota:

- evitare che la slice **Commesse > Elenco / Overview** si basi su fallback o naming non allineati
- mantenere coerenza con DB-00: tabella principale chiara, figli derivati prevedibili, tenant scope esplicito, eventi separati dalla testata
