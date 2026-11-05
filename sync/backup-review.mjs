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
  entries = []; archive = null; $('records').hidden = true; $('list').replaceChildren(); $('comparison').textContent = '';
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
    const comparison = previewBrowserRestore(saved.archive, localStorage);
    entries = JSON.parse(saved.archive).entries; archive = saved.archive;
    $('comparison').textContent = `このブラウザーとの差：未保存 ${comparison.add.length}種類、同じ ${comparison.identical.length}種類、内容が異なる ${comparison.conflicts.length}種類。`;
    $('records').hidden = false; $('status').textContent = '本人のバックアップ'; render();
  } catch { if (current === generation) $('status').textContent = '記録を確認できませんでした。通信や保存先の設定を確認してください。'; }
});
$('search').oninput = render;
$('login').onclick = () => window.triLogin('google').catch(() => { $('status').textContent = 'ログインできませんでした。'; });
$('export').onclick = () => {
  if (!archive || !confirm('暗号化されていないJSONファイルとして保存します。健康や家計などの個人情報が含まれます。続けますか？')) return;
  const url = URL.createObjectURL(new Blob([archive], {type:'application/json;charset=utf-8'}));
  const a = document.createElement('a'); a.href = url; a.download = 'hibiki-browser-backup.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
