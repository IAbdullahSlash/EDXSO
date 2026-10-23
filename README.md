# EDXSO: Google Sheets ⇄ Google Contacts Two-Way Sync

A Google Apps Script project, bound to a Google Sheet, that keeps a contact list in
the sheet and the account's Google Contacts in sync in both directions, with no
manual steps.

- **Sheet → Contacts:** a row added or edited in the sheet is created or updated in
  Google Contacts, so it shows up on the phone signed in to that account.
- **Contacts → Sheet:** a contact added or edited in Google Contacts (from the phone,
  for example) appears in the sheet as a new or updated row (10 → 11 contacts).

## Approach

Everything runs inside Google, as an Apps Script attached to the spreadsheet, so
there is no server to host and nothing to keep running. The script talks to
Google Contacts through the **People API**, Google's current API for contacts.

| Piece | Role |
|---|---|
| `Contacts` sheet | Columns: `Name`, `Phone`, `Email`, `Contact ID`, `Last Synced` (plus a hidden `Sync Hash`) |
| `Contact ID` column | Stores the People API `resourceName`, linking each row to one contact |
| People API (advanced service) | Creates, updates and lists contacts |
| Incremental sync token | Fetches only contacts changed since the last run |
| Installable on-edit trigger | Pushes sheet edits to Contacts right away |
| Time-driven trigger (every minute) | Pulls changes from Contacts and retries anything missed |
| `LockService` | Keeps two runs from syncing at the same time |

Each run does two passes:

1. **Sheet → Contacts.** Any row without a `Contact ID` is created as a new
   contact, and its ID is written back into the row. Any row whose
   name/phone/email no longer matches its stored `Sync Hash` is updated.
2. **Contacts → Sheet.** The People API returns only the contacts that changed
   since the last run's sync token. A contact already in the sheet updates its
   row, a new one is appended as a new row, and a deleted one removes its row.

After every write, the script stores a hash (fingerprint) of the values it
wrote. That is how it avoids feedback loops: a contact the script just created
comes back from the People API identical to its row, so nothing happens, and a
row it just pulled already matches its hash, so it isn't pushed back.

