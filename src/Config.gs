/**
 * Settings shared by the whole project.
 */
const CONFIG = {
  SHEET_NAME: 'Contacts',
  HEADERS: ['Name', 'Phone', 'Email', 'Contact ID', 'Last Synced', 'Sync Hash'],

  // Fields read from and written to Google Contacts (People API).
  PERSON_FIELDS: 'names,phoneNumbers,emailAddresses,metadata',
  UPDATE_FIELDS: 'names,phoneNumbers,emailAddresses',

  // Script property holding the People API sync token between runs.
  SYNC_TOKEN_KEY: 'contactsSyncToken',

  // How long a run waits for another run to finish before giving up.
  LOCK_TIMEOUT_MS: 30 * 1000,
};

/** 1-based column numbers in the Contacts sheet. */
const COL = {
  NAME: 1,
  PHONE: 2,
  EMAIL: 3,
  ID: 4,
  SYNCED: 5,
  HASH: 6,
};
