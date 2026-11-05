const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const server = http.createServer((req, res) => {
  if (req.url === '/test.html') {
    res.setHeader('Content-Type', 'text/html');
    res.end('<!doctype html><head><script src="/sync.js"></script></head><body><main>private</main></body>');
    return;
  }
  const file = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  res.setHeader('Content-Type', 'text/javascript');
  fs.createReadStream(file).on('error', () => { res.statusCode = 404; res.end(); }).pipe(res);
});
server.listen(0, '127.0.0.1', async () => {
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage();
    await page.addInitScript(() => localStorage.setItem('hb-sync-id', 'legacy-session'));
    await page.route('**/hibiki-sync.jaykim-can.workers.dev/**', route => route.fulfill({ status: 503, body: '' }));
    await page.route('**/triathlon/login/auth.js*', route => route.fulfill({ contentType: 'text/javascript', body: '' }));
    await page.route('**/firebase-auth.js', route => route.fulfill({ contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' }, body: `
      const auth = { currentUser: null }; export function getAuth(){return auth}
      export function onAuthStateChanged(a,cb){window.setTestUser = u => {a.currentUser=u;cb(u)};window.setTestUser(null)}
    ` }));
    await page.route('**/firebase-firestore.js', route => route.fulfill({ contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' }, body: `export function getFirestore(){return {}};export function doc(){return {}};export async function getDocFromServer(){throw Error('unexpected')}` }));
    await page.route('**/security/legacy-cloud-reader.mjs', route => route.fulfill({ contentType: 'text/javascript', body: `export function makeCloudLegacyReader(){return {clear(){}, async open(name){return {name, source:'cloud'}}}}` }));
    await page.goto(`http://127.0.0.1:${server.address().port}/test.html`);
    await page.waitForFunction(() => typeof window.setTestUser === 'function');
    assert.equal(await page.locator('main').isVisible(), false);
    assert.equal(await page.evaluate(() => HibikiSync.open('home')), null);
    await page.evaluate(() => setTestUser({ uid:'other', emailVerified:true }));
    assert.equal(await page.locator('main').isVisible(), false);
    await page.evaluate(() => setTestUser({ uid:'3wzoIaBNjLf9x0BW3HRUcqOHCAG2', emailVerified:false }));
    assert.equal(await page.locator('main').isVisible(), false);
    await page.evaluate(() => setTestUser({ uid:'3wzoIaBNjLf9x0BW3HRUcqOHCAG2', emailVerified:true }));
    assert.equal(await page.locator('main').isVisible(), true);
    assert.deepEqual(await page.evaluate(() => HibikiSync.open('home')), { name:'home', source:'cloud' });
    await page.evaluate(() => setTestUser(null));
    assert.equal(await page.locator('main').isVisible(), false);
    assert.equal(await page.evaluate(() => HibikiSync.open('home')), null);
    console.log('unified access: anonymous, other user, owner, sign-out passed');
  } catch (error) { console.error(error); process.exitCode = 1; }
  finally { if (browser) await browser.close(); server.close(); }
});
