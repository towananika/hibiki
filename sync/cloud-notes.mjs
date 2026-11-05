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
    const source = document.createElement('small'); source.textContent = entry.sources.join('・');
    detail.append(title, source, content); root.append(detail);
  }
}
async function readArchive(id, source) {
  const snap = await getDocFromServer(doc(db, 'hibikiPrivate', uid, 'archives', id));
  if (!snap.exists()) throw new Error('missing archive');
  const saved = snap.data(), checked = await prepareArchive(saved.archive);
  if (saved.format !== checked.format || saved.sha256 !== checked.sha256 || saved.entryCount !== checked.entryCount) throw new Error('invalid archive');
  const data = JSON.parse(saved.archive);
  if (source === '端末バックアップ' && (data.kind !== 'hibiki-browser-snapshot' || data.version !== 1)) throw new Error('invalid snapshot');
  if (source === '旧ページの記録' && (data.kind !== 'hibiki-legacy-records' || data.version !== 1)) throw new Error('invalid legacy archive');
  return data.entries.map(entry => ({ title: entry.title, text: entry.text, source }));
}
onAuthStateChanged(auth, async user => {
  const current = ++generation;
  entries = []; $('records').hidden = true; $('list').replaceChildren();
  $('login').hidden = !!user;
  if (!user) { $('status').textContent = 'Googleにログインしてください。'; return; }
  if (user.uid !== uid || !user.emailVerified) { $('status').textContent = 'このアカウントでは記録を開けません。'; return; }
  $('status').textContent = '記録を読み込んでいます…';
  try {
    const results = await Promise.allSettled([
      readArchive('legacy-2026-11-03', '個人メモ'),
      readArchive('browser-2026-11-05', '端末バックアップ'),
      readArchive('legacy-structured-2026-11-05', '旧ページの記録')
    ]);
    if (current !== generation) return;
    const unique = new Map();
    for (const result of results) {
      if (result.status !== 'fulfilled') continue;
      for (const entry of result.value) {
        const identity = JSON.stringify([entry.title, entry.text]);
        const existing = unique.get(identity);
        if (existing) existing.sources.push(entry.source);
        else unique.set(identity, { title: entry.title, text: entry.text, sources: [entry.source] });
      }
    }
    const failed = results.map((result, index) => result.status === 'rejected' ? ['個人メモ', '端末バックアップ', '旧ページの記録'][index] : null).filter(Boolean);
    if (failed.length === results.length) throw new Error('archives unavailable');
    entries = [...unique.values()]; $('records').hidden = false;
    $('status').textContent = failed.length ? `${failed.join('・')}を読み込めませんでした。表示は一部のみです。` : '本人の記録';
    render();
  } catch { if (current === generation) $('status').textContent = '記録を確認できませんでした。通信や保存先の設定を確認してください。'; }
});
$('search').oninput = render;
$('login').onclick = () => window.triLogin('google').catch(() => { $('status').textContent = 'ログインできませんでした。'; });
