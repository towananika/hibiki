const {chromium}=require('playwright'),assert=require('node:assert/strict');const {extractPage}=require('./extract.cjs');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setContent('<html><head><meta property="og:title" content="Example on Instagram"><meta property="og:description" content="5 likes: &quot;A test caption.&quot;"></head><body><article><h1>Example caption from article.</h1><time datetime="2026-10-28T00:00:00Z"></time></article></body></html>');
 let result=await page.evaluate(extractPage);assert.equal(result.caption,'Example caption from article.');assert.equal(result.author,'Example');
 await page.setContent('<meta property="og:description" content="5 likes: &quot;Metadata caption.&quot;">');result=await page.evaluate(extractPage);assert.equal(result.caption,'Metadata caption.');assert.equal(result.source,'メタ情報のみ');
 await page.setContent('<body>Recommendations are not the post caption</body>');assert.equal((await page.evaluate(extractPage)).caption,'');
 await page.route('**/api/read',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({status:'read',url:'https://www.instagram.com/p/Example/',author:'Example',caption:'<script>unsafe</script>\nSample caption',message:'Test fixture',media:[]})}));
 await page.goto('http://127.0.0.1:9031/');await page.locator('#url').fill('https://www.instagram.com/p/Example/');await page.locator('#read').click();await page.locator('#result').waitFor({state:'visible',timeout:5000}).catch(async error=>{throw Error(`${error.message}; status=${await page.locator('#status').innerText()}; errors=${JSON.stringify(errors)}`);});assert.match(await page.locator('#caption').innerText(),/<script>/);assert.equal(await page.locator('#caption script').count(),0);
 for(const width of [390,1280]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:`C:/Users/Hibiki/instagram-reader-${width}.png`,fullPage:true});}
 assert.deepEqual(errors,[]);console.log('Browser checks: article/metadata extraction, no invented caption, safe rendering, 390/1280px passed');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
