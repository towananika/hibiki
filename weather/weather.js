(function(){
  'use strict';
  var cities={seoul:[37.5665,126.978,'ソウル','Asia/Seoul'],tokyo:[35.6762,139.6503,'東京','Asia/Tokyo'],osaka:[34.6937,135.5023,'大阪','Asia/Tokyo'],busan:[35.1796,129.0756,'釜山','Asia/Seoul']};
  function numeric(x){return typeof x==='number'&&Number.isFinite(x);}
  function degree(x){return numeric(x)?Math.round(x)+'℃':'—';}
  function label(code){
    if(!numeric(code))return '天気は未確認';if(code===0)return '晴れ';if(code<=3)return '晴れ・くもり';if(code===45||code===48)return '霧';
    if([71,73,75,77,85,86].indexOf(code)>=0)return '雪';if(code>=95)return '雷雨';if([51,53,55,56,57,61,63,65,66,67,80,81,82].indexOf(code)>=0)return '雨';return '天気は未確認';
  }
  function model(d,now){
    if(!d||!d.current||!d.hourly||!d.daily||!Array.isArray(d.hourly.time)||!Array.isArray(d.hourly.precipitation_probability))throw Error('data');
    var c=d.current,t=Date.parse(c.time+'+09:00');if(!Number.isFinite(t))throw Error('time');
    // 現在の時間帯から6時間分を対象にする。日付をまたぐ場合も含む。
    var begin=now==null?t:now,prob=[];
    d.hourly.time.forEach(function(s,i){var at=Date.parse(s+'+09:00');if(at>=Math.floor(begin/3600000)*3600000&&at<Math.floor(begin/3600000)*3600000+6*3600000){var p=d.hourly.precipitation_probability[i];if(numeric(p)&&p>=0&&p<=100)prob.push(p);}});
    var rain=prob.length===6?Math.max.apply(null,prob):null;
    var day=(d.daily.time||[]).indexOf(c.time.slice(0,10));
    var wind=c.wind_speed_10m,feel=c.apparent_temperature,advice=[];
    if(label(c.weather_code)==='雷雨')advice.push('雷に注意。外出前に最新情報を確認。');
    else if(label(c.weather_code)==='雪')advice.push('雪と路面の状態を確認。');
    else if(label(c.weather_code)==='雨'||(rain!==null&&rain>=40))advice.push('傘を持つと安心。');
    else if(rain===null)advice.push('この先の雨は確認できません。');
    else advice.push('この先6時間は雨の可能性が低め。');
    if(numeric(feel)&&feel<=12)advice.push('上着を。');else if(numeric(feel)&&feel>=28)advice.push('水分と暑さ対策を。');
    if(numeric(wind)&&wind>=8)advice.push('風が強め。');
    return {current:c,description:label(c.weather_code),rain:rain,high:day>=0&&d.daily.temperature_2m_max?d.daily.temperature_2m_max[day]:null,low:day>=0&&d.daily.temperature_2m_min?d.daily.temperature_2m_min[day]:null,advice:advice.join(' '),time:t,stale:Date.now()-t>3*3600000};
  }
  function el(tag,text,cls){var n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;}
  document.querySelectorAll('[data-weather]').forEach(function(root){
    var head=el('div',null,'weather-top'),title=el('strong','外出前の天気'),select=el('select');select.setAttribute('aria-label','天気の地域');
    Object.keys(cities).forEach(function(k){var o=el('option',cities[k][2]);o.value=k;select.appendChild(o);});
    try{var saved=localStorage.getItem('hibiki-weather-city-v1');if(cities[saved])select.value=saved;}catch(e){}
    head.append(title,select);var content=el('div');content.setAttribute('role','status');content.setAttribute('aria-live','polite');
    var bottom=el('div',null,'weather-bottom'),source=el('p','市中心部の目安 · Open-Meteo','weather-source'),refresh=el('button','更新');refresh.type='button';bottom.append(source,refresh);root.append(head,content,bottom);
    var generation=0,controller;
    function load(){
      var id=++generation,city=select.value,c=cities[city];if(controller)controller.abort();controller=new AbortController();
      var own=controller,timeout=setTimeout(function(){own.abort();},12000);
      content.textContent='予報を確認しています…';refresh.disabled=true;
      try{localStorage.setItem('hibiki-weather-city-v1',city);}catch(e){}
      var url='https://api.open-meteo.com/v1/forecast?latitude='+c[0]+'&longitude='+c[1]+'&current=temperature_2m,apparent_temperature,wind_speed_10m,weather_code&hourly=precipitation_probability&daily=temperature_2m_max,temperature_2m_min&wind_speed_unit=ms&forecast_days=2&timezone='+encodeURIComponent(c[3]);
      fetch(url,{signal:own.signal}).then(function(r){if(!r.ok)throw Error('http');return r.json();}).then(function(d){
        if(id!==generation)return;var m=model(d),current=m.current;content.replaceChildren();
        var line=el('div',null,'weather-now');line.append(el('b',degree(current.temperature_2m)),el('span',m.description+' · 体感 '+degree(current.apparent_temperature)));content.appendChild(line);
        content.appendChild(el('p','今後6時間の降水確率（最大） '+(m.rain===null?'—':m.rain+'%')+' · 今日 '+degree(m.low)+'〜'+degree(m.high),'weather-detail'));
        if(m.stale)content.appendChild(el('p','予報が古いため更新してください。','weather-advice'));else content.appendChild(el('p',m.advice,'weather-advice'));
        content.appendChild(el('p',(numeric(current.wind_speed_10m)?'風 '+current.wind_speed_10m.toFixed(1)+'m/s · ':'')+'予報時刻 '+current.time.slice(11,16)+'（韓国・日本時間）','weather-detail'));
        source.textContent=c[2]+'市中心部の目安 · Open-Meteo';
      }).catch(function(){if(id!==generation)return;content.textContent='予報を取得できませんでした。「更新」で再試行できます。';}).finally(function(){clearTimeout(timeout);if(id===generation)refresh.disabled=false;});
    }
    select.onchange=load;refresh.onclick=load;load();
  });
  if(typeof module!=='undefined'&&module.exports)module.exports={model:model,label:label};
})();
