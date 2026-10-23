/**
 * Sync between the Contacts sheet and Google Contacts.
 *
 * Sheet → Contacts: a row whose name/phone/email no longer matches its stored
 * hash (or that has no Contact ID yet) is pushed to Google Contacts.
 */

/** Pushes changed sheet rows to Google Contacts. */
function syncSheetToContacts() {
  withLock_(pushSheetToContacts_);
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
