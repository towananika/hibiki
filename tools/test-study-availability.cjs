const {chromium} = require('playwright');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
(async () => {
  const browser = await chromium.launch({channel:'msedge',headless:true});
  try {
    for (const colorScheme of ['light','dark']) {
      const page = await browser.newPage({viewport:{width:390,height:844},colorScheme});
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.route('https://study.test/**', async route => {
        const url = new URL(route.request().url());
        if (url.pathname === '/sync.js') return route.fulfill({body:''});
        const file = path.join(root, decodeURIComponent(url.pathname));
        try { await route.fulfill({path:file}); } catch { await route.fulfill({status:404,body:''}); }
      });
      await page.goto('https://study.test/study/index.html');
      await page.waitForSelector('.lec-grid a');
      const fallback = page.locator('[data-subject="dig"] .lec-tile').first();
      const missing = page.locator('[data-subject="trad"] .lec-tile').first();
      assert.equal(await fallback.getAttribute('href'),'digital.html#c0');
      assert.match(await fallback.getAttribute('class'),/has-page/);
      assert.match(await fallback.getAttribute('aria-label'),/要点のみ/);
      assert.equal(await missing.getAttribute('aria-disabled'),'true');
      assert.equal(await missing.getAttribute('href'),null);
      assert.notEqual(await fallback.evaluate(e=>getComputedStyle(e).backgroundColor),await missing.evaluate(e=>getComputedStyle(e).backgroundColor));
      await page.locator('[data-chart-course="trad"]').click();
      const check = page.locator('#record-trad-1');
      await check.check();
      assert.equal(await check.isChecked(),true);
      assert.match(await missing.getAttribute('class'),/is-unavailable.*is-done/);
      await page.locator('#progress-close').click();
      assert.equal(await missing.evaluate(e=>getComputedStyle(e).backgroundColor), colorScheme==='light' ? 'rgb(232, 232, 232)' : 'rgb(51, 51, 51)');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await page.screenshot({path:path.join(require('node:os').tmpdir(),`study-availability-${colorScheme}.png`),fullPage:true});
      await page.setViewportSize({width:1280,height:900});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      assert.deepEqual(errors,[]);
      await page.close();
    }
    console.log('PASS: available notes and overview links, missing gray, progress preserved, mobile/desktop, light/dark');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
