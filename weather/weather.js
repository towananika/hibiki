(function(){
'use strict';
var cities={yeongdeungpo:[37.526,126.896,'永登浦区','Asia/Seoul'],seoul:[37.5665,126.978,'ソウル','Asia/Seoul'],busan:[35.1796,129.0756,'釜山','Asia/Seoul'],tokyo:[35.6762,139.6503,'東京','Asia/Tokyo'],osaka:[34.6937,135.5023,'大阪','Asia/Tokyo']};
function ok(n){return typeof n==='number'&&Number.isFinite(n)}
function deg(n){return ok(n)?Math.round(n)+'℃':'—'}
function label(code){if(!ok(code))return '未確認';if(code===0)return '晴れ';if(code<=3)return '晴れ・くもり';if(code===45||code===48)return '霧';if(code>=95)return '雷雨';if([71,73,75,77,85,86].includes(code))return '雪';if([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code))return '雨';return '未確認'}
function icon(code){var l=label(code);return l==='晴れ'?'☀':l==='雨'?'☂':l==='雪'?'❄':l==='雷雨'?'⚡':l==='霧'?'≋':'☁'}
function advice(c,p){var f=c.apparent_temperature,w=c.wind_speed_10m,r=c.precipitation,code=c.weather_code;
if(label(code)==='雷雨'||label(code)==='雪'||(ok(w)&&w>=10)||(ok(r)&&r>=4))return ['今日は屋内運動が安心','雷・雪・強風・強い雨の可能性。外出前に警報と路面を確認。'];
if((ok(f)&&f<=5)||(ok(w)&&w>=7)||(ok(p)&&p>=65))return ['短時間か屋内がおすすめ','寒さ・風・雨の可能性が高め。屋内15分や短い散歩を。'];
if((ok(f)&&f<=12)||(ok(w)&&w>=4)||(ok(p)&&p>=35))return ['防寒して短めの散歩','上着と雨具を確認。10〜20分から始めて、寒ければ戻ろう。'];
if(ok(f)&&f>=29)return ['暑さに注意','涼しい時間に短く歩き、水分補給を。'];
return ['散歩しやすそう','20〜30分の散歩を検討。体調と実際の空模様を優先。'];
}
function el(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e}
function tile(name,value,detail){var t=el('div','wx-tile');t.append(el('span','wx-label',name),el('strong','wx-value',value));if(detail)t.append(el('small','',detail));return t}
document.querySelectorAll('[data-weather]').forEach(function(root){
var top=el('div','weather-top'),title=el('strong','','外出前の天気'),sel=el('select');sel.setAttribute('aria-label','予報の地域');
Object.keys(cities).forEach(function(k){var o=el('option','',cities[k][2]);o.value=k;sel.append(o)});
try{var saved=localStorage.getItem('hibiki-weather-city-v1');sel.value=cities[saved]?saved:'yeongdeungpo'}catch(e){sel.value='yeongdeungpo'}
top.append(title,sel);var content=el('div','weather-content');content.setAttribute('aria-live','polite');var bottom=el('div','weather-bottom'),source=el('p','weather-source','Open-Meteo · 地域の代表地点'),refresh=el('button','','更新');refresh.type='button';bottom.append(source,refresh);root.append(top,content,bottom);
var counter=0,ctrl;
function load(){
var id=++counter,c=cities[sel.value];if(ctrl)ctrl.abort();ctrl=new AbortController();var own=ctrl;var timeout=setTimeout(function(){own.abort()},12000);refresh.disabled=true;content.textContent='最新の予報を読み込んでいます…';
try{localStorage.setItem('hibiki-weather-city-v1',sel.value)}catch(e){}
var url='https://api.open-meteo.com/v1/forecast?latitude='+c[0]+'&longitude='+c[1]+'&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m&hourly=temperature_2m,precipitation_probability,wind_speed_10m,apparent_temperature,weather_code&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset&wind_speed_unit=ms&timezone='+encodeURIComponent(c[3])+'&forecast_days=2';
fetch(url,{signal:own.signal}).then(function(r){if(!r.ok)throw Error('network');return r.json()}).then(function(d){
if(id!==counter)return;if(!d.current||!d.hourly||!d.daily)throw Error('missing');
var n=d.current,h=d.hourly,day=(d.daily.time||[]).indexOf(n.time.slice(0,10));if(day<0)day=0;
var nowIndex=(h.time||[]).findIndex(function(t){return t.slice(0,13)===n.time.slice(0,13)});if(nowIndex<0)nowIndex=0;
var next=h.precipitation_probability.slice(nowIndex,nowIndex+6).filter(ok),rain=next.length?Math.max.apply(null,next):null;
var a=advice(n,rain);content.replaceChildren();
var hero=el('div','wx-hero');var main=el('div','wx-main');main.append(el('span','wx-symbol',icon(n.weather_code)),el('b','wx-temp',deg(n.temperature_2m)));var desc=el('div','wx-desc');desc.append(el('strong','',label(n.weather_code)),el('span','', '体感 '+deg(n.apparent_temperature)));hero.append(main,desc);content.append(hero);
var grid=el('div','wx-grid');
grid.append(tile('風速',ok(n.wind_speed_10m)?n.wind_speed_10m.toFixed(1)+' m/s':'—',ok(n.wind_gusts_10m)?'突風 '+n.wind_gusts_10m.toFixed(1)+' m/s':''),
tile('雨の可能性',rain===null?'—':rain+'%','これから6時間の最大値'),
tile('今日の気温',deg(d.daily.temperature_2m_min[day])+'〜'+deg(d.daily.temperature_2m_max[day]),'最低〜最高'),
tile('湿度',ok(n.relative_humidity_2m)?Math.round(n.relative_humidity_2m)+'%':'—','現在'));
content.append(grid);
var verdict=el('div','wx-verdict');verdict.append(el('strong','',a[0]),el('p','',a[1]));content.append(verdict);
var forecast=el('div','wx-hours');forecast.append(el('h3','','この先の時間別予報'));var strip=el('div','wx-hour-list');
for(var i=nowIndex;i<Math.min(nowIndex+8,h.time.length);i++){var item=el('div','wx-hour');item.append(el('small','',h.time[i].slice(11,16)),el('span','',icon(h.weather_code[i])),el('b','',deg(h.temperature_2m[i])),el('small','',ok(h.precipitation_probability[i])?'雨 '+h.precipitation_probability[i]+'%':'雨 —'),el('small','',ok(h.wind_speed_10m[i])?'風 '+h.wind_speed_10m[i].toFixed(1):'風 —'));strip.append(item)}forecast.append(strip);content.append(forecast);
var times=el('p','weather-detail','日の入り '+(d.daily.sunset[day]||'').slice(11,16)+' · 予報時刻 '+n.time.replace('T',' ')+' · '+c[2]);content.append(times);
source.textContent='Open-Meteo · '+c[2]+'付近の予報（実測と異なる場合あり）';
}).catch(function(){if(id===counter)content.textContent='予報を取得できません。通信状態を確認して「更新」を押してください。'}).finally(function(){clearTimeout(timeout);if(id===counter)refresh.disabled=false});
}
sel.addEventListener('change',load);refresh.addEventListener('click',load);load();
});
})();