const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const archive = JSON.stringify({ version: 1, kind: 'hibiki-legacy-records', entries: [{ title: 'about', text: JSON.stringify({ md: '# Test\n## Sample\nhello', at: '<img src=x onerror=alert(1)>' }) }] });
const saved = { archive, sha256: crypto.createHash('sha256').update(archive).digest('hex'), entryCount: 1, format: 'hibiki-archive-v1' };
const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  res.setHeader('Content-Type', file.endsWith('.mjs') || file.endsWith('.js') ? 'text/javascript' : 'text/html');
  fs.createReadStream(file).on('error', () => { res.statusCode = 404; res.end(); }).pipe(res);
});
server.listen(0, '127.0.0.1', async () => {
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.route('**/sync.js', route => route.fulfill({ contentType: 'text/javascript', body: `window.legacy=false; window.HibikiSync={on:()=>window.legacy,open:async()=>({md:${JSON.stringify('# Legacy\n## Old\nold record')}})};` }));
    await page.route('**/triathlon/login/auth.js*', route => route.fulfill({ contentType: 'text/javascript', body: '' }));
    await page.route('**/firebase-auth.js', route => route.fulfill({ contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' }, body: `const auth={currentUser:null};export function getAuth(){return auth};export function onAuthStateChanged(a,cb){window.changeAuth=u=>{auth.currentUser=u;cb(u)};window.changeAuth(null)}` }));
    await page.route('**/firebase-firestore.js', route => route.fulfill({ contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' }, body: `export function getFirestore(){return {}};export function doc(){return {}};export async function getDocFromServer(){return {exists:()=>true,data:()=>(${JSON.stringify(saved)})}}` }));
    await page.goto(`http://127.0.0.1:${server.address().port}/about/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.changeAuth === 'function');
    if (!(await page.locator('#box').innerText()).includes('記録を開けません')) throw Error('signed-out state missing');
    await page.evaluate(() => window.changeAuth({ uid:'other', emailVerified:true }));
    if (await page.locator('#all').count()) throw Error('other user saw record');
    await page.evaluate(() => window.changeAuth({ uid:'3wzoIaBNjLf9x0BW3HRUcqOHCAG2', emailVerified:true }));
    await page.locator('#all').waitFor();
    if (!(await page.locator('#secs').innerText()).includes('Sample')) throw Error('owner data missing');
    if (await page.locator('#box img').count()) throw Error('unsafe HTML');
    await page.evaluate(() => window.changeAuth(null));
    if (await page.locator('#all').count() || (await page.locator('#secs').innerText())) throw Error('private data retained after logout');
    await page.evaluate(() => { window.legacy = true; window.changeAuth(null); });
    await page.waitForFunction(() => document.querySelector('#secs').textContent.includes('Old'));
    console.log('about Google and legacy login: ok');
  } catch (error) { console.error(error); process.exitCode = 1; }
  finally { if (browser) await browser.close(); server.close(); }
});
