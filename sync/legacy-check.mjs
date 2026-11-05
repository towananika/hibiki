import '../../triathlon/login/auth.js?v=0.28';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { prepareLegacyRecords } from '../security/legacy-records.mjs';
import { makeLegacyOpener } from '../security/legacy-decrypt.mjs';

const uid = '3wzoIaBNjLf9x0BW3HRUcqOHCAG2', auth = getAuth();
const $ = id => document.getElementById(id);
let generation = 0, owner = false, busy = false;
function refresh() {
  $('check').disabled = !owner || busy;
  $('login').hidden = !!auth.currentUser;
}
onAuthStateChanged(auth, user => {
  ++generation; owner = !!(user && user.uid === uid && user.emailVerified); busy = false;
  $('result').textContent = ''; $('unavailable').replaceChildren();
  $('status').textContent = !user ? 'Googleにログインしてください。' : owner ? '本人のアカウントを確認しました。' : 'このアカウントでは確認できません。';
  refresh();
});
$('login').onclick = () => window.triLogin('google').catch(() => { $('status').textContent = 'ログインできませんでした。'; });
$('check').onclick = async () => {
  if (!owner || busy) return;
  const current = generation;
  $('result').textContent = ''; $('unavailable').replaceChildren();
  if (!localStorage.getItem('hb-key')) { $('result').textContent = 'このブラウザーに旧記録の鍵が見つかりません。旧ログインを削除せず、移行方法を確認してください。'; return; }
  busy = true; refresh(); $('result').textContent = 'この端末で確認しています…';
  try {
    const result = await prepareLegacyRecords(makeLegacyOpener(localStorage));
    if (current !== generation) return;
    if (result.ok) $('result').textContent = `${result.entryCount}種類を読み取れました。まだクラウドには送っていません。`;
    else if (result.reason === 'too-large') $('result').textContent = '記録の容量が大きいため、そのままでは保管できません。分ける方法を検討します。';
    else {
      $('result').textContent = `${result.unavailable.length}種類を読み取れませんでした。記録は変更していません。`;
      for (const name of result.unavailable) { const item = document.createElement('li'); item.textContent = name; $('unavailable').append(item); }
    }
  } catch { if (current === generation) $('result').textContent = '確認できませんでした。記録は変更していません。'; }
  finally { if (current === generation) { busy = false; refresh(); } }
};
