const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const archive = JSON.stringify({ version: 1, kind: 'hibiki-browser-snapshot', entries: [{ title: 'hibiki-health-v1', text: '<img src=x onerror=alert(1)> sleep' }, { title: 'hibiki-budget-v1', text: 'budget' }] });
const saved = { archive, sha256: crypto.createHash('sha256').update(archive).digest('hex'), entryCount: 2, format: 'hibiki-archive-v1' };
const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  res.setHeader('Content-Type', file.endsWith('.mjs') ? 'text/javascript' : 'text/html');
  fs.createReadStream(file).on('error', () => { res.statusCode = 404; res.end(); }).pipe(res);
});
server.listen(0, '127.0.0.1', async () => {
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.route('**/triathlon/login/auth.js*', route => route.fulfill({ contentType: 'text/javascript', body: 'window.triLogin=async()=>{};' }));
    await page.route('**/firebase-auth.js', route => route.fulfill({ contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' }, body: `const auth={currentUser:null};export function getAuth(){return auth};export function onAuthStateChanged(auth,cb){window.changeAuth=u=>{auth.currentUser=u;cb(u)};window.changeAuth({uid:'3wzoIaBNjLf9x0BW3HRUcqOHCAG2',emailVerified:true})}` }));
    await page.route('**/firebase-firestore.js', route => route.fulfill({ contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' }, body: `export function getFirestore(){return {}};export function doc(){return {}};export async function getDocFromServer(){return {exists:()=>true,data:()=>(${JSON.stringify(saved)})}}` }));
    await page.goto(`http://127.0.0.1:${server.address().port}/sync/backup-review.html`);
    await page.locator('#list summary').first().waitFor({ timeout: 8000 });
    if (!(await page.locator('#comparison').innerText()).includes('未保存 2種類')) throw Error('comparison missing');
    await page.locator('#search').fill('健康');
    if (await page.locator('#list summary').count() !== 1) throw Error('category search failed');
    await page.locator('#list summary').click();
    if (await page.locator('#list img').count()) throw Error('unsafe HTML');
    if (await page.evaluate(() => localStorage.length) !== 0) throw Error('review changed storage');
    await page.evaluate(() => localStorage.setItem('hibiki-health-v1', 'other device value'));
    await page.locator('#refresh').click();
    if (!(await page.locator('#comparison').innerText()).includes('内容が異なる 1種類')) throw Error('conflict count missing');
    await page.locator('#conflict-details > summary').click();
    if (!(await page.locator('#conflicts').innerText()).includes('hibiki-health-v1')) throw Error('conflict detail missing');
    await page.locator('#conflicts summary').click();
    const conflict = await page.locator('#conflicts').innerText();
    if (!conflict.includes('other device value') || !conflict.includes('<img src=x onerror=alert(1)> sleep')) throw Error('side-by-side values missing');
    if (await page.locator('#conflicts img').count()) throw Error('unsafe conflict HTML');
    if (await page.evaluate(() => localStorage.getItem('hibiki-health-v1')) !== 'other device value') throw Error('comparison overwrote data');
    await page.evaluate(() => localStorage.setItem('hb-sync-id', 'legacy'));
    await page.locator('#restore').click();
    if (!(await page.locator('#restore-message').innerText()).includes('復元を止めました')) throw Error('legacy sync was not blocked');
    if (await page.evaluate(() => localStorage.getItem('hibiki-budget-v1')) !== null) throw Error('legacy session wrote data');
    await page.evaluate(() => localStorage.removeItem('hb-sync-id'));
    page.once('dialog', dialog => dialog.dismiss());
    await page.locator('#restore').click();
    if (await page.evaluate(() => localStorage.getItem('hibiki-budget-v1')) !== null) throw Error('cancelled restore wrote data');
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#restore').click();
    if (await page.evaluate(() => localStorage.getItem('hibiki-budget-v1')) !== 'budget') throw Error('missing data not restored');
    if (await page.evaluate(() => localStorage.getItem('hibiki-health-v1')) !== 'other device value') throw Error('restore overwrote conflict');
    await page.evaluate(() => window.changeAuth(null));
    if (!(await page.locator('#records').isHidden()) || await page.locator('#list summary').count() || await page.locator('#conflicts li').count()) throw Error('sign-out did not clear records');
    console.log('backup review and comparison: ok');
  } catch (error) { console.error(error); process.exitCode = 1; }
  finally { if (browser) await browser.close(); server.close(); }
});
