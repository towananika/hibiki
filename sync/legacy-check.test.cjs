const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  res.setHeader('Content-Type', file.endsWith('.mjs') ? 'text/javascript' : 'text/html');
  fs.createReadStream(file).on('error', () => { res.statusCode = 404; res.end(); }).pipe(res);
});
server.listen(0, '127.0.0.1', async () => {
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage();
    await page.route('**/triathlon/login/auth.js*', route => route.fulfill({ contentType: 'text/javascript', body: 'window.triLogin=async()=>{};' }));
    await page.route('**/firebase-auth.js', route => route.fulfill({ contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' }, body: `const auth={currentUser:null};export function getAuth(){return auth};export function onAuthStateChanged(a,cb){window.changeAuth=u=>{auth.currentUser=u;cb(u)};window.changeAuth(null)}` }));
    await page.route('**/firebase-firestore.js', route => route.fulfill({ contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' }, body: `let saved=null;window.changeSaved=()=>{saved={archive:'different'}};window.readSaved=()=>saved;export function getFirestore(){return {}};export function doc(){return {}};export async function runTransaction(db,fn){return fn({get:async()=>({exists:()=>!!saved}),set:(ref,data)=>{saved=data}})};export async function getDocFromServer(){return {exists:()=>!!saved,data:()=>saved}}` }));
    await page.route('**/security/legacy-decrypt.mjs', route => route.fulfill({ contentType: 'text/javascript', body: `export function makeLegacyOpener(){return async()=>({fake:'record'})}` }));
    await page.goto(`http://127.0.0.1:${server.address().port}/sync/legacy-check.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.changeAuth === 'function');
    if (!(await page.locator('#check').isDisabled())) throw Error('anonymous can check');
    await page.evaluate(() => window.changeAuth({ uid:'other', emailVerified:true }));
    if (!(await page.locator('#check').isDisabled())) throw Error('other account can check');
    await page.evaluate(() => window.changeAuth({ uid:'3wzoIaBNjLf9x0BW3HRUcqOHCAG2', emailVerified:true }));
    await page.locator('#check').click();
    if (!(await page.locator('#result').innerText()).includes('鍵が見つかりません')) throw Error('missing key not reported');
    await page.evaluate(() => localStorage.setItem('hb-key', 'fake-test-key'));
    await page.locator('#check').click();
    await page.getByText('15種類を読み取れました。まだクラウドには送っていません。').waitFor();
    page.on('dialog', dialog => dialog.accept());
    await page.locator('#backup').click();
    await page.getByText('15種類を読み戻し、一致を確認しました。元の記録は残っています。').waitFor();
    await page.evaluate(() => window.changeSaved());
    await page.locator('#backup').click();
    await page.getByText('保存済みの内容が異なるか、読み戻せませんでした。上書きはしていません。').waitFor();
    if (await page.evaluate(() => window.readSaved().archive) !== 'different') throw Error('existing archive overwritten');
    if (await page.evaluate(() => localStorage.length) !== 1) throw Error('unexpected storage changes');
    await page.evaluate(() => window.changeAuth(null));
    if ((await page.locator('#result').innerText()) !== '') throw Error('result not cleared');
    console.log('legacy readiness screen: ok');
  } catch (error) { console.error(error); process.exitCode = 1; }
  finally { if (browser) await browser.close(); server.close(); }
});
