import {compareTickets} from './tickets.mjs';
let previous='';
export function drawTicketChart(tickets,currency,combine,dayValid,freeWithin=0){
 const canvas=document.getElementById('ticket-chart'),note=document.getElementById('chart-note');
 const key=JSON.stringify([tickets,currency,combine,dayValid,freeWithin,canvas.clientWidth]);if(key===previous)return;previous=key;
 const w=Math.max(240,canvas.clientWidth),h=240,dpr=window.devicePixelRatio||1;canvas.width=w*dpr;canvas.height=h*dpr;
 const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);ctx.clearRect(0,0,w,h);
 const timed=tickets.filter(t=>t.kind==='time'),days=tickets.filter(t=>t.kind==='day');
 const points=Array.from({length:25},(_,i)=>{const results=compareTickets(i*30,timed,{combine,freeWithin});return {minutes:i*30,price:results?.[0]?.price??null};});
 const day=dayValid&&days.length?Math.min(...days.map(t=>t.price)):null;
 const values=points.map(p=>p.price).filter(n=>n!==null);if(day!==null)values.push(day);
 if(!tickets.length){note.textContent='券を登録すると時間別の費用を表示します。';return;}
 const max=Math.max(1,...values)*1.1,left=64,right=w-12,top=15,bottom=203;
 const x=m=>left+m/720*(right-left),y=p=>bottom-p/max*(bottom-top);
 const dark=matchMedia('(prefers-color-scheme:dark)').matches;ctx.font='12px system-ui';ctx.fillStyle=dark?'#edf1ed':'#2b2924';
 for(let i=0;i<=4;i++){const amount=max*i/4;ctx.strokeStyle=dark?'#536056':'#d5d1c7';ctx.beginPath();ctx.moveTo(left,y(amount));ctx.lineTo(right,y(amount));ctx.stroke();ctx.fillText(Math.round(amount).toLocaleString('ja-JP'),2,y(amount)+4);}
 for(const hours of [0,3,6,9,12])ctx.fillText(`${hours}h`,x(hours*60)-8,226);
 ctx.strokeStyle=dark?'#8ac6b4':'#31755f';ctx.lineWidth=2.5;ctx.beginPath();let last=null;
 for(const p of points){if(p.price===null){last=null;continue;}if(last){ctx.lineTo(x(last.minutes),y(p.price));ctx.lineTo(x(p.minutes),y(p.price));}else ctx.moveTo(x(p.minutes),y(p.price));last=p;}ctx.stroke();
 if(day!==null){ctx.strokeStyle=dark?'#aac9ee':'#466b92';ctx.setLineDash([6,4]);ctx.beginPath();ctx.moveTo(left,y(day));ctx.lineTo(right,y(day));ctx.stroke();ctx.setLineDash([]);}
 let threshold=null;if(day!==null)for(let m=1;m<=720;m++){const best=compareTickets(m,timed,{combine})?.[0];if(best&&best.price>day){threshold=m;break;}}
 note.textContent=`0〜12時間・${currency==='KRW'?'ウォン':'円'}。緑：時間券${combine?'（併用あり）':'（1枚）'}、青の破線：当日券。30分刻みの目安です。`+(day===null?' 当日券は有効確認後に表示。':threshold===null?' 12時間以内では、比較可能な時間券より当日券が安くなる点はありません。':` ${Math.floor(threshold/60)}時間${threshold%60}分時点で当日券が安くなります（1分単位の比較）。`);
 canvas.setAttribute('aria-label',note.textContent);
}
