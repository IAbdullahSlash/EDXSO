# EDXSO: Google Sheets ⇄ Google Contacts Two-Way Sync

A Google Apps Script project, bound to a Google Sheet, that keeps a contact list in
the sheet and the account's Google Contacts in sync in both directions, with no
manual steps.

- **Sheet → Contacts:** a row added or edited in the sheet is created or updated in
  Google Contacts, so it shows up on the phone signed in to that account.
- **Contacts → Sheet:** a contact added or edited in Google Contacts (from the phone,
  for example) appears in the sheet as a new or updated row (10 → 11 contacts).

## How it works (summary)

| Piece | Role |
|---|---|
| `Contacts` sheet | Columns: `Name`, `Phone`, `Email`, `Contact ID`, `Last Synced` |
| `Contact ID` column | Stores the People API `resourceName`, linking each row to one contact |
| People API (advanced service) | Creates, updates and lists contacts |
| Incremental sync token | Fetches only contacts changed since the last run |
| Installable `onEdit` trigger | Pushes sheet edits to Contacts right away |
| Time-driven trigger (every minute) | Pulls changes from Contacts and retries anything missed |
| `LockService` | Keeps two runs from syncing at the same time |

## Project layout

```
src/
  appsscript.json   Manifest: People API service, OAuth scopes
```

Setup instructions and full documentation are added as the project is built.
