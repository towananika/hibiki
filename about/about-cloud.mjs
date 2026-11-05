import '../../triathlon/login/auth.js?v=0.28';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore, doc, getDocFromServer } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { makeCloudLegacyReader } from '../security/legacy-cloud-reader.mjs';

const uid = '3wzoIaBNjLf9x0BW3HRUcqOHCAG2', auth = getAuth(), db = getFirestore();
let generation = 0;
const reader = makeCloudLegacyReader({
  ownerUid: uid,
  currentUser: () => auth.currentUser,
  fetchArchive: async () => {
    const snapshot = await getDocFromServer(doc(db, 'hibikiPrivate', uid, 'archives', 'legacy-structured-2026-11-05'));
    return snapshot.exists() ? snapshot.data() : null;
  }
});
onAuthStateChanged(auth, async user => {
  const current = ++generation;
  reader.clear();
  window.show(null);
  try {
    let data = null;
    if (user && user.uid === uid && user.emailVerified) data = await reader.open('about');
    else if (!user && window.HibikiSync?.on()) data = await window.HibikiSync.open('about');
    if (current === generation) window.show(data);
  } catch {
    if (current === generation) window.show(null);
  }
});
