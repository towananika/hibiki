const MAX_BYTES = 700000;
export async function prepareArchive(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > MAX_BYTES) throw new Error('invalid-size');
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('invalid-json'); }
  if (!data || !Array.isArray(data.entries)) throw new Error('invalid-archive');
  const names = new Set();
  for (const entry of data.entries) {
    if (!entry || typeof entry.title !== 'string' || !entry.title.trim() || typeof entry.text !== 'string' || names.has(entry.title)) throw new Error('invalid-entry');
    names.add(entry.title);
  }
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  const sha256 = [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  return { archive: text, sha256, entryCount: data.entries.length, format: 'hibiki-archive-v1' };
}

export async function copyOnce(sourceText, store) {
  const prepared = await prepareArchive(sourceText);
  const status = await store.createOnce(prepared);
  const restored = await store.read();
  if (!restored || restored.archive !== prepared.archive || restored.sha256 !== prepared.sha256 || restored.entryCount !== prepared.entryCount || restored.format !== prepared.format) {
    throw new Error('verification-failed');
  }
  return { status, entryCount: prepared.entryCount };
}
