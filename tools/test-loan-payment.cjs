const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const fixture={recordedAt:'2026-10-28',notifiedMonthlyPayment:100,calculatedPrincipal:1000,annualInterestRate:0.025,calculatedAverageMonthlyInterest:100,calculated31DayInterest365Basis:100,interpretation:'明細未確認',userAssessment:'収入を育てたい'};
 await page.route('https://housing.test/**',async route=>{const u=new URL(route.request().url());if(u.pathname==='/sync.js')return route.fulfill({contentType:'text/javascript',body:`window.HibikiSync={open:async n=>n==='housing-loan-20261028'?${JSON.stringify(fixture)}:null};`});try{await route.fulfill({contentType:u.pathname.endsWith('.mjs')?'text/javascript':'text/html',body:fs.readFileSync('.'+u.pathname)});}catch{await route.fulfill({status:404,body:''});}});
 await page.goto('https://housing.test/home/index.html');await page.locator('#loan-payment').waitFor({state:'visible'});
 assert.equal(await page.locator('#loan-payment-amount').innerText(),'100ウォン');assert.equal(await page.locator('#loan-payment-priority').innerText(),fixture.userAssessment);assert.deepEqual(errors,[]);
 console.log('Loan payment: decrypted display passed');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
