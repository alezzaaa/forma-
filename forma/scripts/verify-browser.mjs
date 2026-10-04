import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(process.env.QA_OUTPUT || resolve(root, 'artifacts/qa'));
await mkdir(output, { recursive: true });
const server = await createServer({ root, server: { host: '127.0.0.1', port: 0 } });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE || undefined, headless: true });
const results = [], errors = [];
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, timezoneId: 'Europe/Rome' });
await context.addInitScript(() => {
  window.__failWrites = 0;
  const original = IDBDatabase.prototype.transaction;
  IDBDatabase.prototype.transaction = function (...args) {
    if (args[1] === 'readwrite' && window.__failWrites > 0) { window.__failWrites--; throw new DOMException('QA write failure', 'QuotaExceededError'); }
    return original.apply(this, args);
  };
});
const page = await context.newPage();
page.on('pageerror', error => errors.push(error.message));
page.setDefaultTimeout(12000);
const log = name => { results.push(name); console.log(`PASS ${name}`); };
const tab = name => page.locator('.mobile-nav').getByRole('button', { name, exact: true }).click();
const today = () => page.locator('[data-page="home"]');
const create = () => page.locator('[data-page="create"]');
const wardrobe = () => page.locator('[data-page="wardrobe"]');
const dialog = () => page.getByRole('dialog');
const ids = scope => scope.locator('[data-garment-id]').evaluateAll(items => items.map(item => item.dataset.garmentId));
async function snapshot() {
  return page.evaluate(() => new Promise((resolve, reject) => { const request = indexedDB.open('forma-wardrobe', 1); request.onsuccess = () => { const db=request.result, tx=db.transaction('snapshots','readonly'), get=tx.objectStore('snapshots').get('current'); get.onsuccess=()=>resolve(get.result); tx.oncomplete=()=>db.close(); tx.onerror=()=>reject(tx.error); }; request.onerror=()=>reject(request.error); }));
}
async function capture(name) { await page.screenshot({ path: resolve(output, `${name}.png`), animations: 'disabled' }); }
async function noOverflow(label) { assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${label}: page overflow`); }
try {
  await page.goto(url);
  await today().getByRole('button', { name: 'Indosso questo', exact: true }).waitFor();
  assert.equal(await page.locator('.mobile-nav button').count(), 4);
  const rect = await today().locator('.outfit-wear-button').boundingBox();
  const nav = await page.locator('.mobile-nav').boundingBox();
  assert.ok(rect.y + rect.height < nav.y, 'today primary action within first 390 × 844 viewport');
  await capture('oggi-390');
  const originalIds = await ids(today()), beforeWear = await snapshot();
  await today().locator('.outfit-wear-button').evaluate(button => { button.click(); button.click(); });
  await today().getByRole('button', { name: 'Registrato per oggi', exact: true }).waitFor();
  const afterWear = await snapshot();
  assert.equal(afterWear.history.length, beforeWear.history.length + 1);
  assert.deepEqual([...afterWear.history[0].garmentIds].sort(), [...originalIds].sort());
  for (const garment of afterWear.garments) assert.equal(garment.wearCount, beforeWear.garments.find(g => g.id === garment.id).wearCount + Number(originalIds.includes(garment.id)));
  await today().locator('.outfit-wear-button').click();
  await page.getByText('Già registrato oggi', { exact: true }).first().waitFor();
  assert.equal((await snapshot()).history.length, afterWear.history.length);
  await tab('Guardaroba'); await tab('Oggi');
  assert.deepEqual(await ids(today()), originalIds);
  log('T01/T02/T13: exact worn IDs, double tap dedup, stable proposal across tabs');

  await today().locator('[data-garment-id]').first().click();
  const initialDialogCount = await dialog().count(); assert.equal(initialDialogCount, 1);
  assert.ok(await page.locator('.mobile-nav').evaluate(el => Boolean(el.closest('[inert]'))));
  const candidates = dialog().locator('.create-lock-choice');
  assert.ok(await candidates.count() > 0);
  await candidates.first().click();
  assert.deepEqual(await ids(today()), originalIds, 'candidate selection remains draft');
  await dialog().getByRole('button', { name: 'Annulla', exact: true }).click();
  assert.deepEqual(await ids(today()), originalIds);
  await today().locator('[data-garment-id]').first().click();
  await dialog().locator('.create-lock-choice').first().click();
  await dialog().getByRole('button', { name: 'Usa questo capo', exact: true }).click();
  await dialog().waitFor({ state: 'hidden' });
  const replacedIds = await ids(today());
  assert.equal(replacedIds.filter(id => !originalIds.includes(id)).length, 1);
  assert.equal(originalIds.filter(id => !replacedIds.includes(id)).length, 1);
  await page.waitForFunction(() => document.activeElement?.hasAttribute('data-garment-id'));
  log('T03: explicit replacement, cancel preserves look, exact one-slot change, focus restored');

  await page.evaluate(() => { window.__failWrites = 1; });
  const beforeFailure = await snapshot();
  await today().locator('.outfit-wear-button').click();
  await today().getByRole('alert').filter({ hasText: 'Non sono riuscito a registrarlo' }).waitFor();
  assert.deepEqual((await snapshot()).history, beforeFailure.history);
  assert.deepEqual(await ids(today()), replacedIds);
  await today().locator('.outfit-wear-button').click();
  await today().getByRole('button', { name: 'Registrato per oggi', exact: true }).waitFor();
  log('T11 wear: failure keeps proposal/data and retry succeeds');

  await tab('Crea');
  assert.equal(await create().locator('.outfit-card').count(), 0);
  await capture('crea-iniziale-390');
  await create().getByRole('button', { name: 'Mostrami un outfit', exact: true }).click();
  await create().locator('.outfit-card').first().waitFor();
  assert.equal(await create().locator('.outfit-card').count(), 3);
  await create().getByRole('button', { name: 'Successivo', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.outfit-carousel-count')?.textContent === '2 di 3');
  const secondCard = create().locator('.outfit-card').nth(1);
  await secondCard.getByRole('button', { name: 'Salva', exact: true }).click();
  await secondCard.getByRole('button', { name: 'Rimuovi dai salvati', exact: true }).waitFor();
  const beforeReject = await snapshot(), signaturesBefore = await ids(create());
  await secondCard.getByRole('button', { name: 'Altre azioni', exact: true }).click();
  await page.evaluate(() => { window.__failWrites = 1; });
  await secondCard.getByRole('button', { name: 'Non fa per me', exact: true }).click();
  await secondCard.getByRole('alert').waitFor();
  assert.deepEqual((await snapshot()).preferences, beforeReject.preferences);
  assert.deepEqual(await ids(create()), signaturesBefore);
  await secondCard.getByRole('button', { name: 'Non fa per me', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('.create-page .outfit-card [role="alert"]').length === 0);
  assert.ok((await snapshot()).preferences.dislikedSignatures.length > beforeReject.preferences.dislikedSignatures.length);
  log('T11 reject: failure does not remove card; preference commits before replacement');
  await create().getByRole('button', { name: 'Modifica', exact: true }).click();
  await create().getByRole('button', { name: 'Lavoro', exact: true }).click();
  assert.ok(await create().getByText('Le proposte vanno aggiornate.', { exact: true }).count());
  assert.ok(await create().locator('.outfit-wear-button').first().isDisabled());
  assert.ok(await create().locator('[data-garment-id]').first().isDisabled());
  await create().getByRole('button', { name: 'Aggiorna outfit', exact: true }).first().click();
  await page.waitForFunction(() => document.querySelector('.outfit-carousel-count')?.textContent === '1 di 3');
  await capture('crea-risultati-390');
  log('T05/T06: explicit generation, real carousel index, stale actions disabled, context resets index');

  const cardToSave = create().locator('.outfit-card').first();
  const saveAction = cardToSave.getByRole('button', { name: /^(Salva|Rimuovi dai salvati)$/ });
  const beforeSaveFailure = await snapshot();
  await page.evaluate(() => { window.__failWrites = 1; });
  await saveAction.click(); await cardToSave.getByRole('alert').waitFor();
  assert.deepEqual((await snapshot()).outfits, beforeSaveFailure.outfits);
  await saveAction.click();
  await cardToSave.getByRole('alert').waitFor({state:'hidden'});
  log('T11 save: failed write keeps favorites and retry succeeds');

  await create().getByRole('button', {name:'Modifica',exact:true}).click();
  const tops = (await snapshot()).garments.filter(g => ['Camicia','Polo','T-shirt'].includes(g.category));
  await create().getByRole('button', {name:'Scegli dal guardaroba',exact:true}).click();
  await dialog().locator('.create-lock-choice').filter({hasText:tops[0].name}).click();
  await dialog().getByRole('button',{name:'Usa questo capo',exact:true}).click();
  await create().getByRole('button', {name:'Aggiungi un altro capo',exact:true}).click();
  await dialog().locator('.create-lock-choice').filter({hasText:tops[1].name}).click();
  await dialog().getByText('Sostituire il capo bloccato?',{exact:true}).waitFor();
  assert.ok(await dialog().getByRole('button',{name:'Usa questo capo',exact:true}).isDisabled());
  await dialog().getByRole('button',{name:'Annulla',exact:true}).click();
  assert.ok((await create().locator('.create-locked-items').innerText()).includes(tops[0].name));
  await create().getByRole('button',{name:'Aggiorna outfit',exact:true}).first().click();
  await page.waitForFunction(id => [...document.querySelectorAll('.create-page .outfit-card')].every(card => [...card.querySelectorAll('[data-garment-id]')].some(g => g.dataset.garmentId === id)), tops[0].id);
  log('T04: slot conflict requires confirmation, cancel retains lock, every generated look includes it');

  await tab('Guardaroba');
  await wardrobe().getByRole('textbox', { name: 'Cerca un capo', exact: true }).fill('Camicia');
  const queryCount = await wardrobe().locator('.garment-card').count();
  await wardrobe().getByRole('button', { name: /^Filtri/ }).click();
  await dialog().getByLabel('Colore', { exact: true }).selectOption('Rosso');
  await dialog().getByRole('button', { name: 'Annulla', exact: true }).click();
  assert.equal(await wardrobe().locator('.garment-card').count(), queryCount);
  await wardrobe().getByRole('button', { name: /^Filtri/ }).click();
  await dialog().getByLabel('Colore', { exact: true }).selectOption('Rosso');
  assert.ok(await dialog().getByRole('button', { name: 'Mostra 0 capi', exact: true }).isEnabled());
  await capture('filtri-390');
  await dialog().getByRole('button', { name: 'Mostra 0 capi', exact: true }).click();
  await wardrobe().getByText('Nessun capo trovato.', { exact: true }).waitFor();
  await wardrobe().getByRole('button', { name: 'Azzera filtri', exact: true }).click();
  assert.equal(await wardrobe().getByRole('textbox', { name: 'Cerca un capo', exact: true }).inputValue(), 'Camicia');
  assert.equal(await wardrobe().locator('.garment-card').count(), queryCount);
  await wardrobe().getByRole('textbox', { name: 'Cerca un capo', exact: true }).fill('');
  log('T07: filter cancel/apply/zero results; reset retains search');

  await wardrobe().locator('.garment-card button').first().click();
  await dialog().getByRole('button', { name: 'Modifica capo', exact: true }).click();
  await dialog().getByLabel('Nome', { exact: true }).waitFor();
  const nameInput = dialog().getByLabel('Nome', { exact: true });
  const oldName = await nameInput.inputValue(), beforeEdit = await snapshot();
  const oldGarment = beforeEdit.garments.find(g => g.name === oldName);
  await capture('editor-390');
  await nameInput.fill(`${oldName} prova`);
  await dialog().getByRole('button', { name: 'Annulla', exact: true }).click();
  await page.getByText('Scartare le modifiche?', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Continua a modificare', exact: true }).click();
  await nameInput.fill('');
  await dialog().getByRole('button', { name: 'Salva', exact: true }).click();
  await dialog().getByText('Inserisci il nome del capo.', { exact: true }).first().waitFor();
  await page.waitForFunction(() => document.activeElement?.getAttribute('data-garment-field') === 'name');
  await nameInput.fill(`${oldName} aggiornato`);
  await page.evaluate(() => { window.__failWrites = 1; });
  await dialog().getByRole('button', { name: 'Salva', exact: true }).click();
  await dialog().getByText('Non sono riuscito a salvare il capo. Riprova.', { exact: true }).waitFor();
  assert.equal(await nameInput.inputValue(), `${oldName} aggiornato`);
  await dialog().getByRole('button', { name: 'Salva', exact: true }).click();
  await dialog().waitFor({ state: 'hidden' });
  const edited = (await snapshot()).garments.find(g => g.id === oldGarment.id);
  assert.deepEqual({ ...edited, name: oldName }, oldGarment);
  log('T08/T11 editor: dirty confirmation, validation focus, retry and hidden metadata retained');

  await page.getByRole('button', { name: 'Apri profilo', exact: true }).click();
  assert.equal(await page.locator('.mobile-nav').count(), 0);
  await page.getByRole('button', { name: 'Cronologia', exact: true }).click();
  await page.locator('.diary-page .saved-look-preview').first().click();
  await dialog().getByRole('button', { name: 'Crea una variante', exact: true }).click();
  const eventCard = create().locator('.outfit-card').first();
  await eventCard.waitFor();
  await page.waitForFunction(() => document.querySelectorAll('.create-page .outfit-card').length === 1 && document.querySelectorAll('.create-page .outfit-piece-lock').length === 0);
  assert.equal(await eventCard.locator('.outfit-piece-lock').count(), 0);
  await eventCard.getByRole('button', { name: 'Salva', exact: true }).click();
  await eventCard.getByRole('button', { name: 'Rimuovi dai salvati', exact: true }).waitFor();
  assert.equal(await eventCard.getByRole('alert').count(), 0);
  await tab('Salvati');
  const stored = await snapshot();
  assert.equal(await page.locator('.saved-page .saved-look-preview').count(), stored.outfits.filter(o => o.favorite).length);
  log('T09: favorites-only collection and history variant saves valid metadata without automatic locks');

  await page.locator('.saved-page .saved-look-preview').first().click();
  const priorDelete = await snapshot();
  await dialog().getByRole('button',{name:'Altre azioni',exact:true}).click();
  await dialog().getByRole('button',{name:'Elimina outfit',exact:true}).click();
  await dialog().getByText('L’outfit verrà eliminato dalla raccolta. La cronologia rimarrà disponibile.',{exact:true}).waitFor();
  await dialog().getByRole('button',{name:'Elimina outfit',exact:true}).click();
  await dialog().waitFor({state:'hidden'});
  assert.deepEqual((await snapshot()).history,priorDelete.history);
  assert.equal((await snapshot()).outfits.length,priorDelete.outfits.length-1);
  await tab('Guardaroba');
  await wardrobe().locator('.garment-card button').first().click();
  await dialog().getByRole('button',{name:'Altre azioni sul capo',exact:true}).click();
  await dialog().getByRole('button',{name:'Elimina capo',exact:true}).click();
  await dialog().getByText('Verranno eliminati anche gli outfit e le voci di cronologia che contengono questo capo. Le statistiche saranno ricalcolate.',{exact:true}).waitFor();
  await dialog().getByRole('button',{name:'Annulla',exact:true}).click();
  log('T10: outfit deletion preserves history; garment deletion declares linked consequences');

  await page.getByRole('button',{name:'Apri profilo',exact:true}).click();
  await page.getByRole('button',{name:'Statistiche',exact:true}).click();
  await page.getByRole('button',{name:'Apri profilo',exact:true}).click();
  await page.getByRole('heading',{name:'Profilo',exact:true}).waitFor();
  await page.getByRole('button',{name:'Indietro',exact:true}).click();
  assert.ok(await wardrobe().isVisible());
  await page.evaluate(()=>{location.hash='route-sconosciuta';});
  await today().waitFor({state:'visible'});
  log('Navigation: avatar resets Profile hub, Back returns to originating tab, unknown hash opens Today');

  for (const width of [320, 375, 390, 430, 1440]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    for (const [route, label] of [['home','Oggi'],['wardrobe','Guardaroba'],['create','Crea'],['outfits','Salvati']]) {
      await page.evaluate(route => { location.hash = route; }, route);
      await page.locator(`[data-page="${route}"]:not([hidden])`).waitFor();
      await noOverflow(`${label} at ${width}`);
    }
    await page.evaluate(() => { location.hash = 'home'; });
    await today().waitFor({ state: 'visible' });
    await capture(`oggi-${width}`);
  }
  await page.setViewportSize({ width: 844, height: 390 });
  await noOverflow('landscape'); await capture('oggi-landscape');
  await page.setViewportSize({ width: 320, height: 844 });
  await page.addStyleTag({ content: 'button, input, select, label, p, span { font-size: 24px !important; } h1, h2, h3 { font-size: 32px !important; }' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await noOverflow('320 large text / reduced motion');
  assert.equal(errors.length, 0, errors.join('\n'));
  log('T12 layouts: 320/375/390/430/1440, landscape, reduced motion, no page overflow/errors');
} catch (error) {
  await capture('failure');
  console.error(await page.locator('body').innerText());
  throw error;
} finally {
  await writeFile(resolve(output, 'browser-results.json'), JSON.stringify({ results, errors }, null, 2));
  await browser.close(); await server.close();
}
