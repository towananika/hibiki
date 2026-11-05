const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  res.setHeader('Content-Type', file.endsWith('.mjs') || file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
  fs.createReadStream(file).on('error', () => { res.statusCode = 404; res.end(); }).pipe(res);
});
server.listen(0, '127.0.0.1', async () => {
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.route('**/triathlon/login/auth.js*', route => route.fulfill({ contentType: 'text/javascript', body: '' }));
    await page.route('**/firebase-auth.js', route => route.fulfill({ contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' }, body: `const auth={};export function getAuth(){return auth};export function onAuthStateChanged(a,cb){window.changeAuth=cb;cb(null)}` }));
    await page.route('**/sync.js', route => route.fulfill({ contentType: 'text/javascript', body: 'window.HibikiSync={on:()=>false};' }));
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.changeAuth === 'function');
    if (await page.locator('main').isVisible() || !(await page.locator('#owner-gate').isVisible())) throw Error('anonymous gate failed');
    await page.evaluate(() => window.changeAuth({ uid:'other', emailVerified:true }));
    if (await page.locator('main').isVisible()) throw Error('other account allowed');
    await page.evaluate(() => window.changeAuth({ uid:'3wzoIaBNjLf9x0BW3HRUcqOHCAG2', emailVerified:false }));
    if (await page.locator('main').isVisible()) throw Error('unverified account allowed');
    await page.evaluate(() => window.changeAuth({ uid:'3wzoIaBNjLf9x0BW3HRUcqOHCAG2', emailVerified:true }));
    if (!(await page.locator('main').isVisible()) || await page.locator('#owner-gate').isVisible()) throw Error('owner blocked');
    await page.evaluate(() => window.changeAuth(null));
    if (await page.locator('main').isVisible()) throw Error('sign-out retained access');
    console.log('owner home gate: ok');
  } catch (error) { console.error(error); process.exitCode = 1; }
  finally { if (browser) await browser.close(); server.close(); }
});
