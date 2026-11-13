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
    if (current === generation) window.show(data);
  } catch {
    if (current === generation) window.show(null);
  }
});

// AI用の確認番号（4けた）。発行・状態・取消は本人の Google ログインのトークンを Worker に見せる（2026-11-13）
const AI_URL = 'https://hibiki-sync.jaykim-can.workers.dev/ai/';
window.hbAi = async (action, body) => {
  const user = auth.currentUser;
  if (!(user && user.uid === uid && user.emailVerified)) return { error: 'login' };
  const token = await user.getIdToken();
  const r = await fetch(AI_URL + action, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify(body || {}) });
  try { return await r.json(); } catch { return { error: 'net' }; }
};
