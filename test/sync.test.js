// Runs the Apps Script sources against in-memory fakes of SpreadsheetApp and People.
// Usage: node test/sync.test.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const assert = require('assert');

const srcDir = process.argv[2] || path.join(__dirname, '..', 'src');

// ---- Fake sheet ----
const grid = []; // array of row arrays (row 1 = index 0)
let maxRows = 1000;
// Like Sheets: a leading apostrophe forces text, and "+..." or "=..." is parsed as a formula.
const parse = v => (typeof v !== 'string' ? v : v[0] === "'" ? v.slice(1) : /^[+=]/.test(v) ? '#ERROR!' : v);
const range = (r, c, nr = 1, nc = 1) => ({
  getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => (grid[r - 1 + i] || [])[c - 1 + j] ?? '')),
  setValues(vals) { vals.forEach((row, i) => row.forEach((v, j) => { (grid[r - 1 + i] ||= [])[c - 1 + j] = parse(v); })); return this; },
  setValue(v) { (grid[r - 1] ||= [])[c - 1] = parse(v); return this; },
  setFontWeight() { return this; },
  setNumberFormat() { return this; },
});
const sheet = {
  getRange: range,
  getLastRow: () => grid.length,
  getMaxRows: () => maxRows,
  appendRow: vals => grid.push(Array.from(vals, parse)),
  deleteRow: row => grid.splice(row - 1, 1),
  setFrozenRows() {}, hideColumns() {},
  getName: () => 'Contacts',
  getParent: () => spreadsheet,
};
let sheetExists = false;
const spreadsheet = {
  getSheetByName: () => (sheetExists ? sheet : null),
  insertSheet: () => { sheetExists = true; return sheet; },
  toast() {},
};
const SpreadsheetApp = {
  getActiveSpreadsheet: () => spreadsheet,
  flush() {},
};

// ---- Fake ScriptApp triggers ----
let triggers = [];
const triggerBuilder = handler => {
  const t = { handler, getHandlerFunction: () => handler };
  const b = { forSpreadsheet: () => b, onEdit: () => b, timeBased: () => b, everyMinutes: () => b, create: () => triggers.push(t) };
  return b;
};
const ScriptApp = {
  newTrigger: triggerBuilder,
  getProjectTriggers: () => [...triggers],
  deleteTrigger: t => { triggers = triggers.filter(x => x !== t); },
};

// ---- Fake People API with sync tokens ----
let seq = 0, clock = 0;
const people = new Map(); // id -> {person, changedAt, deleted}
// The real API fills in displayName from givenName/familyName.
const withDisplay = body => ({ ...body, names: (body.names || []).map(n => ({ ...n, displayName: [n.givenName, n.familyName].filter(Boolean).join(' ') })) });
const People = {
  People: {
    createContact(body) {
      const id = 'people/c' + (++seq);
      people.set(id, { person: { ...withDisplay(body), resourceName: id, etag: 'e' + clock }, changedAt: ++clock });
      return people.get(id).person;
    },
    get(id) {
      const p = people.get(id);
      if (!p || p.deleted) throw new Error('Requested entity was not found.');
      return JSON.parse(JSON.stringify(p.person));
    },
    updateContact(body, id) {
      const p = people.get(id);
      assert.strictEqual(body.etag, p.person.etag, 'etag must match');
      p.person = { ...p.person, ...withDisplay(body), etag: 'e' + (++clock) };
      p.changedAt = clock;
    },
    Connections: {
      list(_, opts) {
        const since = opts.syncToken ? Number(opts.syncToken) : -1;
        const out = [];
        for (const p of people.values()) {
          if (p.changedAt <= since) continue;
          if (p.deleted) { if (since >= 0) out.push({ resourceName: p.person.resourceName, metadata: { deleted: true } }); continue; }
          out.push(p.person);
        }
        return { connections: out, nextSyncToken: String(clock) };
      },
    },
  },
};
// Simulates a contact added or edited "on the phone".
function phoneAdd(name, phone) {
  const id = 'people/c' + (++seq);
  people.set(id, { person: { resourceName: id, etag: 'e', names: [{ displayName: name }], phoneNumbers: [{ value: phone }] }, changedAt: ++clock });
  return id;
}
function phoneEdit(id, phone) { const p = people.get(id); p.person.phoneNumbers = [{ value: phone }]; p.changedAt = ++clock; }
function phoneDelete(id) { const p = people.get(id); p.deleted = true; p.changedAt = ++clock; }

const props = {};
const ctx = vm.createContext({
  SpreadsheetApp, ScriptApp, People, console: { log() {}, warn() {}, error: console.error },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] ?? null, setProperty: (k, v) => { props[k] = v; }, deleteProperty: k => delete props[k] }) },
  LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
  Utilities: {
    DigestAlgorithm: { MD5: 'md5' }, Charset: { UTF_8: 'utf8' },
    computeDigest: (_, text) => [...crypto.createHash('md5').update(text, 'utf8').digest()],
    base64Encode: bytes => Buffer.from(bytes).toString('base64'),
  },
});
for (const f of ['Config.gs', 'SheetRepo.gs', 'ContactsRepo.gs', 'Sync.gs', 'Setup.gs']) {
  vm.runInContext(fs.readFileSync(path.join(srcDir, f), 'utf8'), ctx, { filename: f });
}
const run = () => vm.runInContext('syncAll()', ctx);
const dataRows = () => grid.slice(1);
const live = () => [...people.values()].filter(p => !p.deleted);

// 1. 10 contacts typed into the sheet are created in Contacts.
run(); // creates header
for (let i = 1; i <= 10; i++) grid.push(['Person ' + i, '+91 90000000' + String(i).padStart(2, '0'), '', '', '', '']);
run();
assert.strictEqual(live().length, 10);
assert(dataRows().every(r => r[3].startsWith('people/')), 'every row gets a Contact ID');
assert.strictEqual(dataRows().length, 10, 'no duplicate rows pulled back');

// 2. Running again changes nothing (no loop).
const before = JSON.stringify(dataRows().map(r => r.slice(0, 4)));
const clockBefore = clock;
run(); run();
assert.strictEqual(clock, clockBefore, 'no extra writes to Contacts');
assert.strictEqual(JSON.stringify(dataRows().map(r => r.slice(0, 4))), before);

// 3. Contact added on the phone appears as row 11.
const phoneId = phoneAdd('Phone Friend', '+91 9999999999');
run();
assert.strictEqual(dataRows().length, 11);
assert.deepStrictEqual(dataRows()[10].slice(0, 4), ['Phone Friend', '+91 9999999999', '', phoneId]);
assert.strictEqual(live().length, 11);

// 4. Editing a phone number in the sheet updates the contact.
grid[1][1] = '+91 1111111111';
run();
assert.strictEqual(people.get(grid[1][3]).person.phoneNumbers[0].value, '+91 1111111111');

// 5. Editing on the phone updates the row.
phoneEdit(phoneId, '+91 8888888888');
run();
assert.strictEqual(dataRows()[10][1], '+91 8888888888');

// 6. Deleting on the phone removes the row.
phoneDelete(phoneId);
run();
assert.strictEqual(dataRows().length, 10);

// 7. Both sides changed: the sheet wins.
const id2 = grid[2][3];
phoneEdit(id2, '+91 7777777777');
grid[2][1] = '+91 6666666666';
run();
assert.strictEqual(grid[2][1], '+91 6666666666');
assert.strictEqual(people.get(id2).person.phoneNumbers[0].value, '+91 6666666666');

// 8. Blank rows are ignored; a failed push is shown and retried.
grid.push(['', '', '', '', '', '']);
const realCreate = People.People.createContact;
People.People.createContact = () => { throw new Error('quota'); };
grid.push(['Late Person', '+91 5555555555', '', '', '', '']);
run();
assert.strictEqual(grid[grid.length - 1][4], 'Error: quota');
People.People.createContact = realCreate;
run();
assert(grid[grid.length - 1][3].startsWith('people/'), 'failed row retried');
assert.strictEqual(live().length, 11);

// 9. Setup installs exactly one edit trigger and one timer, even when re-run.
vm.runInContext('setupSync(); setupSync()', ctx);
assert.deepStrictEqual(triggers.map(t => t.handler).sort(), ['handleEdit', 'syncAll']);

// 10. The edit trigger pushes data-row edits and ignores headers and other sheets.
const edit = (sheetName, lastRow) => ({ range: { getSheet: () => ({ getName: () => sheetName }), getLastRow: () => lastRow } });
ctx.e = edit('Other', 5);
grid.push(['Edited In', '+91 4444444444', '', '', '', '']);
vm.runInContext('handleEdit(e)', ctx);
assert.strictEqual(grid[grid.length - 1][3], '', 'other sheets are ignored');
ctx.e = edit('Contacts', 1);
vm.runInContext('handleEdit(e)', ctx);
assert.strictEqual(grid[grid.length - 1][3], '', 'header edits are ignored');
ctx.e = edit('Contacts', grid.length);
vm.runInContext('handleEdit(e)', ctx);
assert(grid[grid.length - 1][3].startsWith('people/'), 'data-row edit is pushed');

vm.runInContext('removeSyncTriggers()', ctx);
assert.strictEqual(triggers.length, 0);

// 11. Values starting with "+" stay text, and a cell showing #ERROR! is
//     restored from its contact instead of being pushed to Contacts.
assert(grid.slice(1).every(r => !String(r[1]).startsWith('#') && !String(r[5]).startsWith('#')), 'no formula errors written');
const id3 = grid[3][3];
const phone3 = people.get(id3).person.phoneNumbers[0].value;
grid[3][1] = '#ERROR!';
run();
assert.strictEqual(people.get(id3).person.phoneNumbers[0].value, phone3, 'error value is not pushed');
assert.strictEqual(grid[3][1], phone3, 'row is restored from the contact');
const writes = clock;
run();
assert.strictEqual(clock, writes, 'restored row is not pushed again');

console.log('All 11 scenarios passed.');
