import {compareTickets} from './tickets.mjs';
import {drawTicketChart} from './ticket-chart.mjs';
const KEY='mio-parking-tickets-v1',$=id=>document.getElementById(id);
let tickets=[],currency='KRW',source='',error='',storageBroken=false;
const money=n=>new Intl.NumberFormat('ja-JP',{style:'currency',currency,maximumFractionDigits:0}).format(n);
function valid(data){return data&&['KRW','JPY'].includes(data.currency)&&Array.isArray(data.tickets)&&data.tickets.length<=30&&data.tickets.every(t=>typeof t.name==='string'&&t.name.trim()&&['time','day'].includes(t.kind)&&Number.isSafeInteger(t.price)&&t.price>=0&&(t.kind==='day'||(Number.isSafeInteger(t.minutes)&&t.minutes>0&&t.minutes<=10080)));}
function row(t={name:'',kind:'time',minutes:'',price:''}){
 const item=document.createElement('div');item.className='ticket-row';
 for(const [key,label,type] of [['name','券名','text'],['minutes','時間（分）','number'],['price','価格','number']]){
  const wrap=document.createElement('label');wrap.textContent=label;const input=document.createElement('input');input.type=type;input.dataset.key=key;input.value=t[key]??'';if(type==='number'){input.min=key==='minutes'?'1':'0';input.step='1';}wrap.append(input);item.append(wrap);
 }
 const label=document.createElement('label');label.textContent='種類';const select=document.createElement('select');select.dataset.key='kind';for(const [value,text] of [['time','時間券'],['day','当日券']]){const option=new Option(text,value);select.add(option);}select.value=t.kind;label.append(select);item.append(label);
 const minutes=item.querySelector('[data-key="minutes"]');const update=()=>{minutes.disabled=select.value==='day';};select.onchange=update;update();
 const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.title='この駐車券を削除';remove.setAttribute('aria-label','この駐車券を削除');remove.onclick=()=>item.remove();item.append(remove);$('ticket-rows').append(item);
}
function fill(data){tickets=data.tickets;currency=data.currency;source=data.source||'このブラウザで登録';$('ticket-currency').value=currency;$('ticket-rows').replaceChildren();tickets.forEach(row);$('ticket-source').textContent=source;}
export function updateTickets(ms,firstStartedAt,exitedAt){
 const manual=$('planned-minutes').value;const minutes=manual===''?ms/60000:Number(manual);
 const end=firstStartedAt===null?null:new Date(manual!==''?firstStartedAt+minutes*60000:exitedAt??firstStartedAt+minutes*60000);
 const sameDate=end!==null&&new Date(firstStartedAt).toDateString()===end.toDateString();
 const sameDay=$('day-valid').checked&&(manual!==''||sameDate);
 const results=compareTickets(minutes,tickets,{combine:$('combine-tickets').checked,sameDay});
 drawTicketChart(tickets,currency,$('combine-tickets').checked,$('day-valid').checked);
 $('ticket-results').replaceChildren();
 $('ticket-message').textContent=error||(!tickets.length?'登録された駐車券はありません。':results===null?'比較できる時間は0〜10,080分です。':!results.length?'この条件で時間をカバーする駐車券はありません。':'');
 if(!results)return;
 results.slice(0,3).forEach((r,i)=>{const li=document.createElement('li');const description=r.parts.length?r.parts.map(t=>`${t.name} × ${t.count}`).join(' ＋ '):'駐車時間なし';li.textContent=`${i===0?'最安候補：':''}${money(r.price)} / ${description}${r.covered===null?'':`（${r.covered}分）`}`;$('ticket-results').append(li);});
 $('ticket-condition').textContent='登録券だけの購入費用を比較。通常料金や保有済み券は含みません。'+($('combine-tickets').checked?'時間券を複数併用でき、枚数上限なしという仮定です。':'時間券は1枚ずつ比較します。')+(!sameDay?'当日券は有効条件未確認、または日付またぎのため除外。':'当日券が対象の駐車全体に有効という確認に基づく概算です。');
 return results[0]||null;
}
let last=[0,null,null];export function renderTickets(ms,first,exit){last=[ms,first,exit];return updateTickets(ms,first,exit);}
for(const id of ['planned-minutes','combine-tickets','day-valid'])$(id).oninput=()=>updateTickets(...last);
$('add-ticket').onclick=()=>{if($('ticket-rows').children.length<30)row();};
$('save-tickets').onclick=()=>{
 const data={currency:$('ticket-currency').value,source:'このブラウザで登録・編集',tickets:[...$('ticket-rows').children].map(el=>Object.fromEntries([...el.querySelectorAll('[data-key]')].map(input=>[input.dataset.key,['price','minutes'].includes(input.dataset.key)?input.value===''?null:Number(input.value):input.value.trim()])))};
 if(storageBroken){error='保存データを復元できないため上書きを止めています。';updateTickets(...last);return;}
 if(!valid(data)){error='券名・時間・価格を確認してください。時間は1〜10,080分、価格は0以上の整数です。';updateTickets(...last);return;}
 try{localStorage.setItem(KEY,JSON.stringify(data));error='';fill(data);$('ticket-source').textContent+='（保存しました）';}catch{error='保存できませんでした。登録内容は変更していません。';}updateTickets(...last);
};
async function init(){
 try{const raw=localStorage.getItem(KEY);if(raw){const data=JSON.parse(raw);if(!valid(data))throw Error();fill(data);updateTickets(...last);return;}}
 catch{storageBroken=true;error='登録券の保存データを復元できませんでした。上書きはしていません。';updateTickets(...last);return;}
 try{if(window.HibikiSync?.open){const data=await window.HibikiSync.open('parking-tickets-20261027');if(data&&valid(data))fill(data);else $('ticket-source').textContent='登録済みの料金表を読むにはログイン・解錠が必要です。';}}
 catch{$('ticket-source').textContent='登録済みの料金表を読み込めませんでした。';}
 updateTickets(...last);
}
init();
