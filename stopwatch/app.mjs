import {empty,valid,elapsed,start,pause,format} from './timer.mjs';
import {estimate} from './parking.mjs';
import {renderTickets} from './ticket-ui.mjs';
const KEY='mio-stopwatch-v1', $=id=>document.getElementById(id);
let state=empty(),broken=false;
const RATE_KEY='mio-parking-rate-v1';
const rateNames=['freeMinutes','baseMinutes','baseFee','unitMinutes','unitFee','cap','ticketMinutes','ticketAmount'];
try{const saved=JSON.parse(localStorage.getItem(RATE_KEY)||'null');if(saved){for(const k of rateNames)if(saved[k]!=null)$(k).value=saved[k];if(['KRW','JPY'].includes(saved.currency))$('currency').value=saved.currency;}}
catch{$('fee-note').textContent='料金設定を復元できませんでした。料金表を確認してください。';}
function rate(){const r={};for(const k of rateNames){const v=$(k).value;r[k]=v===''?null:Number(v);}return r;}
function renderFee(){
  const ticket=renderTickets(elapsed(state),state.firstStartedAt,state.startedAt!==null?Date.now():state.exitedAt);
  const value=estimate(elapsed(state),rate());
  $('fee').textContent=value===null?'料金未設定':new Intl.NumberFormat('ja-JP',{style:'currency',currency:$('currency').value,maximumFractionDigits:0}).format(value);
  if(value===null)$('fee-note').textContent='追加の単位と料金を入力し、料金表と計算条件を確認してください。';
  else $('fee-note').textContent=state.firstStartedAt===null?'入庫ボタンで計測開始。料金は入力条件による概算です。':state.startedAt===null?'出庫時点の概算です。':'経過時間に合わせて更新中。';
  if(ticket&&value===null){$('fee').textContent=new Intl.NumberFormat('ja-JP',{style:'currency',currency:$('ticket-currency').value,maximumFractionDigits:0}).format(ticket.price);$('fee-note').textContent='登録券での最安候補。通常料金は未設定のため比較していません。';}
  $('fee-title').textContent=$('planned-minutes').value!==''?'出庫予定時間での駐車券の目安':'いま出庫した場合の目安';
  if($('planned-minutes').value!==''&&ticket){$('fee').textContent=new Intl.NumberFormat('ja-JP',{style:'currency',currency:$('ticket-currency').value,maximumFractionDigits:0}).format(ticket.price);$('fee-note').textContent='指定した合計時間・併用条件での登録券の最安候補。';}
  if($('planned-minutes').value!==''&&!ticket){$('fee').textContent='比較できる券なし';$('fee-note').textContent='券の登録内容と併用・当日券の条件を確認してください。';}
  const comparedMinutes=$('planned-minutes').value===''?elapsed(state)/60000:Number($('planned-minutes').value);
  if(comparedMinutes>=0&&comparedMinutes<=30){$('fee').textContent='無料';$('fee-note').textContent='30分以内は無料。';}
}
for(const k of [...rateNames,'currency'])$(k).addEventListener('input',()=>{
  renderFee();try{const saved=Object.fromEntries(rateNames.map(k=>[k,$(k).value]));saved.currency=$('currency').value;localStorage.setItem(RATE_KEY,JSON.stringify(saved));}
  catch{$('fee-note').textContent='料金設定を保存できませんでした。';}
});
function read(){
  try{const raw=localStorage.getItem(KEY),s=raw?JSON.parse(raw):empty();if(!valid(s))throw Error();state=s;broken=false;}
  catch{broken=true;$('status').textContent='保存データを読み込めません。リセットで新しく計測できます。';}
}
function persist(next){
  try{localStorage.setItem(KEY,JSON.stringify(next));state=next;broken=false;$('status').textContent='保存しました。';return true;}
  catch{$('status').textContent='保存できませんでした。計測状態は変更していません。';return false;}
}
const stamp=t=>t===null?'—':new Date(t).toLocaleString('ja-JP',{hour12:false,timeZoneName:'short'});
function render(){
  const running=state.startedAt!==null;
  $('time').textContent=format(elapsed(state));
  $('state').textContent=running?'駐車中':state.firstStartedAt===null?'入庫前':'出庫済み';
  $('toggle-label').textContent=running?'出庫':state.firstStartedAt===null?'入庫':'計測を再開';
  $('toggle-icon').innerHTML=running?'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>':'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 3v18l15-9z"/></svg>';
  $('toggle').disabled=broken;$('reset').disabled=!broken&&state.firstStartedAt===null;
  $('first').textContent=stamp(state.firstStartedAt);$('started').textContent=stamp(state.startedAt);
  renderFee();
}
$('toggle').onclick=()=>{read();if(broken){render();return;}const now=Date.now();persist(state.startedAt===null?{...start(state,now),exitedAt:null}:{...pause(state,now),exitedAt:now});render();};
$('reset').onclick=()=>{if(!confirm('経過時間・開始時刻・今回の無料時間券と金額割引をリセットしますか？'))return;if(persist(empty())){for(const k of ['ticketMinutes','ticketAmount']){$(k).value='0';$(k).dispatchEvent(new Event('input'));}}render();};
window.addEventListener('storage',event=>{if(event.key===KEY||event.key===null){read();render();}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){read();render();}});
read();render();setInterval(()=>{$('time').textContent=format(elapsed(state));renderFee();},250);
