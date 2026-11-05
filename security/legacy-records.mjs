// Names correspond to existing encrypted records, not arbitrary paths.
export const LEGACY_RECORDS = Object.freeze([
  'about', 'allergy', 'budget-additions', 'dreams', 'home',
  'housing', 'housing-loan-20261028', 'money',
  'parking-tickets-20261027', 'personal-notes', 'plan',
  'priority', 'timeline', 'vehicle', 'wishlist-20261027'
]);

// Produces an archive in memory only. Missing or invalid files abort the operation.
export async function prepareLegacyRecords(open, names = LEGACY_RECORDS) {
  if (typeof open !== 'function' || !Array.isArray(names) || !names.length || new Set(names).size !== names.length || names.some(name => !LEGACY_RECORDS.includes(name))) {
    throw new Error('invalid-record-selection');
  }
  const entries = [];
  const failures = [];
  for (const name of names) {
    try {
      const value = await open(name);
      if (value === null || value === undefined) throw new Error('unavailable');
      const text = JSON.stringify(value);
      if (typeof text !== 'string' || JSON.stringify(JSON.parse(text)) !== text) throw new Error('invalid');
      entries.push({ title: name, text });
    } catch {
      failures.push(name);
    }
  }
  if (failures.length) return { ok: false, unavailable: failures };
  const archive = JSON.stringify({ version: 1, kind: 'hibiki-legacy-records', entries });
  if (new TextEncoder().encode(archive).length > 700000) return { ok: false, unavailable: [], reason: 'too-large' };
  return { ok: true, archive, entryCount: entries.length };
}

// Callers must authenticate and verify the archive hash before using this reader.
export function createLegacyRecordReader(archive) {
  let data;
  try { data = JSON.parse(archive); } catch { throw new Error('invalid-archive'); }
  if (!data || data.version !== 1 || data.kind !== 'hibiki-legacy-records' || !Array.isArray(data.entries) || !data.entries.length) throw new Error('invalid-archive');
  const records = new Map();
  for (const entry of data.entries) {
    if (!entry || !LEGACY_RECORDS.includes(entry.title) || records.has(entry.title) || typeof entry.text !== 'string') throw new Error('invalid-archive');
    try { records.set(entry.title, JSON.parse(entry.text)); } catch { throw new Error('invalid-archive'); }
  }
  return async name => records.has(name) ? structuredClone(records.get(name)) : null;
}
