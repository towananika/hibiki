const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const url = pathToFileURL(path.resolve(__dirname, '../money/budget.html')).href;
  // Synthetic amounts in ten-thousand won, matching home/index.html's schema.
  const home = { deposit: 1000, loanPct: 50, rate: 2.4, rent: 10, fee: 3 };
  for (const fixture of [
    { home, amount: 0, expected: 140000 },
    { home, amount: 140000, expected: 140000 },
    { home, amount: 99000, expected: 99000 },
    { home: { ...home, fee: null }, amount: 0, expected: 0 },
    { home: null, amount: 0, expected: 0 }
  ]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/sync.js', r => r.fulfill({ body: '' }));
    await page.addInitScript(f => {
      if (!localStorage.getItem('fixture-seeded')) {
        localStorage.setItem('hibiki-budget-v1', JSON.stringify({
          income: [{ id: 'i', name: '所得', amt: 1000000 }],
          expense: [{ id: 'h', name: '住まい', amt: f.amount, kind: 'fixed', memo: '既存メモ' }]
        }));
        localStorage.setItem('hibiki-budget-housing-seeded', '1');
        localStorage.setItem('fixture-seeded', '1');
      }
      window.HibikiSync = { open: async name => name === 'home' ? f.home : null };
    }, fixture);
    await page.goto(url);
    await page.waitForTimeout(100);
    const state = await page.evaluate(() => JSON.parse(localStorage.getItem('hibiki-budget-v1')));
    assert.equal(state.expense[0].amt, fixture.expected);
    assert.match(state.expense[0].memo, /既存メモ/);
    if (fixture.expected === 140000) {
      assert.deepEqual(state.expense[0].parts.map(p => p.name), ['家賃', '管理費', 'ローン利息']);
      assert.equal(state.expense[0].parts.reduce((s,p) => s + p.amt, 0), 140000);
    }
    if (fixture.home && fixture.amount === 0 && fixture.home.fee !== null) {
      assert.match(state.expense[0].memo, /家賃.*管理費.*利息/);
      await page.locator('#need details').first().locator('summary').click();
      await page.screenshot({ path:path.resolve(__dirname, '../budget-housing-parts.png'), fullPage:true });
      await page.locator('#cout .quick-amount').fill('0');
      await page.locator('#cout .quick-amount').dispatchEvent('change');
      await page.reload();
      await page.waitForTimeout(100);
      assert.equal(await page.locator('#cout .quick-amount').inputValue(), '0');
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
  await browser.close();
  console.log('Housing: computed import, legacy marker, memo preservation, manual edits, incomplete data and repeat-load checks passed.');
})().catch(e => { console.error(e); process.exitCode = 1; });
