/**
 * Reading and writing Google Contacts through the People API advanced service.
 *
 * Contacts are converted to the same shape the sheet uses:
 *   { id, name, phone, email, deleted }
 * Only the first phone number and email are synced; any others a contact has
 * are kept untouched when the sheet updates it.
 */

/** Creates a contact and returns its resourceName. */
function createContact_(contact) {
  const person = People.People.createContact(toPerson_(contact, {}), {
    personFields: CONFIG.UPDATE_FIELDS,
  });
  return person.resourceName;
}

/** Updates an existing contact's name, first phone number and first email. */
function updateContact_(resourceName, contact) {
  // The People API rejects updates without the contact's current etag.
  const current = People.People.get(resourceName, { personFields: CONFIG.UPDATE_FIELDS });
  const person = toPerson_(contact, current);
  person.etag = current.etag;
  People.People.updateContact(person, resourceName, {
    updatePersonFields: CONFIG.UPDATE_FIELDS,
  });
}

/** Converts a People API person into a contact record. */
function fromPerson_(person) {
  const name = first_(person.names);
  return {
    id: person.resourceName,
    name: name ? (name.displayName || name.unstructuredName || '').trim() : '',
    phone: valueOf_(first_(person.phoneNumbers)),
    email: valueOf_(first_(person.emailAddresses)),
    deleted: Boolean(person.metadata && person.metadata.deleted),
  };
}

/** Builds the People API person body for a contact, keeping `current`'s extra numbers and emails. */
function toPerson_(contact, current) {
  const parts = contact.name.split(/\s+/);
  return {
    names: contact.name ? [{ givenName: parts.shift(), familyName: parts.join(' ') }] : [],
    phoneNumbers: withPrimary_(current.phoneNumbers, contact.phone, 'mobile'),
    emailAddresses: withPrimary_(current.emailAddresses, contact.email, 'home'),
  };
}

/** Replaces the first entry of a phone/email list, or drops it if `value` is empty. */
function withPrimary_(list, value, defaultType) {
  const existing = (list || []).map(item => ({ value: item.value, type: item.type }));
  const firstEntry = existing.shift();
  if (!value) return existing;
  return [{ value, type: (firstEntry && firstEntry.type) || defaultType }].concat(existing);
}

function first_(list) {
  return list && list.length ? list[0] : null;
}

function valueOf_(item) {
  return item && item.value ? String(item.value).trim() : '';
}
