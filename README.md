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
  Config.gs         Sheet name, columns, People API fields
  SheetRepo.gs      Reading and writing rows in the Contacts sheet
  ContactsRepo.gs   Creating, updating and listing contacts (People API)
  Sync.gs           Two-way sync logic and locking
test/
  sync.test.js      Runs the sync against simulated Sheets and Contacts (Node.js)
```

## Sync rules

- A row is pushed when it has no `Contact ID` yet, or its name/phone/email no
  longer matches the hidden `Sync Hash` from the last sync.
- Contacts changed since the last run (People API sync token) are written into
  their row, or appended as new rows.
- Every write stores the hash of what was written, so changes don't bounce back
  and forth between the two sides.
- If a row and its contact both changed between runs, the sheet wins.
- A contact deleted in Google Contacts removes its row. Deleting a row does not
  delete the contact, so an accidental delete in the sheet can't wipe contacts.
- Only the first phone number and email are synced; extra ones on a contact are
  left untouched.
- A row that fails to sync shows `Error: …` in `Last Synced` and is retried on
  the next run.

## Testing locally

```bash
node test/sync.test.js
```

The test runs eight scenarios against in-memory fakes: the initial 10-contact
push, no feedback loops, a contact added on the phone (10 → 11), edits on each
side, deletion, conflicting edits, and retrying a failed row.

Setup instructions and full documentation are added as the project is built.
