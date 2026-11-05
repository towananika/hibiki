import '../../triathlon/login/auth.js?v=0.28';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore, doc, getDocFromServer } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { prepareArchive } from '../security/cloud-archive.mjs';
import { previewBrowserRestore } from '../security/browser-snapshot.mjs';

const uid = '3wzoIaBNjLf9x0BW3HRUcqOHCAG2', auth = getAuth(), db = getFirestore();
const $ = id => document.getElementById(id);
let entries = [], archive = null, generation = 0;
function label(key) {
  if (key === 'mio-local-notes-v1') return 'メモ帳';
  if (/^hibiki-(budget|assets|charge|yen)/.test(key)) return '家計・資産';
  if (/^hibiki-(health|sleep)/.test(key)) return '健康・睡眠';
  if (/^hibiki-(study|macro)/.test(key)) return '勉強';
  if (/^hibiki-(people|love)/.test(key)) return '人間関係';
  if (/^hibiki-(dreams|plan|timeline)/.test(key)) return '夢・計画';
  if (/^hibiki-(vehicle|weather|home)/.test(key)) return '暮らし';
  return 'その他';
}
function readable(value) {
  try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; }
}
function compare() {
  if (!archive) return;
  const comparison = previewBrowserRestore(archive, localStorage);
  $('comparison').textContent = `このブラウザーとの差：未保存 ${comparison.add.length}種類、同じ ${comparison.identical.length}種類、内容が異なる ${comparison.conflicts.length}種類。`;
  const list = $('conflicts'); list.replaceChildren();
  for (const key of comparison.conflicts) {
    const entry = entries.find(item => item.title === key);
    const current = localStorage.getItem(key);
    if (!entry || current === null) continue;
    const item = document.createElement('li'), details = document.createElement('details'), title = document.createElement('summary');
    title.textContent = `${label(key)}（${key}）`;
    details.append(title);
    for (const [heading, value] of [['この端末', current], ['保管時点のバックアップ', entry.text]]) {
      const caption = document.createElement('strong'), content = document.createElement('div');
      caption.textContent = heading; content.className = 'content'; content.textContent = readable(value);
      details.append(caption, content);
    }
    item.append(details); list.append(item);
  }
  $('conflict-details').hidden = comparison.conflicts.length === 0;
}
function render() {
  const query = $('search').value.trim().toLocaleLowerCase();
  const results = entries.filter(entry => (label(entry.title) + '\n' + entry.title + '\n' + entry.text).toLocaleLowerCase().includes(query));
  $('count').textContent = query ? `${results.length}種類見つかりました` : `保管した記録 ${results.length}種類`;
  const root = $('list'); root.replaceChildren();
  for (const entry of results) {
    const detail = document.createElement('details'), title = document.createElement('summary'), content = document.createElement('div');
    title.textContent = `${label(entry.title)}（${entry.title}）`; content.textContent = entry.text; content.className = 'content';
    detail.append(title, content); root.append(detail);
  }
}
onAuthStateChanged(auth, async user => {
  const current = ++generation;
  entries = []; archive = null; $('records').hidden = true; $('list').replaceChildren(); $('comparison').textContent = ''; $('conflicts').replaceChildren(); $('conflict-details').hidden = true;
  $('login').hidden = !!user;
  if (!user) { $('status').textContent = 'Googleにログインしてください。'; return; }
  if (user.uid !== uid || !user.emailVerified) { $('status').textContent = 'このアカウントでは記録を開けません。'; return; }
  $('status').textContent = '保管した記録を確認しています…';
  try {
    const snap = await getDocFromServer(doc(db, 'hibikiPrivate', uid, 'archives', 'browser-2026-11-05'));
    if (current !== generation) return;
    if (!snap.exists()) { $('status').textContent = '端末のバックアップはまだありません。'; return; }
    const saved = snap.data(), checked = await prepareArchive(saved.archive);
    if (current !== generation) return;
    if (saved.format !== checked.format || saved.sha256 !== checked.sha256 || saved.entryCount !== checked.entryCount) throw new Error('invalid archive');
    entries = JSON.parse(saved.archive).entries; archive = saved.archive;
    compare();
    $('records').hidden = false; $('status').textContent = '本人のバックアップ'; render();
  } catch { if (current === generation) $('status').textContent = '記録を確認できませんでした。通信や保存先の設定を確認してください。'; }
});
$('search').oninput = render;
$('refresh').onclick = () => { try { compare(); } catch { $('comparison').textContent = '端末の記録を確認できませんでした。'; } };
$('login').onclick = () => window.triLogin('google').catch(() => { $('status').textContent = 'ログインできませんでした。'; });
$('export').onclick = () => {
  if (!archive || !confirm('暗号化されていないJSONファイルとして保存します。健康や家計などの個人情報が含まれます。続けますか？')) return;
  const url = URL.createObjectURL(new Blob([archive], {type:'application/json;charset=utf-8'}));
  const a = document.createElement('a'); a.href = url; a.download = 'hibiki-browser-backup.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
