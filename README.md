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

## Setup

You need a Google account (the assignment asks for a fresh one) and about ten
minutes. Steps 1–5 are one-time.

### 1. Create the spreadsheet

1. Sign in to the Google account at [sheets.google.com](https://sheets.google.com).
2. Create a blank spreadsheet and name it, e.g. **EDXSO Contacts Sync**.

### 2. Add the script files

1. In the spreadsheet, open **Extensions → Apps Script**.
2. Rename the project (top left) to **EDXSO Contacts Sync**.
3. Open **Project Settings** (the gear icon) and tick
   **Show "appsscript.json" manifest file in editor**.
4. Back in **Editor** (the `< >` icon), open `appsscript.json` and replace its
   contents with [`src/appsscript.json`](src/appsscript.json). This turns on the
   People API and requests the permissions the script needs.
5. Delete the default `Code.gs`. Then, for each of these files, click **+ → Script**,
   type the name without `.gs`, and paste in the file's contents:
   - [`Config.gs`](src/Config.gs)
   - [`SheetRepo.gs`](src/SheetRepo.gs)
   - [`ContactsRepo.gs`](src/ContactsRepo.gs)
   - [`Sync.gs`](src/Sync.gs)
   - [`Setup.gs`](src/Setup.gs)
6. Click **Save** (the disk icon). Under **Services** on the left you should now
   see **People**.

> **Alternative, using the command line:** install [clasp](https://github.com/google/clasp),
> turn on the Apps Script API at <https://script.google.com/home/usersettings>, then
> from this repository run:
>
> ```bash
> clasp login
> clasp create --type sheets --title "EDXSO Contacts Sync" --rootDir src
> git checkout -- src/appsscript.json
> clasp push
> ```
>
> This creates a new spreadsheet with the script already attached. The
> `git checkout` line restores this repo's manifest, since `clasp create` can
> replace it with a default one that lacks the People API. If `clasp push` asks
> whether to overwrite the manifest, answer yes.

### 3. Turn on the sync

1. Reload the spreadsheet. After a few seconds a **Contacts Sync** menu appears.
2. Choose **Contacts Sync → Set up sync**.
3. Google asks you to authorize the script:
   1. Click **Continue** and pick the account.
   2. Google shows **"Google hasn't verified this app"**, because it is your own
      script, not a published app. Click **Advanced → Go to EDXSO Contacts Sync (unsafe)**.
   3. Review the permissions (Sheets, Contacts, triggers) and click **Allow**.
4. If nothing seems to happen after authorizing, choose **Set up sync** once more.
   A message in the bottom-right corner confirms that sync is on, and a
   **Contacts** tab appears with the header row.

### 4. Add the 10 contacts

In the **Contacts** tab, type or paste 10 rows under the header, with a name in
column A and a phone number in column B (email is optional). Each row is created
in Google Contacts within a few seconds, and its `Contact ID` and `Last Synced`
fill in. You can check them at [contacts.google.com](https://contacts.google.com).

Leave `Contact ID` and `Last Synced` blank when adding rows; the script fills them.

### 5. Connect the phone

- **Android:** Settings → Accounts (or Passwords & accounts) → add the Google
  account, and make sure **Contacts** sync is turned on.
- **iPhone:** Settings → Contacts → Accounts → Add Account → Google, and turn on
  **Contacts**.

The 10 contacts then appear in the phone's Contacts app.

### Day to day

- **Add a contact on the phone:** when saving, choose the Google account (not the
  phone or SIM) as the place to save it. Within about a minute it appears as
  row 11 in the sheet.
- **Add or edit a row in the sheet:** it is pushed to Google Contacts at once.
- **Sync immediately:** choose **Contacts Sync → Sync now**.

## Running automatically

**Set up sync** installs two triggers:

- **On edit** (`handleEdit`): pushes a changed row to Google Contacts as soon as
  you edit it.
- **Every minute** (`syncAll`): pulls changes from Google Contacts and retries
  any row that failed. Change `SYNC_INTERVAL_MINUTES` in `Config.gs` to run it
  less often.

Running setup again replaces the old triggers instead of adding duplicates.
**Contacts Sync → Stop automatic sync** removes them.

A free Google account gets 90 minutes of trigger run time per day. A run with
nothing to sync takes about a second, so the every-minute timer fits inside it.

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

## Troubleshooting

| Problem | Fix |
|---|---|
| No **Contacts Sync** menu | Reload the spreadsheet and wait a few seconds. |
| `ReferenceError: People is not defined` | The People API service isn't on. Check `appsscript.json` matches [`src/appsscript.json`](src/appsscript.json), or add it under **Services → + → People API**. |
| A phone contact doesn't reach the sheet | Make sure it was saved to the Google account, not the phone or SIM. Google can take a couple of minutes to make new contacts visible; then use **Sync now**. |
| `Error: …` in `Last Synced` | In Apps Script, open **Executions** to see the full error. The row is retried every minute. |
| Phone number lost its `+` or leading zero | Column B must be formatted as plain text (**Format → Number → Plain text**). Setup does this for you. |

## Limitations

- The fastest Apps Script timer runs every minute, so changes made in Google
  Contacts take up to a minute (plus Google's own propagation delay) to reach the
  sheet. Changes in the sheet are pushed immediately.
- Only name, the first phone number and the first email are synced.
- Deleting a row in the sheet does not delete the contact, by design.

