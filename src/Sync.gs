/**
 * Two-way sync between the Contacts sheet and Google Contacts.
 *
 * Sheet → Contacts: a row whose name/phone/email no longer matches its stored
 * hash (or that has no Contact ID yet) is pushed to Google Contacts.
 *
 * Contacts → Sheet: contacts changed since the last run (via the People API
 * sync token) are written into their row, or appended as a new row.
 *
 * Loops are avoided because every write records the hash of what was
 * written: a row pulled from Contacts already matches its hash, so it is not
 * pushed back, and a pushed contact already matches its row, so it is not
 * pulled back. If both sides changed, the sheet wins.
 */

/** Runs both directions. Used by the time-driven trigger and the menu. */
function syncAll() {
  withLock_(() => {
    pushSheetToContacts_();
    pullContactsToSheet_();
  });
}

/** Sheet → Contacts only. Used by the on-edit trigger for a fast push. */
function syncSheetToContacts() {
  withLock_(pushSheetToContacts_);
}

/** Contacts → Sheet only. */
function syncContactsToSheet() {
  withLock_(pullContactsToSheet_);
}

function pushSheetToContacts_() {
  const sheet = getContactsSheet_();
  const stats = { created: 0, updated: 0, failed: 0 };

  readRows_(sheet).forEach(r => {
    if (!r.name && !r.phone) return; // blank or half-typed row
    const hash = hashOf_(r);
    if (r.id && hash === r.hash) return; // unchanged since last sync

    try {
      if (r.id) {
        updateContact_(r.id, r);
        stats.updated++;
      } else {
        r.id = createContact_(r);
        stats.created++;
      }
      markRowSynced_(sheet, r.row, r.id, hash);
    } catch (e) {
      // Leave the hash as it was so this row is retried on the next run.
      console.error('Row ' + r.row + ' failed to sync: ' + e.message);
      markRowError_(sheet, r.row, e);
      stats.failed++;
    }
  });

  console.log('Sheet → Contacts: ' + JSON.stringify(stats));
}

function pullContactsToSheet_() {
  const sheet = getContactsSheet_();
  const changes = listContactChanges_();
  const rowsById = new Map(readRows_(sheet).filter(r => r.id).map(r => [r.id, r]));
  const rowsToDelete = [];
  const stats = { added: 0, updated: 0, deleted: 0 };

  changes.contacts.forEach(c => {
    const r = rowsById.get(c.id);

    if (c.deleted) {
      if (r) rowsToDelete.push(r.row);
      return;
    }
    if (!c.name && !c.phone) return; // nothing worth showing in the sheet

    if (!r) {
      appendRow_(sheet, c);
      stats.added++;
      return;
    }

    const sheetHash = hashOf_(r);
    if (hashOf_(c) === sheetHash) return; // already the same
    if (sheetHash !== r.hash) return; // row has unpushed edits; the sheet wins
    writeRow_(sheet, r.row, c);
    stats.updated++;
  });

  // Delete from the bottom up so the remaining row numbers stay valid.
  rowsToDelete.sort((a, b) => b - a).forEach(row => sheet.deleteRow(row));
  stats.deleted = rowsToDelete.length;

  saveSyncToken_(changes.nextSyncToken);
  console.log('Contacts → Sheet (' + (changes.fullSync ? 'full' : 'incremental') + '): ' + JSON.stringify(stats));
}

/** Runs `fn` while holding the script lock so two syncs never overlap. */
function withLock_(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CONFIG.LOCK_TIMEOUT_MS)) {
    console.warn('Another sync is still running; skipping this one.');
    return;
  }
  try {
    fn();
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
}
