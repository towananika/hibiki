(function () {
  'use strict';
  var status=document.getElementById('analysis-status'),body=document.getElementById('analysis-body');
  function node(t,text,cls){var e=document.createElement(t);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e;}
  function won(n){return '₩'+Math.round(n).toLocaleString('ja-JP');}
  function row(root,label,value){var r=node('div',null,'kv');r.append(node('span',label),node('b',value));root.appendChild(r);}
  function monthLabel(bought,months){var p=bought.split('-').map(Number),d=new Date(Date.UTC(p[0],p[1]-1+Math.floor(months),p[2]));return d.getUTCFullYear()+'年'+(d.getUTCMonth()+1)+'月ごろ';}
  function show(D){
    if(!D||!D.insurance){status.textContent='ログインすると、これまでの費用とバスとの比較が表示されます。';return;}
    var keys=['purchase','km','operating','electricityMonthly','busRegular','busYouth'];
    if(keys.some(function(k){return !Number.isFinite(D[k])||D[k]<0;})||!D.km||!Number.isFinite(D.insurance.amount)||!(D.insurance.months>0)){status.textContent='分析データを確認してください。';return;}
    var start=Date.parse(D.bought+'T00:00:00+09:00'),end=Date.parse(D.asOf+'T00:00:00+09:00'),months=(end-start)/864e5/30.4;
    if(!(months>0))return;
    status.textContent=D.asOf.replace(/-/g,'/')+'時点の本人申告による概算です。購入日・購入額・距離・電気代はおおよその値です。';
    var total=D.purchase+D.operating,insurance=D.insurance.amount/D.insurance.months,running=insurance+D.electricityMonthly;
    row(body,'購入日',D.bought.replace(/-/g,'/')+'ごろ');row(body,'使用期間',months.toFixed(1)+'か月');row(body,'累計走行距離',D.km.toLocaleString('ja-JP')+' km');
    row(body,'本体・アクセサリー',won(D.purchase));row(body,'記録済み運用費（保険を含む）',won(D.operating));row(body,'うち保険料',won(D.insurance.amount));row(body,'うち保険以外',won(D.operating-D.insurance.amount));
    row(body,'購入からの総支出',won(total));row(body,'総支出の月平均',won(total/months));row(body,'総支出の1kmあたり',won(total/D.km));row(body,'月平均の走行距離',Math.round(D.km/months).toLocaleString('ja-JP')+' km');
    body.appendChild(node('p','運用費の合計には保険料が含まれているため、ここでは再加算していません。合計額の申告であり、架空の明細は追加していません。','note'));
    body.appendChild(node('h3','乗っている時間の目安'));
    [20,25,30].forEach(function(speed){row(body,'平均時速'+speed+'kmと仮定',(D.km/months/speed).toFixed(1)+'時間 / 月');});
    body.appendChild(node('p','速度は仮定で、実測値ではありません。乗車時間と、バスより短縮できた時間は別です。','note'));
    body.appendChild(node('h3','長く使うと、購入費の負担はどう下がる？'));
    [3,4,5,6].forEach(function(years){row(body,years+'年間使う場合の購入費',won(D.purchase/(years*12))+' / 月');});
    body.appendChild(node('h3','バス代と並ぶ時期の単純な試算'));
    row(body,'保険の月割り＋電気代',won(running)+' / 月');
    [['一般',D.busRegular],['青年',D.busYouth]].forEach(function(bus){var saving=bus[1]-running;
      row(body,bus[0]+'：バス '+won(bus[1])+' / 月',saving>0?monthLabel(D.bought,D.purchase/saving)+'（約'+(D.purchase/saving).toFixed(1)+'か月）':'この条件では購入費を回収しません');
    });
    body.appendChild(node('p','購入費 ÷（バス月額 − 保険月割り − 電気代）の試算。整備・修理・保険更新時の変化・併用する公共交通費・資金の機会費用を除き、時間短縮や売却価値も含みません。現在の損益分岐点が確定したという意味ではありません。30日券と暦月の違いも概算しています。','note'));
    body.appendChild(node('p','購入時は2028年ごろ（約3年）に損益分岐点と予想。今回の費用条件だけで見ると、その予想より長くなる見込みです。','note'));
    var a=node('a','ソウル市公式：料金・還付条件を確認する ›');a.href='https://news.seoul.go.kr/traffic/public/climatecard-faq/faq-climatepass';body.appendChild(a);
    body.appendChild(node('p','一般・青年の区分、対象路線、登録・利用回数などの条件で負担は変わります。時間短縮の効果は、バスとスクーターの実際の所要時間が分かったら追加します。','note'));
    window.dispatchEvent(new CustomEvent('vehicleanalysisready',{detail:D}));
  }
  if(window.HibikiSync)HibikiSync.open('vehicle-analysis').then(show,function(){show(null);});else show(null);
})();
