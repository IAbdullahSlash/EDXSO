/**
 * Spreadsheet menu and the triggers that make the sync run on its own.
 *
 *   - An installable on-edit trigger pushes sheet edits to Contacts at once.
 *     (A simple onEdit can't call the People API, so it must be installable.)
 *   - A time-driven trigger runs syncAll() every SYNC_INTERVAL_MINUTES to pull
 *     changes made in Google Contacts and retry anything that failed.
 */

const TRIGGER_HANDLERS = ['syncAll', 'handleEdit'];

/** Adds the "Contacts Sync" menu when the spreadsheet is opened. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Contacts Sync')
    .addItem('Set up sync', 'setupSync')
    .addItem('Sync now', 'syncAll')
    .addSeparator()
    .addItem('Stop automatic sync', 'removeSyncTriggers')
    .addToUi();
}

/**
 * One-time setup: creates the Contacts sheet, installs both triggers and runs
 * a first sync. Safe to run again; it replaces any triggers it made before.
 */
function setupSync() {
  const sheet = getContactsSheet_();
  removeSyncTriggers();

  const ss = sheet.getParent();
  ScriptApp.newTrigger('handleEdit').forSpreadsheet(ss).onEdit().create();
  ScriptApp.newTrigger('syncAll').timeBased().everyMinutes(CONFIG.SYNC_INTERVAL_MINUTES).create();

  syncAll();
  ss.toast('Sync is on. Contacts update every ' + CONFIG.SYNC_INTERVAL_MINUTES + ' minute(s).', 'Contacts Sync');
}

/** Deletes the triggers created by setupSync(). */
function removeSyncTriggers() {
  ScriptApp.getProjectTriggers()
    .filter(t => TRIGGER_HANDLERS.indexOf(t.getHandlerFunction()) !== -1)
    .forEach(t => ScriptApp.deleteTrigger(t));
}

/** Installable on-edit handler: pushes data-row edits in the Contacts sheet. */
function handleEdit(e) {
  const range = e && e.range;
  if (!range || range.getSheet().getName() !== CONFIG.SHEET_NAME) return;
  if (range.getLastRow() < 2) return; // header edit only
  syncSheetToContacts();
}
