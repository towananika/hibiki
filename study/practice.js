(function () {
  'use strict';
  var KEY = 'hibiki-study-recall-v1', SOUND = 'hibiki-study-sound-v1', state = {}, sound = false, context;
  var questions = [], panel, result, review, active = false, storageFailed = false;
  var lesson = (new URLSearchParams(location.search).get('n') || '').replace(/[^a-z0-9-]/g, '');
  try { var saved = JSON.parse(localStorage.getItem(KEY)); if (saved && saved.version === 1 && saved.records && typeof saved.records === 'object' && !Array.isArray(saved.records)) state = saved.records; } catch (e) {}
  try { sound = localStorage.getItem(SOUND) === 'true'; } catch (e) {}
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify({ version: 1, records: state })); storageFailed = false; }
    catch (e) { storageFailed = true; }
  }
  function fingerprint(q) {
    var text = q.querySelector('legend').textContent + '\n' + q.querySelector('.choices').textContent + '\n' + q.dataset.correct + '\n' + q.querySelector('.explanation').textContent;
    var hash = 2166136261;
    for (var i = 0; i < text.length; i++) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return lesson + ':' + (hash >>> 0).toString(36);
  }
  function read(q) { return state[q.dataset.recallKey]; }
  function soundLabel() {
    var button = panel.querySelector('.practice-sound');
    if (!window.AudioContext && !window.webkitAudioContext) { button.textContent = 'この端末では音を使えません'; button.disabled = true; return; }
    button.textContent = sound ? '正解の音：オン' : '正解の音：オフ';
    button.setAttribute('aria-pressed', String(sound));
  }
  function feedback(correct) {
    if (!correct || !sound) return;
    try {
      var Audio = window.AudioContext || window.webkitAudioContext; if (!Audio) return;
      if (!context) context = new Audio();
      if (context.state === 'suspended') context.resume().catch(function () {});
      [660, 880].forEach(function (frequency, i) {
        var oscillator = context.createOscillator(), gain = context.createGain(), start = context.currentTime + i * 0.09;
        oscillator.type = 'sine'; oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(0.04, start + 0.01); gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);
        oscillator.connect(gain); gain.connect(context.destination); oscillator.start(start); oscillator.stop(start + 0.13);
      });
    } catch (e) { /* 音が使えなくても、回答と復習は続けられる。 */ }
  }
  function reset(q) {
    q.removeAttribute('data-answered');
    q.querySelectorAll('.choice').forEach(function (b) { b.disabled = false; b.classList.remove('is-correct', 'is-wrong'); });
    ['.feedback', '.explanation', '.retry'].forEach(function (s) { q.querySelector(s).hidden = true; });
    var note = q.querySelector('.recall-note'); if (note) note.remove();
  }
  // 練習問題をすべて一度は正解したら、その講を「学習済み」にする（勉強トップの講タイルが塗られる）
  var SOLVED = 'hibiki-study-solved-v1';
  function allSolved() { return questions.length > 0 && questions.every(function (q) { var r = read(q); return r && (r.everCorrect || r.firstCorrect); }); }
  function markSolved() {
    if (!lesson || !allSolved()) return;
    try { var m = JSON.parse(localStorage.getItem(SOLVED)) || {}; if (!m[lesson]) { m[lesson] = Date.now(); localStorage.setItem(SOLVED, JSON.stringify(m)); } } catch (e) {}
  }
  function update() {
    if (!panel) return;
    var summary = StudyRecall.summarize(questions.map(read), Date.now());
    panel.querySelector('.practice-progress').textContent = summary.answered + ' / ' + questions.length + '問に回答';
    if (allSolved()) { markSolved(); result.querySelector('.practice-first').textContent = '✓ 全問正解。この講は学習済みです。'; } else result.querySelector('.practice-first').textContent = summary.answered ? '最初の回答で正解：' + summary.firstCorrect + ' / ' + summary.answered + '問' : 'まだ回答していません。まずは理由を考えて選んでみよう。';
    result.querySelector('.practice-spaced').textContent = '時間をあけて正解したことがある問題：' + summary.spacedCorrect + '問';
    result.querySelector('.practice-pending').textContent = 'あとで確かめたい問題：' + summary.pending + '問';
    var next = result.querySelector('.practice-next');
    next.textContent = summary.next === null ? '答えると、次に確かめる目安がここに出ます。' : summary.due ? '復習の目安を迎えた問題があります。本文を見ずに確かめてみよう。' : '次の確認目安：' + new Date(summary.next).toLocaleString('ja-JP', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' });
    result.querySelector('.practice-storage').textContent = storageFailed ? '記録を保存できません。この画面を閉じると今回の記録が失われることがあります。' : '記録はこの端末に保存します。同じ問題をすぐ解き直しても「時間をあけて正解」には数えません。';
    document.querySelectorAll('.practice-review-button').forEach(function (b) { b.hidden = summary.pending === 0; b.textContent = '復習したい' + summary.pending + '問を解き直す'; });
  }
  function exitReview() {
    document.getElementById('doc').classList.remove('practice-reviewing'); review.hidden = true; active = false;
    var button = panel.querySelector('.practice-review-button'); button.focus();
  }
  function startReview() {
    var now = Date.now(), pending = questions.filter(function (q) { var r = read(q); return StudyRecall.valid(r) && (r.needsReview || r.due <= now); });
    if (!pending.length) { update(); return; }
    var box = review.querySelector('.practice-review-questions'); box.replaceChildren();
    pending.forEach(function (q) { var clone = q.cloneNode(true); reset(clone); box.appendChild(clone); });
    review.querySelector('.practice-review-status').textContent = '0 / ' + pending.length + '問を確認';
    review.hidden = false; active = true; document.getElementById('doc').classList.add('practice-reviewing');
    review.querySelector('h2').focus(); review.scrollIntoView({ block: 'start' });
  }
  function answer(q, correct) {
    if (!q.dataset.recallKey || !panel) return;
    var old = read(q), now = Date.now(), record = StudyRecall.answer(old, correct, now);
    if (correct) record.everCorrect = true; else if (old && old.everCorrect) record.everCorrect = true;
    state[q.dataset.recallKey] = record; persist(); markSolved(); update(); feedback(correct);
    var note = q.querySelector('.recall-note');
    if (!note) { note = document.createElement('p'); note.className = 'recall-note'; q.appendChild(note); }
    note.textContent = !correct ? '理由を確かめたら、自分の言葉で言ってみよう。10分ほどあけて、もう一度確かめるのが目安です。' : old && record.spacedCorrect > (old.spacedCorrect || 0) ? '時間をあけても思い出せました。次は別の日に確かめよう。' : old ? '今の理解を確認できました。次は少し時間をあけて、答えを見ずに確かめよう。' : '理由も自分の言葉で説明してみよう。明日、答えを見ずに確かめるのが目安です。';
    if (active) {
      var completed = review.querySelectorAll('.mcq[data-answered]').length;
      review.querySelector('.practice-review-status').textContent = completed + ' / ' + review.querySelectorAll('.mcq').length + '問を確認';
    }
  }
  function init() {
    var doc = document.getElementById('doc'); if (!doc || panel) return;
    questions = Array.from(doc.querySelectorAll('.mcq')); if (!questions.length) return;
    questions.forEach(function (q) { q.dataset.recallKey = fingerprint(q); q.querySelector('.check-label').textContent = '先に理由を思い出してから選ぼう'; });
    panel = document.createElement('section'); panel.className = 'practice-panel';
    panel.innerHTML = '<p class="practice-guide">読む → 見ずに思い出す → 理由を確認 → 日をあけて復習</p><div class="practice-controls"><span class="practice-progress"></span><button type="button" class="practice-sound" aria-pressed="false"></button></div><button type="button" class="practice-review-button"></button>';
    doc.querySelector('h1').after(panel);
    result = document.createElement('section'); result.className = 'practice-result';
    result.innerHTML = '<h2>学習のふり返り</h2><p class="practice-first"></p><p class="practice-spaced"></p><p class="practice-pending"></p><button type="button" class="practice-review-button"></button><p class="practice-next"></p><p class="practice-storage"></p>';
    doc.appendChild(result);
    review = document.createElement('section'); review.className = 'practice-review'; review.hidden = true;
    review.innerHTML = '<h2 tabindex="-1">本文を見ずに、もう一度</h2><p>選ぶ前に、理由を自分の言葉で思い出してみよう。すぐの解き直しは理解の確認、時間をあけた復習は覚えているかの確認です。</p><button type="button" class="practice-return">本文に戻る</button><p class="practice-review-status" role="status"></p><div class="practice-review-questions"></div>';
    doc.appendChild(review);
    [panel, result].forEach(function (p) { p.querySelector('.practice-review-button').addEventListener('click', startReview); });
    review.querySelector('.practice-return').addEventListener('click', exitReview);
    panel.querySelector('.practice-sound').addEventListener('click', function () {
      sound = !sound; soundLabel();
      try { localStorage.setItem(SOUND, String(sound)); } catch (e) { result.querySelector('.practice-storage').textContent = '音の設定を保存できませんでした。この画面では切り替えられます。'; }
    });
    soundLabel(); update();
    window.addEventListener('storage', function (event) {
      if (event.key === KEY) {
        try { var value = JSON.parse(event.newValue); state = value && value.version === 1 && value.records && typeof value.records === 'object' && !Array.isArray(value.records) ? value.records : {}; } catch (e) { state = {}; }
        update();
      }
      if (event.key === SOUND) { sound = event.newValue === 'true'; soundLabel(); }
    });
    window.addEventListener('pageshow', update);
    window.setInterval(function () { if (!document.hidden) update(); }, 30000);
  }
  window.StudyPractice = { answer: answer, feedback: feedback };
  window.addEventListener('studylessonready', init);
}());
