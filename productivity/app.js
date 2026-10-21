(function () {
  'use strict';
  var day = document.getElementById('day'), S, key;
  var links = { work:'', study:'../study/', health:'../health/', budget:'../money/budget.html', house:'../home/', vehicle:'../money/vehicle.html', dream:'../dreams/' };
  var names = { dig:'デジタル経済', trad:'伝統社会と生活文化', money:'貨幣金融論', macro:'上級マクロ経済論', rel:'世界の宗教', open:'開かれた社会' };
  function read(k, fallback) { try { return JSON.parse(localStorage.getItem(k)) || fallback; } catch (e) { return fallback; } }
  function node(tag, text, cls) { var e=document.createElement(tag); if(text!=null)e.textContent=text;if(cls)e.className=cls;return e; }
  function message(text) { document.getElementById('message').textContent=text; }
  function safeLink(url) { return typeof url==='string' && /^\.\.\/[a-z][a-z0-9/-]*(?:\.html)?(?:\?[a-z0-9=&-]+)?$/.test(url) ? url : ''; }
  function save() { try {localStorage.setItem(key,JSON.stringify(S));return true;}catch(e){message('保存できませんでした。この画面を閉じる前に記録を控えてください。');return false;} }
  function load() {
    key='hibiki-productivity-v1:'+day.value;
    S=read(key,{});if(!Array.isArray(S.items))S.items=[];
    S.items=S.items.filter(function(x){return x&&typeof x.id==='string'&&typeof x.title==='string';}).slice(0,3);
    document.getElementById('reflection').value=typeof S.reflection==='string'?S.reflection:'';
    document.getElementById('saved').textContent='';message('');render();
  }
  function active() { return S.items.find(function(x){return x.id===S.active&&!x.done;}); }
  function add(title,href) {
    if(S.items.length>=3){message('今日は3つまで。優先したい一歩を残してから加えてください。');return;}
    if(S.items.some(function(x){return x.title===title;})){message('その一歩はすでに入っています。');return;}
    var x={id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),title:title,href:safeLink(href),done:false};
    S.items.push(x);if(!active())S.active=x.id;
    save();render();message('一歩を加えました。');
  }
  function choose(id) { if(S.active!==id)S.deadline=null;S.active=id;save();render(); }
  function complete(x,done) {x.done=done;if(done&&S.active===x.id){S.active=null;S.deadline=null;}save();render();}
  function render() {
    var list=document.getElementById('tasks');list.replaceChildren();
    document.getElementById('count').textContent=S.items.filter(function(x){return x.done;}).length+' / '+S.items.length+' 完了';
    if(!S.items.length)list.appendChild(node('li','今日進めたいことを、まず1つ。','note'));
    S.items.forEach(function(x){
      var li=node('li',null,'task'+(x.done?' done':'')),label=node('label'),check=node('input');
      check.type='checkbox';check.checked=!!x.done;check.onchange=function(){complete(x,check.checked);};label.append(check,node('span',x.title,'title'));li.appendChild(label);
      var actions=node('div',null,'actions');
      if(!x.done){var pick=node('button',S.active===x.id?'選択中':'これに集中');pick.type='button';pick.setAttribute('aria-pressed',String(S.active===x.id));pick.onclick=function(){choose(x.id);};actions.appendChild(pick);}
      var remove=node('button','外す');remove.type='button';remove.setAttribute('aria-label',x.title+'を外す');remove.onclick=function(){S.items=S.items.filter(function(t){return t.id!==x.id;});if(S.active===x.id){S.active=null;S.deadline=null;}save();render();};actions.appendChild(remove);li.appendChild(actions);list.appendChild(li);
    });
    var a=active();document.getElementById('focus-title').textContent=a?a.title:(S.items.length&&S.items.every(function(x){return x.done;})?'選んだ一歩が終わりました。ひと息つきましょう。':'今日の一歩を選びましょう。');
    document.getElementById('focus-controls').hidden=!a;
    var open=document.getElementById('open-task'),href=a&&safeLink(a.href);open.hidden=!href;if(href)open.href=href;else open.removeAttribute('href');
    document.querySelector('#add button').disabled=S.items.length>=3;tick();
  }
  function candidate(title,why,href) {
    var row=node('div',null,'candidate');row.append(node('b',title),node('p',why));
    var b=node('button','今日の一歩にする');b.type='button';b.onclick=function(){add(title,href);};row.appendChild(b);document.getElementById('suggestions').appendChild(row);
  }
  function suggestions() {
    document.getElementById('suggestions').replaceChildren();
    if(window.HBPRI)HBPRI.items.filter(function(x){return !x.ok;}).slice(0,3).forEach(function(x){candidate(x.t,x.why,x.href);});
    var plan=read('hibiki-study-plan-v1',{}),done=plan.done||{},digital=read('hibiki-study-digital-v1',{});
    Object.keys(names).forEach(function(k){var material=(window.StudyMaterials||{})[k]||{};
      var n=Object.keys(material).map(Number).filter(function(n){return n>=8&&!(k==='dig'?digital[n-1]:done[k+':'+n]);}).sort(function(a,b){return a-b;})[0];
      if(n)candidate(names[k]+' '+n+'講を進める','教材あり・完了の記録はまだありません。','../study/'+material[n]);
    });
  }
  var idea=null;
  var ideas=[
    {title:'ペンを3本しまう',kind:'life',minutes:2,why:'小さく片づけて、次の作業を始めやすくする。',href:''},
    {title:'机の上で今使わないものを3つ戻す',kind:'life',minutes:5,why:'作業する場所を一か所だけ空ける。',href:''},
    {title:'明日必要なものをひとまとめにする',kind:'life',minutes:5,why:'出かける前の探し物を減らす。',href:''},
    {title:'今日終えたい仕事を1行で書く',kind:'work',minutes:3,why:'終わりの形を先に決める。',href:''},
    {title:'作りかけの機能の次の操作を1つ書く',kind:'work',minutes:5,why:'スマホでは整理だけ。開発を再開する入口を残す。',href:''},
    {title:'よく繰り返す作業を1つメモする',kind:'work',minutes:5,why:'自動化やテンプレートにできそうな作業を見つける。',href:''},
    {title:'過去に作ったものの説明を3行にまとめる',kind:'work',minutes:15,why:'実績紹介や仕事の相談に使える形にする。',href:''},
    {title:'手放せる不用品を1つ見つける',kind:'income',minutes:5,why:'仕入れずに試せる販売候補を探す。',href:''},
    {title:'売りたい品の明るい写真を1枚撮る',kind:'income',minutes:5,why:'出品準備を一歩だけ進める。',href:''},
    {title:'出品候補の売却済み価格を3件調べる',kind:'income',minutes:15,why:'希望価格と実際に売れた価格を分けて見る。',href:''},
    {title:'できそうな仕事の募集条件を1件読む',kind:'income',minutes:15,why:'応募する前に、必要なスキルと報酬条件を確認する。',href:''},
    {title:'出品文を1つ下書きする',kind:'income',minutes:30,why:'状態・傷・付属品・受け渡し条件を正直にまとめる。',href:''},
    {title:'家計の使っていない定額サービスを1件確認する',kind:'life',minutes:15,why:'解約を急がず、次回請求日と必要性を確認する。',href:'../money/budget.html'}
  ];
  function clearIdea(){idea=null;document.getElementById('idea-result').hidden=true;}
  document.getElementById('idea-time').onchange=clearIdea;
  document.getElementById('idea-kind').onchange=clearIdea;
  document.getElementById('draw-idea').onclick=function(){
    var time=+document.getElementById('idea-time').value,kind=document.getElementById('idea-kind').value;
    var pool=ideas.filter(function(x){return x.minutes<=time&&(kind==='any'||kind===x.kind)&&!S.items.some(function(t){return t.title===x.title;});});
    var different=pool.filter(function(x){return !idea||x.title!==idea.title;});if(different.length)pool=different;
    if(!pool.length){clearIdea();message('この条件の候補は今日の一歩に入っています。別の気分も選べます。');return;}
    idea=pool[Math.floor(Math.random()*pool.length)];document.getElementById('idea-title').textContent=idea.title+'（約'+idea.minutes+'分）';
    document.getElementById('idea-why').textContent=idea.why;document.getElementById('idea-result').hidden=false;this.textContent='ほかの一歩も見る';
  };
  document.getElementById('take-idea').onclick=function(){if(!idea)return;var before=S.items.length;add(idea.title,idea.href);if(S.items.length>before){clearIdea();document.getElementById('tasks').scrollIntoView({block:'nearest'});}};
  day.value=StudyPlan.today();day.onchange=function(){try{StudyPlan.date(day.value);load();}catch(e){message('日付を選んでください。');}};
  document.getElementById('add').onsubmit=function(e){e.preventDefault();var input=document.getElementById('task'),t=input.value.trim();if(!t)return;var before=S.items.length;add(t,links[document.getElementById('area').value]);if(S.items.length>before)input.value='';};
  document.getElementById('start').onclick=function(){if(!active())return;S.deadline=Date.now()+15*60000;save();tick();};
  document.getElementById('stop').onclick=function(){S.deadline=null;save();tick();};
  document.getElementById('finish').onclick=function(){var x=active();if(x)complete(x,true);};
  document.getElementById('reflection').oninput=function(){S.reflection=this.value;if(save())document.getElementById('saved').textContent='保存しました';};
  function tick(){
    var running=Number.isFinite(S.deadline)&&S.deadline>0,left=running?Math.max(0,Math.ceil((S.deadline-Date.now())/1000)):900;
    document.getElementById('timer').textContent=String(Math.floor(left/60)).padStart(2,'0')+':'+String(left%60).padStart(2,'0');
    document.getElementById('start').disabled=running&&left>0;
    if(running&&left===0)document.getElementById('timer').textContent='15分、おつかれさま。';
  }
  window.addEventListener('storage',function(e){if(e.key===key||e.key===null)load();if(e.key==='hibiki-study-plan-v1'||e.key==='hibiki-study-digital-v1')suggestions();});
  window.addEventListener('pageshow',function(){load();suggestions();});
  document.addEventListener('visibilitychange',function(){if(!document.hidden)tick();});
  load();suggestions();setInterval(tick,1000);
})();
