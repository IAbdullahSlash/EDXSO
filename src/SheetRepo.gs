/**
 * Reading and writing contact rows in the Contacts sheet.
 *
 * A row record looks like:
 *   { row, name, phone, email, id, hash }
 * where `id` is the People API resourceName (e.g. "people/c123") and `hash`
 * is the fingerprint of name/phone/email as of the last successful sync.
 */

/** Returns the Contacts sheet, creating it and its header row if needed. */
function getContactsSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME) || ss.insertSheet(CONFIG.SHEET_NAME);

  const header = sheet.getRange(1, 1, 1, CONFIG.HEADERS.length);
  if (header.getValues()[0].join() !== CONFIG.HEADERS.join()) {
    header.setValues([CONFIG.HEADERS]).setFontWeight('bold');
    sheet.setFrozenRows(1);
    // Store phone numbers as text so "+91..." and leading zeros survive.
    sheet.getRange(1, COL.PHONE, sheet.getMaxRows(), 1).setNumberFormat('@');
    sheet.hideColumns(COL.HASH);
  }
  return sheet;
}

/** Reads every data row (row 2 onwards) into row records. */
function readRows_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, CONFIG.HEADERS.length).getValues();
  return values.map((v, i) => ({
    row: i + 2,
    name: clean_(v[COL.NAME - 1]),
    phone: clean_(v[COL.PHONE - 1]),
    email: clean_(v[COL.EMAIL - 1]),
    id: clean_(v[COL.ID - 1]),
    hash: clean_(v[COL.HASH - 1]),
  }));
}

/** Overwrites a row with a contact's values and marks it as synced. */
function writeRow_(sheet, row, contact) {
  sheet.getRange(row, 1, 1, CONFIG.HEADERS.length).setValues([rowValues_(contact)]);
}

/**
 * Adds a contact in the row after the last one with a name, phone, email or ID.
 * (sheet.appendRow() would go below rows that were cleared but still hold a
 * value in the hidden Sync Hash column.)
 */
function appendRow_(sheet, contact) {
  const used = readRows_(sheet).filter(r => r.name || r.phone || r.email || r.id);
  const row = used.length ? used[used.length - 1].row + 1 : 2;
  writeRow_(sheet, row, contact);
}

/** Records a successful push: the contact ID, the time and the new hash. */
function markRowSynced_(sheet, row, id, hash) {
  sheet.getRange(row, COL.ID, 1, 3).setValues([[id, new Date(), asText_(hash)]]);
}

/** Shows a sync error in the row. The hash is left alone so the row is retried. */
function markRowError_(sheet, row, error) {
  sheet.getRange(row, COL.SYNCED).setValue('Error: ' + (error && error.message || error));
}

/** Fingerprint of the fields that are synced, used to spot changed rows. */
function hashOf_(record) {
  const text = [record.name, record.phone, record.email].join('\u001f');
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, text, Utilities.Charset.UTF_8);
  return Utilities.base64Encode(bytes);
}

/** True if a synced cell shows a Sheets error such as #ERROR! instead of a value. */
function hasCellError_(record) {
  return [record.name, record.phone, record.email].some(v => /^#(ERROR!|N\/A|REF!|NAME\?|VALUE!|DIV\/0!|NUM!|NULL!)$/.test(v));
}

function rowValues_(contact) {
  return [
    asText_(contact.name), asText_(contact.phone), asText_(contact.email),
    contact.id, new Date(), asText_(hashOf_(contact)),
  ];
}

/**
 * Makes Sheets store a value as typed. Without the leading apostrophe,
 * "+91 98765 43210" (or a hash starting with "+") is parsed as a formula and
 * shows #ERROR!. The apostrophe is hidden and not returned by getValues().
 */
function asText_(value) {
  return value ? "'" + value : value;
}

function clean_(value) {
  return String(value).trim();
}
