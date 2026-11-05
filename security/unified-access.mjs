import '../../triathlon/login/auth.js?v=0.28';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore, doc, getDocFromServer } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { makeCloudLegacyReader } from './legacy-cloud-reader.mjs';

const uid = '3wzoIaBNjLf9x0BW3HRUcqOHCAG2';
const auth = getAuth(), db = getFirestore();
const isOwner = user => !!(user && user.uid === uid && user.emailVerified);
let version = 0, resolveReady, statusText = 'ログインを確認しています…';
function showStatus(text) {
  statusText = text;
  const status = document.getElementById('hb-gate-status');
  if (status) status.textContent = statusText;
}
document.addEventListener('DOMContentLoaded', () => showStatus(statusText));
const ready = new Promise(resolve => { resolveReady = resolve; });
const reader = makeCloudLegacyReader({
  ownerUid: uid,
  currentUser: () => auth.currentUser,
  fetchArchive: async () => {
    const snapshot = await getDocFromServer(doc(db, 'hibikiPrivate', uid, 'archives', 'legacy-structured-2026-11-05'));
    return snapshot.exists() ? snapshot.data() : null;
  }
});

onAuthStateChanged(auth, user => {
  version++;
  reader.clear();
  document.documentElement.classList.toggle('hb-google-owner', isOwner(user));
  showStatus(user ? 'このアカウントでは響を開けません。' : '本人のGoogleアカウントでログインしてください。');
  resolveReady();
}, () => {
  version++;
  reader.clear();
  document.documentElement.classList.remove('hb-google-owner');
  showStatus('ログインを確認できませんでした。再読み込みしてください。');
  resolveReady();
});

window.hbRegisterGoogleAccess({
  async open(name, legacyOpen) {
    await ready;
    if (!isOwner(auth.currentUser)) return null;
    const started = version;
    try {
      const local = await legacyOpen(name);
      if (started !== version || !isOwner(auth.currentUser)) return null;
      if (local) return local;
      const value = await reader.open(name);
      return started === version && isOwner(auth.currentUser) ? value : null;
    } catch {
      return null;
    }
  }
});
