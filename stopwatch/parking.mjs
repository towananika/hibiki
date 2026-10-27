export function estimate(ms, rate) {
  const names=['freeMinutes','baseMinutes','baseFee','unitMinutes','unitFee','ticketMinutes','ticketAmount'];
  if(!rate || names.some(k=>!Number.isFinite(rate[k])||rate[k]<0)||rate.unitMinutes<=0||
    (rate.baseMinutes===0&&rate.baseFee!==0)||!Number.isFinite(ms)||ms<0||
    (rate.cap!==null&&(!Number.isFinite(rate.cap)||rate.cap<0))) return null;
  const billable=Math.max(0,ms/60000-rate.freeMinutes-rate.ticketMinutes);
  let fee=0;
  if(billable>0){
    fee=rate.baseMinutes>0?rate.baseFee:0;
    const excess=Math.max(0,billable-rate.baseMinutes);
    fee+=Math.ceil(excess/rate.unitMinutes)*rate.unitFee;
  }
  if(rate.cap!==null)fee=Math.min(fee,rate.cap);
  return Math.max(0,fee-rate.ticketAmount);
}
