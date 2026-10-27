const {chromium}=require('C:/Users/Hibiki/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  try {
    const page=await browser.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const item={id:'sample',kind:'purchase',title:'表示確認用の品物',wish:'希望は未設定',price:'参考値・未確認',priceType:'未再確認',next:'条件を考える',details:['仮案'],sources:[]};
    const fixture={notice:'テスト用データ',dream:{id:'sample-dream',text:'表示確認用の夢',at:'2026-10-27'},items:[item,{...item,id:'service',kind:'service',title:'表示確認用サービス'}]};
    await page.route('https://preview.invalid/**',async route=>{
      const url=new URL(route.request().url());
      if(url.pathname==='/sync.js')return route.fulfill({contentType:'text/javascript',body:'window.HibikiSync={open:async name=>name==="wishlist-20261027"?('+JSON.stringify(fixture)+'):null};'});
      const file=path.join(process.cwd(),url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname);
      return route.fulfill({contentType:file.endsWith('.mjs')?'text/javascript':file.endsWith('.css')?'text/css':'text/html',body:fs.readFileSync(file)});
    });
    const check=(condition,label)=>{if(!condition)throw Error(label);};
    await page.goto('https://preview.invalid/dreams/');await page.locator('article').waitFor();
    check(await page.locator('a[href*="notes"]').count()===0,'no notepad link');
    check((await page.locator('.remaining').textContent()).includes('未算定'),'unknown amount');
    await page.locator('input[name=budget]').fill('1000');await page.locator('input[name=saved]').fill('200');await page.locator('#purchases button[type=submit]').click();
    check((await page.locator('.remaining').textContent()).includes('800'),'remaining');
    await page.reload();check(await page.locator('input[name=budget]').inputValue()==='1000','persistence');
    await page.locator('[data-filter=service]').click();check(await page.locator('input[name=saved]').count()===0,'monthly service');
    await page.locator('[data-filter=all]').click();check(await page.locator('article').count()===2,'filter');
    for(const width of [390,1280]){await page.setViewportSize({width,height:900});check(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),'overflow');await page.screenshot({path:path.join('C:/Users/Hibiki','wishes-preview-'+width+'.png'),fullPage:true});}
    await page.goto('https://preview.invalid/wishes/');await page.waitForURL('**/dreams/#purchases');await page.waitForTimeout(200);await page.reload();await page.waitForTimeout(200);
    check(await page.locator('.d').count()===1,'dream deduplication');check(errors.length===0,errors.join(','));
    console.log('PASS: unknown values, budget, persistence, filters, mobile/desktop, dream deduplication, no JS errors');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
