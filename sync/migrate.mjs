import '../../triathlon/login/auth.js?v=0.28';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore, doc, runTransaction, getDocFromServer } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { prepareArchive, copyOnce } from '../security/cloud-archive.mjs';

const ownerUid = '3wzoIaBNjLf9x0BW3HRUcqOHCAG2';
const auth = getAuth(), db = getFirestore();
const $ = id => document.getElementById(id);
let source = null;
function owner(user) { return !!(user && user.uid === ownerUid && user.emailVerified); }
function refresh(user) {
  $('login').hidden = !!user;
  $('migration').hidden = !owner(user);
  $('status').textContent = !user ? 'Googleにログインしてください。' : owner(user) ? 'ひびきのアカウントを確認しました。' : 'このアカウントでは移行できません。';
  if (!owner(user)) { source = null; $('archive').value = ''; $('start').disabled = true; }
}
onAuthStateChanged(auth, refresh);
$('login').onclick = () => window.triLogin('google').catch(() => { $('message').textContent = 'ログインできませんでした。'; });
$('archive').onchange = async () => {
  source = null; $('start').disabled = true; $('message').textContent = '';
  const file = $('archive').files[0];
  if (!file || file.size > 700000) { $('file-status').textContent = 'ファイルがないか、サイズが大きすぎます。'; return; }
  try { const text = await file.text(), parsed = await prepareArchive(text); source = text; $('file-status').textContent = `${parsed.entryCount}件の記録を確認しました。`; $('start').disabled = false; }
  catch { $('file-status').textContent = '記録ファイルを読み込めませんでした。'; }
};
$('start').onclick = async () => {
  if (!owner(auth.currentUser) || !source) return;
  if (!confirm('健康・お金・人間関係を含む記録をFirebaseの本人専用領域へ送ります。Google側の管理者はアクセスできる可能性があります。続けますか？')) return;
  $('start').disabled = true; $('message').textContent = '移行と照合をしています…';
  try {
    const ref = doc(db, 'hibikiPrivate', ownerUid, 'archives', 'legacy-2026-11-03');
    const result = await copyOnce(source, {
      createOnce: data => runTransaction(db, async transaction => {
        const existing = await transaction.get(ref);
        if (existing.exists()) return 'exists';
        transaction.set(ref, data); return 'created';
      }),
      read: async () => { const result = await getDocFromServer(ref); return result.exists() ? result.data() : null; }
    });
    $('message').textContent = `${result.entryCount}件の記録をクラウドから読み戻し、一致を確認しました。元の記録は残っています。`;
  } catch (error) {
    $('message').textContent = error.message === 'verification-failed' ? '保存済みの記録が選択したファイルと異なるか、照合できませんでした。上書きはしていません。' : '移行できませんでした。ログイン、通信、保存先の設定を確認してください。';
  } finally { $('start').disabled = !source; }
};
