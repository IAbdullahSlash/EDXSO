# Google Sheets ⇄ Google Contacts Two-Way Sync

<!--
  Paste everything below the line into the Google Doc. Replace the [brackets]
  before sharing, and set the Doc's sharing to "Anyone with the link can view".
-->

---

**Operations Intern Assignment**
**Submitted by:** Abdullah
**Source code:** https://github.com/IAbdullahSlash/EDXSO
**Demo video:** [paste the Loom / Drive link here]

## 1. What it does

A Google Sheet and the Google Contacts of the same account stay in sync in both
directions, automatically:

- **Sheet → Contacts:** when a row (name and phone number) is added or edited in
  the sheet, it is created or updated in Google Contacts within seconds, so it
  appears on the phone signed in to that account.
- **Contacts → Sheet:** when a contact is added or edited in Google Contacts,
  for example from the phone, it appears in the sheet within about a minute.
  Adding one contact on the phone takes the sheet from 10 to 11 contacts.

No manual step is needed after the one-time setup.

## 2. Approach

**Technology:** Google Apps Script, attached to the spreadsheet, using the
Google People API (Google's current API for Contacts). Everything runs inside
Google, so there is no server to host or keep running.

**Linking rows to contacts.** Each row stores its contact's unique ID
(`Contact ID` column). That is how the script knows which contact a row belongs
to, so it updates the existing contact instead of creating duplicates.

**Two triggers make it automatic:**

1. An **on-edit trigger** runs whenever the sheet is edited and pushes changed
   rows to Google Contacts at once.
2. A **timer trigger** runs every minute. It asks the People API only for the
   contacts that changed since the last run (using a sync token), adds new ones
   to the sheet, updates changed ones and removes deleted ones. It also retries
   any row that failed earlier.

**Avoiding loops and duplicates.** After every write, the script stores a
fingerprint (hash) of the values it wrote in a hidden column. A row is only
pushed when its values differ from that fingerprint, and a contact is only
pulled when it differs from its row. So a contact the script just created is
not copied back as a duplicate, and nothing bounces back and forth.

**Reliability:**

- A lock stops two runs from syncing at the same time.
- A row that fails shows `Error: …` in its `Last Synced` cell and is retried
  automatically.
- If a row and its contact are both edited between runs, the sheet's version
  wins.
- Deleting a row does not delete the contact, so a mistake in the sheet can't
  wipe the phone's contacts. Deleting a contact does remove its row.
- Phone numbers are stored as text, so `+91` and leading zeros are kept.

**Code structure** (in the `src/` folder of the repository):

| File | Purpose |
|---|---|
| `Config.gs` | Sheet name, columns, sync interval |
| `SheetRepo.gs` | Reading and writing rows in the sheet |
| `ContactsRepo.gs` | Creating, updating and listing contacts via the People API |
| `Sync.gs` | The two-way sync logic |
| `Setup.gs` | The "Contacts Sync" menu and the triggers |

The repository also has an automated test (`test/sync.test.js`) that runs the
sync against simulated Sheets and Contacts in eleven scenarios, including the
10 → 11 case, edits on both sides, deletion and failed rows.

## 3. Setup instructions

The full click-by-click guide, with troubleshooting, is in the repository's
README. In short:

1. **Create the spreadsheet.** In the Google account, create a blank Google
   Sheet.
2. **Add the script.** Open **Extensions → Apps Script**. In **Project
   Settings**, tick **Show "appsscript.json" manifest file in editor**. Replace
   `appsscript.json` with the repository's version (it turns on the People API),
   then add the five `.gs` files from `src/` and save.
3. **Turn on the sync.** Reload the sheet and choose **Contacts Sync → Set up
   sync**. Authorize the script. Google warns that the app isn't verified,
   because it is a personal script: click **Advanced → Go to EDXSO Contacts Sync
   (unsafe) → Allow**. A **Contacts** tab is created and the triggers are
   installed.
4. **Add contacts.** Type or paste names and phone numbers into the
   **Contacts** tab. Each row's `Contact ID` and `Last Synced` fill in as it is
   created in Google Contacts.
5. **Connect the phone.** Add the same Google account on the phone with
   Contacts sync turned on. When adding a contact on the phone, save it to that
   Google account (not the phone or SIM).

## 4. Limitations

- Google's fastest timer runs once a minute, so changes made in Google Contacts
  reach the sheet within about a minute. Sheet changes go out immediately.
- Name, the first phone number and the first email are synced; any extra numbers
  or emails on a contact are left untouched.

## 5. Source code

GitHub repository: https://github.com/IAbdullahSlash/EDXSO
