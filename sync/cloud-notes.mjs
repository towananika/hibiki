import '../../triathlon/login/auth.js?v=0.28';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore, doc, getDocFromServer } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { prepareArchive } from '../security/cloud-archive.mjs';

const uid = '3wzoIaBNjLf9x0BW3HRUcqOHCAG2', auth = getAuth(), db = getFirestore();
const $ = id => document.getElementById(id);
let entries = [], generation = 0;
function render() {
  const query = $('search').value.trim().toLocaleLowerCase();
  const results = entries.filter(entry => (entry.title + '\n' + entry.text).toLocaleLowerCase().includes(query));
  $('count').textContent = query ? `${results.length}件見つかりました` : `保存された記録 ${results.length}件`;
  const root = $('list'); root.replaceChildren();
  for (const entry of results) {
    const detail = document.createElement('details'), title = document.createElement('summary'), content = document.createElement('div');
    title.textContent = entry.title; content.textContent = entry.text; content.className = 'content';
    detail.append(title, content); root.append(detail);
  }
}
onAuthStateChanged(auth, async user => {
  const current = ++generation;
  entries = []; $('records').hidden = true; $('list').replaceChildren();
  $('login').hidden = !!user;
  if (!user) { $('status').textContent = 'Googleにログインしてください。'; return; }
  if (user.uid !== uid || !user.emailVerified) { $('status').textContent = 'このアカウントでは記録を開けません。'; return; }
  $('status').textContent = '記録を読み込んでいます…';
  try {
    const snap = await getDocFromServer(doc(db, 'hibikiPrivate', uid, 'archives', 'legacy-2026-11-03'));
    if (current !== generation) return;
    if (!snap.exists()) { $('status').textContent = 'クラウドにはまだ記録がありません。'; return; }
    const saved = snap.data(), checked = await prepareArchive(saved.archive);
    if (current !== generation) return;
    if (saved.format !== checked.format || saved.sha256 !== checked.sha256 || saved.entryCount !== checked.entryCount) throw new Error('invalid archive');
    entries = JSON.parse(saved.archive).entries; $('records').hidden = false; $('status').textContent = '本人の記録'; render();
  } catch { if (current === generation) $('status').textContent = '記録を確認できませんでした。通信や保存先の設定を確認してください。'; }
});
$('search').oninput = render;
$('login').onclick = () => window.triLogin('google').catch(() => { $('status').textContent = 'ログインできませんでした。'; });
