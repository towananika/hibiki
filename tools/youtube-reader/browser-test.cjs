const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/read',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({url:'https://www.youtube.com/watch?v=b-8DpsYLI7Y',title:'字幕の確認',author:'投稿者',language:'ko-orig',automatic:true,status:'read',message:'自動字幕',segments:[{start:1,text:'<img src=x onerror=alert(1)> テスト字幕'}]})}));
  for(const width of [390,1280]){
   await page.setViewportSize({width,height:850});await page.goto('http://127.0.0.1:9032/');
   await page.locator('#url').fill('https://youtu.be/b-8DpsYLI7Y');await page.locator('#read').click();
   await page.waitForSelector('#result:not([hidden])');
   assert.match(await page.locator('#transcript').innerText(),/テスト字幕/);assert.equal(await page.locator('#transcript img').count(),0);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.screenshot({path:path.join(require('node:os').tmpdir(),`youtube-reader-${width}.png`)});
  }
  await page.context().grantPermissions(['clipboard-read','clipboard-write'],{origin:'http://127.0.0.1:9032'});
  await page.locator('#copy').click();
  assert.match(await page.evaluate(()=>navigator.clipboard.readText()),/映像・音声は未確認/);
  await page.evaluate(()=>{const original=URL.createObjectURL;URL.createObjectURL=blob=>{window.savedBlob=blob;return original(blob);};HTMLAnchorElement.prototype.click=function(){window.savedName=this.download;};});
  await page.locator('#download').click();
  assert.equal(await page.evaluate(()=>window.savedName),'youtube-transcript.txt');
  assert.match(await page.evaluate(()=>window.savedBlob.text()),/テスト字幕/);
  await page.unroute('**/api/read');await page.route('**/api/read',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({status:'no_subtitles',message:'字幕なし',segments:[]})}));
  await page.locator('#read').click();await page.waitForFunction(()=>document.getElementById('status').textContent==='字幕なし');assert.equal(await page.locator('#result').isVisible(),false);
  assert.deepEqual(errors,[]);console.log('PASS: mobile/desktop, subtitles, copy, save payload, safe text rendering, missing subtitles clears stale content');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
