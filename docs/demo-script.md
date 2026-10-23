# Demo Video Script

A 3–4 minute screen recording (Loom works well) showing both sync directions.
Lines in *italics* are what to say; the rest is what to do on screen.

## Before you record

- [ ] Setup is done in the fresh account (README steps 1–5), and **Set up sync**
      has been run once.
- [ ] The **Contacts** tab has only the header row, and
      [contacts.google.com](https://contacts.google.com) shows no contacts.
      (If you tested earlier, delete the test contacts in Google Contacts first,
      wait a minute, and their rows disappear on their own.)
- [ ] The phone is signed in to the same Google account with Contacts sync on.
- [ ] The phone screen is visible on the computer, so one recording shows
      everything:
  - Android: [scrcpy](https://github.com/Genymobile/scrcpy) or Windows **Phone Link**.
  - iPhone: hold the phone up to the webcam, or record the phone's screen
    separately and splice it in.
- [ ] Three browser tabs are open: the spreadsheet, contacts.google.com, and the
      Apps Script editor.
- [ ] The 10 sample rows below are copied to the clipboard.

### Sample rows (paste into cell A2)

```
Aarav Sharma	+91 90000 00001
Diya Patel	+91 90000 00002
Kabir Khan	+91 90000 00003
Ananya Iyer	+91 90000 00004
Rohan Mehta	+91 90000 00005
Sara Ali	+91 90000 00006
Vihaan Gupta	+91 90000 00007
Meera Nair	+91 90000 00008
Arjun Reddy	+91 90000 00009
Zoya Siddiqui	+91 90000 00010
```

The names and phone numbers are separated by tabs, so pasting into A2 fills
columns A and B.

## Script

### 1. Intro (≈15 s)

Show the spreadsheet.

*"This is my two-way sync between Google Sheets and Google Contacts, built with
Google Apps Script and the People API. I'll show a sheet-to-Contacts sync, then
a Contacts-to-sheet sync from my phone."*

### 2. How it works (≈30 s)

Switch to the Apps Script tab. Briefly show the file list, then open
**Triggers** (the alarm-clock icon) to show the two triggers.

*"The script is split into config, sheet access, contacts access, the sync logic
and setup. Setup installs two triggers: one runs whenever the sheet is edited,
and one runs every minute to pick up changes from Google Contacts. Each row
stores its contact's ID, so nothing gets duplicated."*

### 3. Sheet → Contacts (≈45 s)

1. In the spreadsheet, click **A2** and paste the 10 rows.
2. Wait a few seconds: `Contact ID` and `Last Synced` fill in for every row.

   *"I've added 10 contacts to the sheet. Within a few seconds each row gets a
   contact ID, which means it has been created in Google Contacts."*
3. Switch to contacts.google.com and refresh: all 10 are there.
4. Show the phone's Contacts app: the same 10 contacts.

   *"And here they are on the phone, with no manual import."*

### 4. Contacts → Sheet (≈60 s)

1. On the phone, add a new contact, e.g. **Test Phone Contact, +91 90000 00011**.
   When asked where to save it, pick the Google account.

   *"Now I'll add an 11th contact directly on the phone."*
2. Switch to the spreadsheet and wait. Within about a minute row 12 appears with
   the new contact. (Don't click **Sync now**; waiting shows that it's
   automatic.)

   *"The every-minute trigger has picked it up. The sheet went from 10 contacts
   to 11 without my touching it."*

### 5. Edits both ways (optional, ≈30 s)

1. In the sheet, change one phone number. Refresh contacts.google.com: it's
   updated.
2. On the phone, edit a contact's number. Within a minute the sheet shows the
   new number.

   *"Edits sync both ways too."*

### 6. Wrap up (≈15 s)

*"The code and setup guide are on GitHub, linked in the document. Thanks for
watching."*

## After recording

- Upload or share the video so that anyone with the link can view it.
- Paste the link into the **Demo video** line of the Google Doc.
