// Snapshot user records only. Authentication material is deliberately excluded.
export function snapshotBrowserRecords(storage) {
  const keys = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && key !== 'hibiki-keywrap' && (key.startsWith('hibiki-') || key === 'mio-local-notes-v1')) keys.push(key);
  }
  keys.sort();
  const entries = keys.map(key => {
    const value = storage.getItem(key);
    if (typeof value !== 'string') throw new Error('storage-changed');
    return { title: key, text: value };
  });
  return JSON.stringify({ version: 1, kind: 'hibiki-browser-snapshot', entries });
}

// A future restore must resolve every conflict explicitly before writing.
export function previewBrowserRestore(snapshot, storage) {
  let data;
  try { data = JSON.parse(snapshot); } catch { throw new Error('invalid-snapshot'); }
  if (!data || data.version !== 1 || data.kind !== 'hibiki-browser-snapshot' || !Array.isArray(data.entries)) throw new Error('invalid-snapshot');
  const result = { add: [], identical: [], conflicts: [] }, seen = new Set();
  for (const entry of data.entries) {
    const key = entry && entry.title;
    if (typeof key !== 'string' || key === 'hibiki-keywrap' || !(key.startsWith('hibiki-') || key === 'mio-local-notes-v1') || typeof entry.text !== 'string' || seen.has(key)) throw new Error('invalid-entry');
    seen.add(key);
    const current = storage.getItem(key);
    if (current === null) result.add.push(key);
    else if (current === entry.text) result.identical.push(key);
    else result.conflicts.push(key);
  }
  return result;
}
