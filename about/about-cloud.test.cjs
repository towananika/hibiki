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
    await page.route('**/triathlon/login/auth.js*', route => route.fulfill({ contentType: 'text/javascript', body: '' }));
    await page.route('**/firebase-auth.js', route => route.fulfill({ contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' }, body: `const auth={currentUser:null};export function getAuth(){return auth};export function onAuthStateChanged(a,cb){window.changeAuth=u=>{auth.currentUser=u;cb(u)};window.changeAuth(null)}` }));
    await page.route('**/firebase-firestore.js', route => route.fulfill({ contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' }, body: `export function getFirestore(){return {}};export function doc(){return {}};export async function getDocFromServer(){return {exists:()=>true,data:()=>(${JSON.stringify(saved)})}}` }));
    let active = null; const calls = [];
    await page.route('**/hibiki-sync.jaykim-can.workers.dev/ai/*', route => {
      const req = route.request(), action = req.url().split('/ai/')[1];
      calls.push({ action, auth: req.headers()['authorization'] || '', body: req.postData() || '' });
      if (action === 'issue') active = { code: '0427', scope: JSON.parse(req.postData()).scope, exp: Date.now() + 300000, fails: 0 };
      if (action === 'revoke') active = null;
      const log = active ? [] : [{ at: Date.now(), scope: 'safe', end: 'revoked' }];
      route.fulfill({ contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(action === 'issue' ? active : { active, log }) });
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/about/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.changeAuth === 'function');
    if (!(await page.locator('#box').innerText()).includes('記録を開けません')) throw Error('signed-out state missing');
    await page.evaluate(() => window.changeAuth({ uid:'other', emailVerified:true }));
    if (await page.locator('#all').count()) throw Error('other user saw record');
    await page.evaluate(() => window.changeAuth({ uid:'3wzoIaBNjLf9x0BW3HRUcqOHCAG2', emailVerified:false }));
    if (await page.locator('#all').count()) throw Error('unverified user saw record');
    if (calls.length) throw Error('non-owner reached AI code endpoint');
    await page.evaluate(() => window.changeAuth({ uid:'3wzoIaBNjLf9x0BW3HRUcqOHCAG2', emailVerified:true, getIdToken: async () => 'tok' }));
    await page.locator('#all').waitFor();
    if (!(await page.locator('#secs').innerText()).includes('Sample')) throw Error('owner data missing');
    await page.locator('#ai-new').click();
    await page.locator('.code').waitFor();
    if ((await page.locator('.code').innerText()) !== '0427') throw Error('code not shown');
    const issue = calls.find(c => c.action === 'issue');
    if (issue.auth !== 'Bearer tok' || JSON.parse(issue.body).scope !== 'safe') throw Error('issue request wrong');
    if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT, fullPage: true });
    await page.locator('#ai-stop').click();
    await page.locator('#ai-new').waitFor();
    if (!(await page.locator('#ai .log').innerText()).includes('取り消し')) throw Error('revoke log missing');
    if (await page.locator('#box img').count()) throw Error('unsafe HTML');
    await page.evaluate(() => window.changeAuth(null));
    if (await page.locator('#all').count() || (await page.locator('#secs').innerText())) throw Error('private data retained after logout');
    if (await page.locator('#ai').isVisible()) throw Error('AI code card visible after logout');
    await page.evaluate(() => { localStorage.setItem('hb-sync-id', 'legacy-test'); window.changeAuth(null); });
    if (await page.locator('#all').count()) throw Error('legacy session bypassed Google login');
    console.log('about owner-only Google login: ok');
  } catch (error) { console.error(error); process.exitCode = 1; }
  finally { if (browser) await browser.close(); server.close(); }
});
