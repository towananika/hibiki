import '../../triathlon/login/auth.js?v=0.28';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

const uid = '3wzoIaBNjLf9x0BW3HRUcqOHCAG2';
onAuthStateChanged(getAuth(), user => {
  const owner = !!(user && user.uid === uid && user.emailVerified);
  document.documentElement.classList.toggle('hb-owner', owner);
  document.documentElement.classList.add('hb-auth-done');
  const status = document.querySelector('#owner-gate p');
  if (status) status.textContent = user ? (owner ? '' : 'このアカウントでは響を開けません。') : '本人のGoogleアカウントでログインしてください。';
  const login = document.getElementById('login');
  if (login && owner) login.textContent = 'ログイン中';
});
// 確認中は何も出さない。5秒たっても答えがなければ入口を出す（2026-11-21）
setTimeout(() => document.documentElement.classList.add('hb-auth-done'), 5000);
