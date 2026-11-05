import { prepareArchive } from './cloud-archive.mjs';
import { createLegacyRecordReader } from './legacy-records.mjs';

// Firestore security rules remain the access boundary; this check also avoids
// showing cached private data after sign-out or an account change.
export function makeCloudLegacyReader({ currentUser, fetchArchive, ownerUid }) {
  let cached = null, generation = 0;
  function isOwner(user) { return !!(user && user.uid === ownerUid && user.emailVerified); }
  function clear() { cached = null; generation++; }
  async function open(name) {
    if (!isOwner(currentUser())) { clear(); return null; }
    const started = generation;
    if (!cached) {
      const saved = await fetchArchive();
      if (!isOwner(currentUser()) || started !== generation) return null;
      if (!saved) return null;
      const checked = await prepareArchive(saved.archive);
      if (!isOwner(currentUser()) || started !== generation) return null;
      if (saved.format !== checked.format || saved.sha256 !== checked.sha256 || saved.entryCount !== checked.entryCount) throw new Error('invalid-archive');
      cached = createLegacyRecordReader(saved.archive);
    }
    const value = await cached(name);
    if (!isOwner(currentUser()) || started !== generation) return null;
    return value;
  }
  return { open, clear };
}
