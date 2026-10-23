# EDXSO: Google Sheets ⇄ Google Contacts Two-Way Sync

A Google Apps Script project, bound to a Google Sheet, that keeps a contact list in
the sheet and the account's Google Contacts in sync in both directions, with no
manual steps.

- **Sheet → Contacts:** a row added or edited in the sheet is created or updated in
  Google Contacts, so it shows up on the phone signed in to that account.
- **Contacts → Sheet:** a contact added or edited in Google Contacts (from the phone,
  for example) appears in the sheet as a new or updated row (10 → 11 contacts).

