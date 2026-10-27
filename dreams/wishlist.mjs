import {amount, remaining, safeSource} from './wishlist-model.mjs';
const container = document.getElementById('purchases');
const KEY = 'mio-wishlist-settings-v1', root = document.getElementById('wishlist-list'), status = document.getElementById('wishlist-status');
let data = null, filter = 'purchase', edits = {}, readable = true;
try { edits = JSON.parse(localStorage.getItem(KEY) || '{}'); if (!edits || typeof edits !== 'object' || Array.isArray(edits)) throw Error(); }
catch { readable = false; edits = {}; }
const el = (tag, text, cls) => { const n = document.createElement(tag); if (text != null) n.textContent = text; if (cls) n.className = cls; return n; };
function field(form, title, name, type, value) {
  const label = el('label', title), input = document.createElement('input'); input.name = name; input.type = type; input.value = value ?? '';
  if (type === 'number') { input.min = '0'; input.step = '1'; input.inputMode = 'numeric'; input.placeholder = '未定'; }
  label.append(input); form.append(label); return input;
}
function select(form, title, name, values, value) {
  const label = el('label', title), input = document.createElement('select'); input.name = name;
  for (const [key, text] of values) { const option = el('option', text); option.value = key; input.append(option); }
  input.value = value || ''; label.append(input); form.append(label); return input;
}
function render() {
  root.replaceChildren(); if (!data) return;
  for (const item of data.items.filter(i => filter === 'all' || i.kind === filter)) {
    const edit = edits[item.id] || {}, card = el('article');
    card.append(el('p', item.kind === 'service' ? '継続費用のあるサービス' : '購入品', 'kind'), el('h2', item.title), el('p', item.wish), el('p', item.price, 'price'), el('p', item.priceType, 'sub'));
    if (item.checked) card.append(el('p', '資料に記載された確認日：' + item.checked + '（登録時は未再確認）', 'sub'));
    const form = document.createElement('form'), fields = el('div', null, 'fields');
    const unit = select(fields, '入力する金額の通貨', 'currency', [['KRW','ウォン'],['JPY','円'],['USD','米ドル']], edit.currency || 'KRW');
    const priority = select(fields, '優先度', 'priority', [['','未設定'],['first','先に考える'],['later','温めておく']], edit.priority);
    const budget = field(fields, item.kind === 'service' ? '月額の予算上限' : '総額の予算', 'budget', 'number', edit.budget);
    const saved = item.kind !== 'service' ? field(fields, '用意できている金額', 'saved', 'number', edit.saved) : null;
    field(fields, '考えたい時期（任意）', 'deadline', 'date', edit.deadline);
    const state = select(fields, 'いまの状態', 'state', [['','検討中'],['hold','温めておく'],['done',item.kind === 'service' ? '契約済み' : '購入済み']], edit.state);
    form.append(fields);
    const result = el('p', '', 'remaining');
    function update() {
      try { const rest = remaining(amount(budget.value), saved ? amount(saved.value) : null); result.textContent = saved ? rest == null ? 'あと必要な金額：未算定' : '予算まであと ' + rest.toLocaleString('ja-JP') + ' ' + unit.value : '月額の予算です。API等の追加費用は別途確認。'; }
      catch (e) { result.textContent = e.message; }
    }
    form.oninput = update; update(); form.append(result);
    const save = el('div', null, 'save'), button = el('button', '保存'), message = el('span', '', 'sub'); button.type = 'submit'; message.setAttribute('role', 'status'); save.append(button, message); form.append(save);
    form.onsubmit = event => {
      event.preventDefault(); if (!readable) { message.textContent = '既存データ保護のため保存を停止しています。'; return; }
      try {
        const next = {...edits, [item.id]:{currency:unit.value, priority:priority.value, budget:amount(budget.value), saved:saved ? amount(saved.value) : null, deadline:new FormData(form).get('deadline'), state:state.value}};
        localStorage.setItem(KEY, JSON.stringify(next)); edits = next; message.textContent = 'このブラウザに保存しました。';
      } catch (e) { message.textContent = e.message === '金額は0以上の整数で入力してください。' ? e.message : '保存できませんでした。'; }
    };
    card.append(form);
    const detail = document.createElement('details'), summary = el('summary', '希望・参考情報・具体化の仮案'), ul = document.createElement('ul'); detail.append(summary, ul);
    for (const text of item.details) ul.append(el('li', text));
    const sources = el('div', null, 'sources');
    for (const source of item.sources) { const url = safeSource(source.url); if (!url) continue; const a = el('a', source.label); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; sources.append(a); }
    detail.append(sources, el('p', '次の一歩（仮案）：' + item.next, 'next')); card.append(detail); root.append(card);
  }
}
container.querySelectorAll('[data-filter]').forEach(button => button.onclick = () => {
  if ([...root.querySelectorAll('form')].some(form => form.dataset.dirty === 'true') && !confirm('未保存の編集を破棄して切り替えますか？')) return;
  filter = button.dataset.filter; container.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b === button))); render();
});
root.addEventListener('input', event => { const form = event.target.closest('form'); if (form) form.dataset.dirty = 'true'; });
root.addEventListener('submit', event => { if (event.target.querySelector('[role=status]').textContent.includes('保存しました')) event.target.dataset.dirty = 'false'; });
try {
  data = await window.HibikiSync?.open('wishlist-20261027');
  if (!data || !Array.isArray(data.items)) { status.textContent = 'リストを開けませんでした。ログインを確認してください。'; }
  else { document.getElementById('wishlist-notice').textContent = data.notice; status.textContent = readable ? '' : '編集データを読み込めませんでした。上書きは行いません。'; render(); }
} catch { status.textContent = 'リストを読み込めませんでした。ログインを確認して再読み込みしてください。'; }
