import { LEGACY_RECORDS } from './legacy-records.mjs';

function decodeBase64(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

// The private key remains in this browser and is never included in an archive.
export function makeLegacyOpener(storage, fetchFile = fetch) {
  return async name => {
    if (!LEGACY_RECORDS.includes(name)) throw new Error('invalid-record');
    const rawKey = storage.getItem('hb-key');
    if (!rawKey) throw new Error('legacy-key-unavailable');
    let jwk;
    try { jwk = JSON.parse(rawKey); } catch { throw new Error('legacy-key-invalid'); }
    const response = await fetchFile(new URL(`../private/${name}.json`, import.meta.url), { cache: 'no-store' });
    if (!response.ok) throw new Error('record-unavailable');
    const box = await response.json();
    if (!box || !box.epk || typeof box.iv !== 'string' || typeof box.ct !== 'string') throw new Error('invalid-record');
    const privateKey = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveKey']);
    const publicKey = await crypto.subtle.importKey('jwk', box.epk, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    const key = await crypto.subtle.deriveKey({ name: 'ECDH', public: publicKey }, privateKey, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decodeBase64(box.iv) }, key, decodeBase64(box.ct));
    return JSON.parse(new TextDecoder().decode(plaintext));
  };
}
