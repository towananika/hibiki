const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const vm = require('node:vm');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const note = fs.readFileSync(path.join(root, 'study/notes/open11.md'), 'utf8');
assert(!/[\uac00-\ud7af]/u.test(note), 'Japanese lesson must not contain Hangul');
const quizzes = [...note.matchAll(/```quiz\n([\s\S]*?)```/g)];
assert.equal(quizzes.length, 6);
for (const [, quiz] of quizzes) {
  assert.match(quiz, /^Q: .+/m);
  for (let n = 1; n <= 4; n++) assert.match(quiz, new RegExp('^' + n + ': .+', 'm'));
  assert.match(quiz, /^C: [1-4]$/m);
  assert.match(quiz, /^E: .*ほかの選択肢：/m);
}
JSON.parse(fs.readFileSync(path.join(root, 'study/glossary.json'), 'utf8'));
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'study/materials.js'), 'utf8'), context);
assert.equal(context.window.StudyMaterials.open[11], 'view.html?n=open11');
for (let n = 12; n <= 15; n++) assert(!context.window.StudyMaterials.open[n], 'Deferred lesson must remain unavailable');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.md': 'text/plain' };
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, body) => {
    if (error) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', (types[path.extname(file)] || 'application/octet-stream') + '; charset=utf-8');
    res.end(body);
  });
});
(async () => {
  let browser;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = 'http://127.0.0.1:' + server.address().port;
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    for (const width of [390, 1280]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.route('**/sync.js*', route => route.fulfill({ contentType: 'text/javascript', body: '' }));
      await page.goto(base + '/study/view.html?n=open11');
      await page.locator('#doc .mcq').first().waitFor();
      assert.equal(await page.locator('#doc .mcq').count(), 6);
      assert.equal(await page.locator('.lec a[aria-current="page"]').count(), 1);
      assert.equal(await page.locator('.lec a').count(), 3);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Page must not overflow');
      const quiz = page.locator('.mcq').first();
      await quiz.locator('.choice').nth(0).click();
      assert.equal(await quiz.locator('.feedback').isVisible(), true);
      assert.equal(await quiz.locator('.explanation').isVisible(), true);
      await quiz.locator('.retry').click();
      await quiz.locator('.choice').nth(2).click();
      assert.equal(await quiz.locator('.choice.is-correct').count(), 1);
      await page.screenshot({ path: path.join(process.env.TEMP, 'hibiki-open11-' + width + '.png'), fullPage: true });
      await page.close();
      console.log(width + 'px: rendering, navigation, quiz and retry PASS');
    }
    console.log('Open11 content and deferred availability PASS');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
