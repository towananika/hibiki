const $=id=>document.getElementById(id),won=n=>`${Math.round(n).toLocaleString('ja-JP')}ウォン`;
try{
 const data=await window.HibikiSync?.open('housing-loan-20261028');
 if(data&&[data.notifiedMonthlyPayment,data.calculatedPrincipal,data.annualInterestRate,data.calculatedAverageMonthlyInterest,data.calculated31DayInterest365Basis].every(Number.isFinite)){
  $('loan-payment-date').textContent=`${data.recordedAt} 記録`;
  $('loan-payment-amount').textContent=won(data.notifiedMonthlyPayment);
  $('loan-payment-basis').textContent=`借入 ${won(data.calculatedPrincipal)}・年利 ${data.annualInterestRate*100}％。今回の通知額は31日分の利息とほぼ一致します。`;
  $('loan-payment-detail').textContent=`借入残高 × 年利 × 31日 ÷ 365日 ＝ 約${won(data.calculated31DayInterest365Basis)}。月平均は約${won(data.calculatedAverageMonthlyInterest)}。${data.interpretation} この通知額を毎月固定の支出として家計に自動入力していません。`;
  $('loan-payment-priority').textContent=data.userAssessment;
  $('loan-payment').hidden=false;
 }
}catch{ /* Keep personal financial details hidden if decryption is unavailable. */ }
