import '../../triathlon/login/auth.js?v=0.28';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore, doc, runTransaction, getDocFromServer } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { prepareLegacyRecords } from '../security/legacy-records.mjs';
import { makeLegacyOpener } from '../security/legacy-decrypt.mjs';
import { copyOnce } from '../security/cloud-archive.mjs';

const uid = '3wzoIaBNjLf9x0BW3HRUcqOHCAG2', auth = getAuth(), db = getFirestore();
const $ = id => document.getElementById(id);
let generation = 0, owner = false, busy = false, source = null;
function refresh() {
  $('check').disabled = !owner || busy;
  $('backup').disabled = !owner || busy || !source;
  $('login').hidden = !!auth.currentUser;
}
onAuthStateChanged(auth, user => {
  ++generation; owner = !!(user && user.uid === uid && user.emailVerified); busy = false; source = null;
  $('result').textContent = ''; $('backup-result').textContent = ''; $('unavailable').replaceChildren();
  $('status').textContent = !user ? 'Googleにログインしてください。' : owner ? '本人のアカウントを確認しました。' : 'このアカウントでは確認できません。';
  refresh();
});
$('login').onclick = () => window.triLogin('google').catch(() => { $('status').textContent = 'ログインできませんでした。'; });
$('check').onclick = async () => {
  if (!owner || busy) return;
  const current = generation;
  source = null; $('result').textContent = ''; $('backup-result').textContent = ''; $('unavailable').replaceChildren(); refresh();
  if (!localStorage.getItem('hb-key')) { $('result').textContent = 'このブラウザーに旧記録の鍵が見つかりません。旧ログインを削除せず、移行方法を確認してください。'; return; }
  busy = true; refresh(); $('result').textContent = 'この端末で確認しています…';
  try {
    const result = await prepareLegacyRecords(makeLegacyOpener(localStorage));
    if (current !== generation) return;
    if (result.ok) { source = result.archive; $('result').textContent = `${result.entryCount}種類を読み取れました。まだクラウドには送っていません。`; }
    else if (result.reason === 'too-large') $('result').textContent = '記録の容量が大きいため、そのままでは保管できません。分ける方法を検討します。';
    else {
      $('result').textContent = `${result.unavailable.length}種類を読み取れませんでした。記録は変更していません。`;
      for (const name of result.unavailable) { const item = document.createElement('li'); item.textContent = name; $('unavailable').append(item); }
    }
  } catch { if (current === generation) $('result').textContent = '確認できませんでした。記録は変更していません。'; }
  finally { if (current === generation) { busy = false; refresh(); } }
};
$('backup').onclick = async () => {
  if (!owner || busy || !source || auth.currentUser?.uid !== uid || !auth.currentUser.emailVerified) return;
  if (!confirm('旧記録15種類（健康・家計・夢・人間関係など）をGoogle Firebaseの本人専用領域へ送ります。Googleやプロジェクト管理者は技術上アクセスできる可能性があります。元の記録は残し、鍵は送りません。続けますか？')) return;
  const current = generation, expected = source;
  busy = true; refresh(); $('backup-result').textContent = '元の記録を再確認しています…';
  try {
    const latest = await prepareLegacyRecords(makeLegacyOpener(localStorage));
    if (current !== generation || !owner) return;
    if (!latest.ok || latest.archive !== expected) { source = null; $('backup-result').textContent = '記録が変わったか、読み取れませんでした。もう一度確認してください。'; return; }
    $('backup-result').textContent = '保管と照合をしています…';
    const ref = doc(db, 'hibikiPrivate', uid, 'archives', 'legacy-structured-2026-11-05');
    const result = await copyOnce(expected, {
      createOnce: data => runTransaction(db, async tx => { const existing = await tx.get(ref); if (existing.exists()) return 'exists'; tx.set(ref, data); return 'created'; }),
      read: async () => { const snap = await getDocFromServer(ref); return snap.exists() ? snap.data() : null; }
    });
    if (current === generation) $('backup-result').textContent = `${result.entryCount}種類を読み戻し、一致を確認しました。元の記録は残っています。`;
  } catch (error) {
    if (current === generation) $('backup-result').textContent = error.message === 'verification-failed' ? '保存済みの内容が異なるか、読み戻せませんでした。上書きはしていません。' : '保管または照合ができませんでした。保存先や通信状態を確認してください。';
  } finally { if (current === generation) { busy = false; refresh(); } }
};
