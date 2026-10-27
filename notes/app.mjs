import {organize, consultation, sections} from './organize.mjs';
const $ = id => document.getElementById(id);
// Deliberately outside hibiki-* so the legacy cloud sync never uploads notes.
const KEY = 'mio-local-notes-v1';
let notes = [], current = null, dirty = false, timer, composing = false, storageReadable = true;
const selected = new Set();
try {
  const stored = JSON.parse(localStorage.getItem(KEY) || '[]');
  if (!Array.isArray(stored) || stored.some(n => !n || typeof n.id !== 'string' || typeof n.text !== 'string')) throw Error();
  notes = stored;
} catch { storageReadable = false; $('save-status').textContent = '保存データを読み込めませんでした。上書きせず、書き出しを使ってください。'; }
function message(text) { $('save-status').textContent = text; }
function renderSummary() {
  const grouped = organize($('text').value), root = $('summary'); root.replaceChildren();
  for (const heading of sections) {
    if (!grouped[heading].length) continue;
    const section = document.createElement('section'), h = document.createElement('h3'), ul = document.createElement('ul');
    h.textContent = heading; h.style.fontSize = '15px'; section.append(h, ul);
    for (const text of grouped[heading]) { const li = document.createElement('li'); li.textContent = text; ul.append(li); }
    root.append(section);
  }
  if (!root.children.length) { const p = document.createElement('p'); p.className = 'empty'; p.textContent = 'まだメモはありません。'; root.append(p); }
}
function canLeave() { return !dirty || confirm('未保存の変更があります。破棄して進みますか？'); }
function renderList() {
  const root = $('note-list'); root.replaceChildren();
  for (const n of notes) {
    const row = document.createElement('div'); row.className = 'note-row';
    const check = document.createElement('input'); check.type = 'checkbox'; check.checked = selected.has(n.id); check.setAttribute('aria-label', '相談に選ぶ：' + n.text.slice(0, 35));
    check.onchange = () => check.checked ? selected.add(n.id) : selected.delete(n.id);
    const title = document.createElement('button'); title.className = 'note-title'; title.textContent = n.text.split('\n')[0] || 'メモ';
    title.onclick = () => { if (!canLeave()) return; current = n.id; $('text').value = n.text; dirty = false; message('保存済み'); renderSummary(); };
    const time = document.createElement('time'); time.className = 'small'; time.textContent = new Date(n.updated).toLocaleDateString('ja-JP');
    const del = document.createElement('button'); del.textContent = '削除'; del.onclick = () => {
      if (!confirm('このメモを削除しますか？')) return;
      const next = notes.filter(x => x.id !== n.id);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { message('削除を保存できませんでした。'); return; }
      notes = next; selected.delete(n.id);
      if (current === n.id) { current = null; $('text').value = ''; dirty = false; renderSummary(); }
      renderList(); message('削除しました。');
    };
    row.append(check, title, time, del); root.append(row);
  }
  if (!notes.length) root.textContent = '保存したメモはありません。';
}
$('text').addEventListener('compositionstart', () => composing = true);
$('text').addEventListener('compositionend', () => { composing = false; renderSummary(); });
$('text').addEventListener('input', () => { dirty = true; message('未保存'); clearTimeout(timer); if (!composing) timer = setTimeout(renderSummary, 350); });
$('save').onclick = () => {
  if (!storageReadable) { message('既存データを保護するため保存を停止しています。書き出しを使ってください。'); return; }
  const text = $('text').value; if (!text.trim()) { message('メモを入力してください。'); return; }
  const n = {id: current || crypto.randomUUID(), text, updated: new Date().toISOString()};
  const next = [n, ...notes.filter(x => x.id !== n.id)];
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { message('保存できませんでした。書き出しでメモを残してください。'); return; }
  notes = next; current = n.id; dirty = false; renderList(); message('このブラウザに保存しました。');
};
$('new').onclick = () => { if (!canLeave()) return; current = null; $('text').value = ''; dirty = false; message(''); renderSummary(); $('text').focus(); };
function consultationNotes() {
  const chosen = notes.filter(n => selected.has(n.id) && n.id !== current);
  if ($('text').value.trim()) chosen.push({text: $('text').value});
  return chosen;
}
function updatePrompt() { try { $('prompt').value = consultation(consultationNotes(), $('question').value); } catch { $('prompt').value = ''; } }
$('consult').onclick = () => {
  if (!consultationNotes().length) { message('メモを入力するか、保存したメモを選んでください。'); return; }
  updatePrompt(); $('chat-status').textContent = ''; $('dialog').showModal();
};
$('question').oninput = updatePrompt;
$('close').onclick = () => $('dialog').close();
$('copy').onclick = async () => { try { await navigator.clipboard.writeText($('prompt').value); $('chat-status').textContent = 'コピーしました。チャットに貼り付けて送信できます。'; } catch { $('prompt').focus(); $('prompt').select(); $('chat-status').textContent = 'コピーできませんでした。表示した相談文を選択してコピーしてください。'; } };
$('export').onclick = () => {
  const all = [...notes.filter(n => n.id !== current)]; if ($('text').value.trim()) all.push({text: $('text').value});
  if (!all.length) { message('書き出すメモがありません。'); return; }
  const url = URL.createObjectURL(new Blob([all.map(n => n.text).join('\n\n---\n\n')], {type:'text/plain;charset=utf-8'}));
  const a = document.createElement('a'); a.href = url; a.download = 'mio-notes.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
renderSummary(); renderList();
