import '../../triathlon/login/auth.js?v=0.28';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore, doc, runTransaction, getDocFromServer } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { copyOnce, prepareArchive } from '../security/cloud-archive.mjs';
import { snapshotBrowserRecords } from '../security/browser-snapshot.mjs';

const uid = '3wzoIaBNjLf9x0BW3HRUcqOHCAG2', auth = getAuth(), db = getFirestore();
const $ = id => document.getElementById(id);
function isOwner(user) { return !!(user && user.uid === uid && user.emailVerified); }
onAuthStateChanged(auth, user => {
  $('backup-login').hidden = !!user;
  $('backup').disabled = !isOwner(user);
  $('backup-status').textContent = !user ? 'Googleにログインしてください。' : isOwner(user) ? 'ひびきのアカウントを確認しました。' : 'このアカウントでは保管できません。';
});
$('backup-login').onclick = () => window.triLogin('google').catch(() => { $('backup-message').textContent = 'ログインできませんでした。'; });
$('backup').onclick = async () => {
  if (!isOwner(auth.currentUser)) return;
  let source, prepared;
  try { source = snapshotBrowserRecords(localStorage); prepared = await prepareArchive(source); }
  catch { $('backup-message').textContent = 'この端末の記録を確認できませんでした。'; return; }
  if (!prepared.entryCount) { $('backup-message').textContent = 'このブラウザーに対象の記録はありません。'; return; }
  if (!confirm(`${prepared.entryCount}種類の記録をFirebaseへ送ります。健康やお金などの個人情報が含まれ、Googleや管理者が技術上アクセスできる可能性があります。続けますか？`)) return;
  $('backup').disabled = true; $('backup-message').textContent = '保管と照合をしています…';
  try {
    const ref = doc(db, 'hibikiPrivate', uid, 'archives', 'browser-2026-11-05');
    const result = await copyOnce(source, {
      createOnce: data => runTransaction(db, async tx => { const existing = await tx.get(ref); if (existing.exists()) return 'exists'; tx.set(ref, data); return 'created'; }),
      read: async () => { const snap = await getDocFromServer(ref); return snap.exists() ? snap.data() : null; }
    });
    $('backup-message').textContent = `${result.entryCount}種類の記録を読み戻し、一致を確認しました。元の記録は残っています。`;
  } catch (error) {
    $('backup-message').textContent = error.message === 'verification-failed' ? '保存済みの内容と異なるか、照合できませんでした。上書きはしていません。' : '保管できませんでした。ログイン、通信、保存先の設定を確認してください。';
  } finally { $('backup').disabled = !isOwner(auth.currentUser); }
};
