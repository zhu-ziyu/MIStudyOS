import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); }
catch {
  const bundled = process.env.STUDYOS_PLAYWRIGHT_PATH || `${process.env.USERPROFILE}/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright`;
  playwright = require(bundled);
}
mkdirSync('artifacts', { recursive: true });
const browserPath = process.env.STUDYOS_BROWSER_PATH || ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', playwright.chromium.executablePath()].find(existsSync);
console.log('Launching UI verification');
const browser = await playwright.chromium.launch({ headless: true, executablePath: browserPath, timeout: 20000 });
const errors = [];
const page = await browser.newPage({ viewport: { width: 1672, height: 941 }, timezoneId: 'America/Toronto' });
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
console.log('Browser started');
await page.goto('http://127.0.0.1:4173', { waitUntil: 'domcontentloaded', timeout: 20000 });
console.log('Homepage loaded');
await page.waitForFunction(() => window.studyos);
await page.screenshot({ path: 'artifacts/home-intro.png' });
await page.locator('#skip-intro').click();
await page.waitForFunction(() => window.studyos.getState().introRunning === false);
assert.equal(await page.locator('.module-button').count(), 10, 'Ten independent module controls');
await page.locator('#toggle-motion').click();
await page.mouse.move(0, 0);
await page.screenshot({ path: 'artifacts/home-desktop.png' });
console.log('Desktop captured');

// Each of the ten true DOM controls opens its own correctly labelled shell.
for (const id of ['course','calendar','assignment','flashcards','writing','exam','inbox','originality','daily','grades']) {
  await page.locator(`#${id}`).click();
  assert.ok(await page.locator('#module-dialog').evaluate(node => node.open));
  assert.equal(await page.evaluate(() => window.studyos.getState().activeModule), id);
  assert.ok((await page.locator('#dialog-title').textContent()).includes('宓语'));
  await page.locator('#module-dialog .close-dialog').click();
}
await page.locator('#home-search').fill('writing');
assert.equal(await page.locator('#search-results button').count(), 1);
await page.locator('#home-search').press('Enter');
await page.waitForFunction(() => window.studyos.getState().activeModule === 'writing');
assert.equal(await page.evaluate(() => window.studyos.getState().activeModule), 'writing');
await page.keyboard.press('Escape');
await page.locator('#home-search').fill('不存在的课程编号');
assert.ok(await page.locator('.search-empty').isVisible());
await page.locator('#home-search').press('Escape');

await page.locator('.settings-button').click();
await page.locator('input[name=name]').fill('Alex');
await page.locator('.save-settings').click();
assert.equal(await page.locator('.user-name').textContent(), 'Alex');
await page.reload();
await page.waitForFunction(() => window.studyos);
assert.equal(await page.locator('.user-name').textContent(), 'Alex');
await page.evaluate(() => window.studyos.finishIntro());
await page.locator('.notification-button').click();
assert.ok((await page.locator('#dialog-title').textContent()).includes('安静'));
await page.keyboard.press('Escape');

await page.setViewportSize({ width: 1280, height: 720 });
await page.screenshot({ path: 'artifacts/home-1280.png' });
await page.setViewportSize({ width: 390, height: 844 });
console.log('Module, search and settings checks passed');
await page.screenshot({ path: 'artifacts/home-mobile.png', fullPage: true });
assert.ok(await page.locator('#daily').isVisible());
assert.ok(await page.locator('#writing').isVisible());
const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
assert.equal(mobileOverflow, false, 'Mobile layout should not scroll horizontally');

const reduced = await browser.newPage({ viewport: { width: 1672, height: 941 }, reducedMotion: 'reduce' });
reduced.on('pageerror', error => errors.push(error.message));
await reduced.goto('http://127.0.0.1:4173');
await reduced.waitForFunction(() => window.studyos && !window.studyos.getState().introRunning);
assert.equal(await reduced.evaluate(() => window.studyos.getState().motion), false);
assert.equal(await reduced.locator('.module-button').count(), 10);
await reduced.locator('#course').click();
assert.ok(await reduced.locator('#module-dialog').evaluate(node => node.open));
assert.deepEqual(errors, []);
const report = { passed: true, checks: ['10 module entrances', 'intro skip settles to complete UI', 'search, Enter and empty results', 'modal close and Escape', 'settings persist', 'notifications', '1280 desktop', '390 mobile without overflow', 'reduced motion', 'no browser errors or failed assets'], screenshots: ['home-desktop.png', 'home-1280.png', 'home-mobile.png', 'home-intro.png'] };
writeFileSync('artifacts/verification.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
