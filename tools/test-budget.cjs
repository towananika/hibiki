const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/sync.js', route => route.fulfill({ body: '' }));
  await page.addInitScript(() => {
    if (localStorage.getItem('budget-test-seeded')) return;
    localStorage.setItem('hibiki-budget-v1', JSON.stringify({
      income: [{ id: 'salary', name: 'テスト所得', amt: 1000000 }],
      expense: [{ id: 'food', name: '食費', amt: 200000, kind: 'var', memo: '保持するメモ' }],
      saveRate: 20
    }));
    localStorage.setItem('budget-test-seeded', '1');
  });
  await page.goto(pathToFileURL(path.resolve(__dirname, '../money/budget.html')).href);
  const before = await page.evaluate(() => localStorage.getItem('hibiki-budget-v1'));
  await page.locator('#plan-amount').fill('300000');
  await page.locator('#plan-amount').dispatchEvent('input');
  assert.match(await page.locator('#plan-left').innerText(), /700,000/);
  assert.match(await page.locator('#plan-diff').innerText(), /100,000/);
  assert.equal(await page.evaluate(() => localStorage.getItem('hibiki-budget-v1')), before);
  await page.reload();
  assert.equal(await page.locator('#plan-amount').inputValue(), '300000');
  await page.locator('#plan-range').fill('1100000');
  assert.match(await page.locator('#plan-left').innerText(), /100,000/);
  assert.equal(await page.locator('#plan-result').getAttribute('data-negative'), 'true');
  await page.locator('#plan-reset').click();
  assert.equal(await page.locator('#plan-amount').inputValue(), '200000');
  await page.locator('#cout .quick-amount').fill('250000');
  await page.locator('#cout .quick-amount').dispatchEvent('change');
  assert.match(await page.locator('#tout').innerText(), /250,000/);
  assert.equal(await page.locator('#plan-amount').inputValue(), '250000');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('hibiki-budget-v1')).expense[0].memo), '保持するメモ');
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: path.resolve(__dirname, `../budget-${width}.png`), fullPage: true });
  }
  assert.deepEqual(errors, []);
  await browser.close();
  console.log('Budget: scenario isolation, persistence, deficit, reset, inline edit and responsive checks passed.');
})().catch(e => { console.error(e); process.exitCode = 1; });
