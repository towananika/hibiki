const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const server = http.createServer((req, res) => {
  let name = decodeURIComponent(req.url.split('?')[0]);
  if (name.endsWith('/')) name += 'index.html';
  const file = path.join(root, name);
  res.setHeader('Content-Type', /\.(mjs|js)$/.test(file) ? 'text/javascript' : 'text/html');
  fs.createReadStream(file).on('error', () => { res.statusCode = 404; res.end(); }).pipe(res);
});
server.listen(0, '127.0.0.1', async () => {
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    for (const width of [390, 1200]) {
      const page = await browser.newPage({ viewport: { width, height: 850 } });
      await page.route('**/triathlon/login/auth.js*', route => route.fulfill({ contentType: 'text/javascript', body: '' }));
      await page.route('**/firebase-auth.js', route => route.fulfill({ contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' }, body: `const auth={currentUser:{uid:'3wzoIaBNjLf9x0BW3HRUcqOHCAG2',emailVerified:true}};export function getAuth(){return auth};export function onAuthStateChanged(a,cb){cb(a.currentUser)}` }));
      await page.route('**/firebase-firestore.js', route => route.fulfill({ contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' }, body: 'export function getFirestore(){return {}};export function doc(){return {}};export async function getDocFromServer(){return {exists:()=>false}}' }));
      await page.goto(`http://127.0.0.1:${server.address().port}/plan/`);
      await page.getByRole('heading', { name: 'これからの計画' }).waitFor();
      assert.equal(await page.locator('.plan-tools iframe[src]').count(), 0);
      await page.locator('.plan-tools summary').first().click();
      await page.waitForFunction(() => !!document.querySelector('.plan-tools iframe[src]'));
      await page.frameLocator('iframe[title="今日の優先事項"]').getByRole('heading', { name: 'いま、これを' }).waitFor();
      await page.locator('#directory-search').fill('家計');
      assert.equal(await page.getByRole('link', { name: /家計/ }).count(), 1);
      assert.equal(await page.locator('#directory-list a:visible').count(), 1);
      await page.locator('#directory-search').fill('存在しない項目');
      assert.equal(await page.locator('#directory-empty').isVisible(), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.close();
      console.log(`plan hub ${width}px: ok`);
    }
  } catch (error) { console.error(error); process.exitCode = 1; }
  finally { if (browser) await browser.close(); server.close(); }
});
