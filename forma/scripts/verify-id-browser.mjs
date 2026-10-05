import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const { webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const server = await createServer({ root, server: { host: '0.0.0.0', port: 0 } });
let browser;
try {
  await server.listen();
  const lan = server.resolvedUrls.network[0];
  assert.ok(lan, 'An active LAN interface is required to test insecure HTTP');
  browser = await webkit.launch({ headless: true });
  for (const [label, url, secure] of [['localhost', server.resolvedUrls.local[0], true], ['LAN HTTP', lan, false]]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${url}#wardrobe`);
    await page.locator('[data-page="wardrobe"]').getByRole('heading', { name: 'Guardaroba', exact: true }).waitFor();
    const result = await page.evaluate(async () => {
      const { createId } = await import('/src/lib/id.ts');
      const { generateOutfits, getReplacementCandidates, replaceGarmentWith, outfitSignature } = await import('/src/lib/engine.ts');
      const { createTodaySession } = await import('/src/lib/todaySession.ts');
      const { recordWornOutfit, toggleSavedOutfit } = await import('/src/lib/mutations.ts');
      const { loadData, saveData, parseBackup } = await import('/src/lib/storage.ts');
      const { LocalRecognitionProvider } = await import('/src/lib/recognition.ts');
      const ids = Array.from({ length: 1000 }, () => createId());
      const original = await loadData();
      const { options } = createTodaySession(original);
      const outfits = generateOutfits(original.garments, original.preferences, options, 3).outfits;
      const slotId = outfits[0].garmentIds[0];
      const replacement = getReplacementCandidates(outfits[0], slotId, original.garments, original.preferences, options)[0];
      const draft = replaceGarmentWith(outfits[0], slotId, original.garments, original.preferences, options, replacement.id);
      const worn = recordWornOutfit({ ...original, outfits: [], history: [] }, draft).data;
      // A different combination with a colliding ID must receive a fresh saved ID.
      const candidate = outfits.find(o => outfitSignature(o.garmentIds) !== outfitSignature(draft.garmentIds));
      const saved = toggleSavedOutfit(worn, { ...candidate, id: draft.id });
      const collision = saved.outfits.find(item => outfitSignature(item.garmentIds) === outfitSignature(candidate.garmentIds));
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 32;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#345678'; ctx.fillRect(0, 0, 32, 32);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const { garment } = await new LocalRecognitionProvider().analyze(new File([blob], 'camicia.png', { type: 'image/png' }));
      const next = { ...saved, garments: [...saved.garments, garment] };
      await saveData(next);
      const restored = await loadData();
      const backup = parseBackup(JSON.stringify(restored));
      return {
        secure: isSecureContext, native: typeof crypto.randomUUID, randomValues: typeof crypto.getRandomValues,
        ids: [...ids, ...outfits.map(o => o.id), draft.id, worn.history[0].id, garment.id],
        collisionId: collision.id, draftId: draft.id, sourceId: outfits[0].id,
        persisted: JSON.stringify(backup) === JSON.stringify(next), version: restored.version,
      };
    });
    assert.equal(result.secure, secure);
    assert.equal(result.native, secure ? 'function' : 'undefined');
    assert.equal(result.randomValues, 'function');
    for (const id of result.ids) assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.equal(new Set(result.ids).size, result.ids.length);
    assert.notEqual(result.collisionId, result.draftId);
    assert.notEqual(result.draftId, result.sourceId);
    assert.equal(result.persisted, true);
    assert.equal(result.version, 1);
    // Opening a manual draft exercises UploadModal's ID generation, without saving it.
    await page.locator('.wardrobe-add-bar button').click();
    await page.getByRole('button', { name: 'Aggiungi senza foto', exact: true }).click();
    await page.getByRole('dialog').getByLabel('Nome', { exact: true }).waitFor();
    assert.deepEqual(errors, []);
    console.log(`PASS WebKit ${label}: Wardrobe, UUID v4, generation, variants, ID collision, wear history, photo recognition, manual draft, IndexedDB and backup v1`);
    await context.close();
  }
} finally {
  await browser?.close();
  await server.close();
}
