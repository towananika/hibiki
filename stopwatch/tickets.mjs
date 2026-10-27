export function compareTickets(minutes,tickets,{combine=false,sameDay=false}={}){
  if(!Number.isFinite(minutes)||minutes<0||minutes>10080)return null;
  const items=tickets.filter(t=>typeof t.name==='string'&&Number.isSafeInteger(t.price)&&t.price>=0&&(t.kind==='day'||(t.kind==='time'&&Number.isSafeInteger(t.minutes)&&t.minutes>0&&t.minutes<=10080)));
  const target=Math.ceil(minutes), results=[];
  if(!target)return [{price:0,parts:[],covered:0}];
  for(const t of items)if((t.kind==='day'&&sameDay)||(t.kind==='time'&&t.minutes>=target))results.push({price:t.price,parts:[{...t,count:1}],covered:t.kind==='day'?null:t.minutes});
  if(combine){
    const timed=items.filter(t=>t.kind==='time'),dp=Array(target+1).fill(null);dp[0]={price:0,counts:[]};
    for(let n=1;n<=target;n++)for(let i=0;i<timed.length;i++){
      const previous=dp[Math.max(0,n-timed[i].minutes)];if(!previous)continue;
      const price=previous.price+timed[i].price,counts=[...previous.counts];counts[i]=(counts[i]||0)+1;
      if(!dp[n]||price<dp[n].price||(price===dp[n].price&&counts.reduce((a,b)=>a+(b||0),0)<dp[n].counts.reduce((a,b)=>a+(b||0),0)))dp[n]={price,counts};
    }
    if(dp[target]){const parts=timed.flatMap((t,i)=>dp[target].counts[i]?[{...t,count:dp[target].counts[i]}]:[]);results.push({price:dp[target].price,parts,covered:parts.reduce((s,t)=>s+t.minutes*t.count,0)});}
  }
  const seen=new Set();return results.sort((a,b)=>a.price-b.price||a.parts.reduce((s,t)=>s+t.count,0)-b.parts.reduce((s,t)=>s+t.count,0)).filter(r=>{const key=JSON.stringify(r.parts.map(t=>[t.name,t.count]));if(seen.has(key))return false;seen.add(key);return true;});
}
