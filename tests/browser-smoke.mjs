import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { catalogue, mockBackend, simulationFor } from './fixtures/backend.mjs';
import { calculateTco } from '../shared/tco.js';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:5173';
const screenshotDir = new URL('../output/screenshots/', import.meta.url);
const storageKey = 'autocompare_tco_state';
const defaults = { kilometrage_annuel: 15000, duree_annees: 5, region: 'FR' };
const captureOnly = process.argv.includes('--capture-only');
const scenarioFilter = process.argv.find(arg => arg.startsWith('--scenario='))?.slice('--scenario='.length);
const captureScenarios = new Set(['Desktop: catalogue, real API contract and keyboard selection', 'Mobile 390px: usable comparison without horizontal page overflow']);
let vite;
let browser;
let failures = 0;

async function eventually(check, description, timeout = 10000) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeout) {
    try { await check(); return; } catch (error) { lastError = error; }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error(`${description}: ${lastError?.message || 'timeout'}`, { cause: lastError });
}

async function serverReady() {
  try { return (await fetch(baseURL, { signal: AbortSignal.timeout(1000) })).ok; } catch { return false; }
}

async function ensureServer() {
  if (await serverReady()) return;
  const { hostname, port } = new URL(baseURL);
  vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', hostname, '--port', port || '5173', '--strictPort'], {
    cwd: projectRoot,
    windowsHide: true,
    env: { ...process.env, CHOKIDAR_USEPOLLING: 'true' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  vite.stdout.on('data', chunk => { output += chunk; });
  vite.stderr.on('data', chunk => { output += chunk; });
  vite.on('error', error => { output += error.message; });
  await eventually(async () => assert.ok(await serverReady(), output || 'Waiting for Vite'), 'Vite did not start', 20000);
}

const posts = state => state.requests.filter(request => request.method === 'POST');
const selectedCards = page => page.locator('.vehicle-card[aria-pressed="true"]');
const totalValues = async page => (await page.locator('.comparison-total-row td').allTextContents()).map(text => Number(text.replace(/[^\d]/g, '')));

async function setRange(page, name, value) {
  const slider = page.getByRole('slider', { name });
  const current = Number(await slider.inputValue());
  const step = Number(await slider.getAttribute('step')) || 1;
  const count = Math.abs(value - current) / step;
  assert.ok(Number.isInteger(count), 'Range target must be aligned to its step');
  await slider.focus();
  for (let index = 0; index < count; index++) await page.keyboard.press(value > current ? 'ArrowRight' : 'ArrowLeft');
}

async function waitForResults(page, state, expectedPayload) {
  await eventually(async () => {
    const latest = posts(state).at(-1);
    assert.ok(latest?.responded, 'Waiting for the simulation response');
    if (expectedPayload) assert.deepEqual(latest.body, expectedPayload);
    assert.deepEqual(await totalValues(page), state.respondToSimulation(latest.body).resultats.map(result => result.cout_total));
  }, 'The UI must display the latest simulation');
}

async function freshPage(options = {}, backendOptions = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true, ...options });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const state = await mockBackend(page, backendOptions);
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await waitForResults(page, state);
  return { page, context, state, errors };
}

async function scenario(name, action) {
  if (captureOnly && !captureScenarios.has(name)) return;
  if (scenarioFilter && !name.includes(scenarioFilter)) return;
  try {
    await action();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures++;
    console.error(`FAIL ${name}\n${error.stack}`);
  }
}

async function capture(page, filename) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images, image => { image.loading = 'eager'; return image.decode().catch(() => {}); }));
  });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ path: fileURLToPath(new URL(filename, screenshotDir)), animations: 'disabled' });
  await page.screenshot({ path: fileURLToPath(new URL(filename.replace('.png', '-full.png'), screenshotDir)), fullPage: true, animations: 'disabled' });
}

try {
  await mkdir(screenshotDir, { recursive: true });
  await ensureServer();
  browser = await chromium.launch({ headless: true });

  await scenario('Catalogue comfort: direct pages, scoped filters, keyboard suggestions and verified photos', async () => {
    const records = Array.from({ length: 2872 }, (_, index) => ({ ...catalogue[index % 2], id: `carapi_${index + 1}`, source: 'carapi', annee: 2020, simulable: true,
      marque: index % 2 ? 'Tesla' : 'Toyota', modele_base: index % 2 ? '3' : 'Camry', modele: index % 2 ? '3 Long Range' : 'Camry LE', image_url: undefined }));
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
      const page = await context.newPage();
      const requests = [];
      const errors = [];
      let failSuggestions = false;
      page.on('pageerror', error => errors.push(error.message));
      try {
        await page.route('**/api/**', async route => {
          const url = new URL(route.request().url());
          requests.push(url);
          let response;
          if (url.pathname.endsWith('/catalogue-options')) {
            if (failSuggestions) return route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"Suggestions indisponibles"}' });
            if (url.searchParams.get('make') === 'Toyota') await new Promise(resolve => setTimeout(resolve, 900));
            response = { makes: ['Toyota', 'Tesla'], models: url.searchParams.get('make') === 'Tesla' ? ['Model 3', 'Model S'] : url.searchParams.get('make') === 'Toyota' ? ['Camry', 'Corolla'] : [] };
          } else if (url.pathname.endsWith('/simulation')) {
            const params = route.request().postDataJSON();
            response = { resultats: calculateTco(params.vehicule_ids.map(id => records.find(vehicle => vehicle.id === id)), params) };
          } else if (url.pathname.endsWith('/vehicules')) {
            const number = Number(url.searchParams.get('page') || 1);
            const filtered = records.filter(v => !url.searchParams.get('make') || v.marque === url.searchParams.get('make'));
            const pages = Math.ceil(filtered.length / 12);
            response = { data: filtered.slice((number - 1) * 12, number * 12), meta: { source: 'carapi', access: 'public', year: Number(url.searchParams.get('year') || 2020), page: number, pages, total: filtered.length, hasMore: number < pages, usdToEur: .92 } };
          } else response = records.find(v => url.pathname.endsWith(`/${v.id}`));
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(response) });
        });
        await page.goto(baseURL);
        await page.locator('.comparison-total-row').waitFor();
        assert.match(await page.locator('.carapi-browser').innerText(), /TOUT LE CATALOGUE/);
        assert.match(await page.locator('.page-filter-panel').innerText(), /SUR CETTE PAGE UNIQUEMENT/);
        const originalSelection = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).selectedIds, storageKey);
        const remoteCalls = () => requests.filter(url => url.pathname.endsWith('/vehicules'));
        const local = page.getByRole('searchbox', { name: 'Filtrer les véhicules de cette page' });
        const countBefore = remoteCalls().length;
        await local.fill('Tesla');
        assert.equal(await page.locator('.vehicle-card').count(), 6);
        assert.equal(remoteCalls().length, countBefore, 'Local filters never search the remote catalogue');
        await local.fill('');
        await page.locator('.verified-photo').first().scrollIntoViewIfNeeded();
        await eventually(async () => assert.ok(await page.locator('.verified-photo').first().evaluate(img => img.complete && img.naturalWidth > 0)), 'Curated photo loads');
        await page.locator('.photo-credits summary').click();
        assert.match(await page.locator('.photo-credits').innerText(), /Bull-Doser/);
        assert.match(await page.locator('.photo-credits').innerText(), /CC BY-SA 4.0/);
        const target = page.getByRole('spinbutton', { name: 'Aller à la page' });
        await target.fill('241');
        await page.getByRole('button', { name: 'Aller', exact: true }).click();
        assert.equal(remoteCalls().length, countBefore);
        await target.fill('15');
        await target.press('Enter');
        await page.locator('.catalog-pagination p').filter({ hasText: /page 15 sur 240/ }).waitFor();
        await page.locator('.comparison-total-row').waitFor();
        assert.equal(await page.locator('.vehicle-card').count(), 12);
        assert.equal(await page.evaluate(() => document.activeElement.id), 'catalog-title');
        assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).selectedIds, storageKey), originalSelection);
        await target.fill('240');
        await page.getByRole('button', { name: 'Aller', exact: true }).click();
        await page.locator('.catalog-pagination p').filter({ hasText: /page 240 sur 240/ }).waitFor();
        assert.equal(await page.locator('.vehicle-card').count(), 4);
        assert.equal(await page.getByRole('button', { name: 'Suivant', exact: true }).isDisabled(), true);
        const brand = page.getByRole('combobox', { name: 'Marque CarAPI' });
        await brand.fill('Toy');
        await page.getByRole('option', { name: 'Toyota', exact: true }).waitFor();
        await brand.press('ArrowDown'); await brand.press('Enter');
        assert.equal(await brand.inputValue(), 'Toyota');
        await eventually(async () => assert.ok(requests.some(url => url.pathname.endsWith('/catalogue-options') && url.searchParams.get('make') === 'Toyota')), 'Models requested after selecting the brand');
        await brand.fill('Tes');
        await brand.press('ArrowDown'); await brand.press('Enter');
        const model = page.getByRole('combobox', { name: 'Modèle CarAPI' });
        await model.focus();
        await page.getByRole('option', { name: 'Model 3', exact: true }).waitFor();
        await model.press('ArrowDown'); await model.press('Enter');
        assert.equal(await model.inputValue(), 'Model 3');
        await local.fill('unknown');
        await page.locator('.remote-search').getByRole('button', { name: 'Rechercher' }).click();
        await page.locator('.catalog-pagination p').filter({ hasText: /page 1 sur 120/ }).waitFor();
        assert.equal(await local.inputValue(), '', 'New global search resets page filters');
        assert.equal(await page.locator('.vehicle-card').count(), 12);
        await target.fill('20'); await target.press('Enter');
        await page.locator('.catalog-pagination p').filter({ hasText: /page 20 sur 120/ }).waitFor();
        assert.equal(remoteCalls().at(-1).searchParams.get('make'), 'Tesla');
        assert.equal(remoteCalls().at(-1).searchParams.get('model'), 'Model 3');
        await page.locator('.carapi-browser').evaluate(element => element.scrollIntoView({ block: 'start', behavior: 'instant' }));
        await page.screenshot({ path: fileURLToPath(new URL(`catalogue-comfort-${viewport.width}.png`, screenshotDir)) });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        failSuggestions = true;
        await page.getByRole('spinbutton', { name: 'Millésime CarAPI' }).fill('2019');
        await eventually(async () => assert.match(await page.locator('.carapi-browser [role="status"]').innerText(), /temporairement indisponibles/), 'Suggestion errors keep free text available');
        assert.equal(await model.inputValue(), '', 'A different year clears the old model');
        await model.fill('Model 3');
        await page.locator('.remote-search').getByRole('button', { name: 'Rechercher' }).click();
        await page.locator('.catalog-pagination p').filter({ hasText: /page 1 sur 120/ }).waitFor();
        assert.equal(remoteCalls().at(-1).searchParams.get('year'), '2019');
        await page.route('**/images/catalogue/tesla-model-3-2018.jpg?failed', route => route.abort('failed'));
        const failedCard = page.locator('.vehicle-card').first();
        await failedCard.locator('img').evaluate(img => { img.src += '?failed'; });
        await failedCard.getByText('Visuel indisponible', { exact: true }).waitFor();
        assert.equal(await failedCard.locator('.vehicle-photo-label').count(), 0, 'A failed photo returns to the neutral placeholder');
        assert.equal(await failedCard.isEnabled(), true, 'A missing image never prevents selection');
        assert.deepEqual(errors, []);
      } finally { await context.close(); }
    }
  });

  await scenario('Personal estimates: validation, independent values, persistence, PDF and mobile', async () => {
    const { page, context, state, errors } = await freshPage({}, {
      respondToSimulation: parameters => ({ resultats: calculateTco(parameters.vehicule_ids.map(id => catalogue.find(vehicle => vehicle.id === id)), parameters) }),
    });
    try {
      await page.locator('.estimation-editor summary').click();
      const purchase = page.getByLabel('Prix d’achat envisagé', { exact: true });
      const resale = page.getByLabel('Revente estimée après 5 ans', { exact: true });
      await purchase.fill('18000');
      await resale.fill('19000');
      const before = posts(state).length;
      await page.getByRole('button', { name: 'Appliquer au comparatif' }).click();
      assert.match(await page.locator('.estimation-error').innerText(), /ne peut pas dépasser/);
      assert.equal(posts(state).length, before, 'Invalid resale never starts a calculation');
      await resale.fill('9000');
      await page.getByLabel('Consommation en usage réel', { exact: true }).fill('6');
      await page.getByLabel('Prix de l’énergie', { exact: true }).fill('2');
      await page.getByLabel('Assurance par an', { exact: true }).fill('600');
      await page.getByLabel('Entretien par an', { exact: true }).fill('500');
      await page.getByLabel('Autres frais par an', { exact: true }).fill('0');
      const custom = { prix_achat: 18000, valeur_revente: 9000, consommation: 6, prix_energie: 2, assurance_annuelle: 600, entretien_annuel: 500, autres_annuels: 0 };
      let expected = { vehicule_ids: ['veh_001', 'veh_002'], ...defaults, ajustements: { veh_001: custom } };
      await page.getByRole('button', { name: 'Appliquer au comparatif' }).click();
      await waitForResults(page, state, expected);
      assert.equal((await totalValues(page))[0], 23500);
      assert.equal(await page.getByRole('button', { name: 'Appliquer au comparatif' }).isDisabled(), true);
      await page.locator('.calculation-assumptions summary').click();
      assert.match(await page.locator('.applied-assumptions').innerText(), /18\s*000 €/);
      assert.match(await page.locator('.applied-assumptions').innerText(), /Saisi/);
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 30000 }),
        page.getByRole('button', { name: 'Exporter mon comparatif', exact: true }).click(),
      ]);
      const pdf = await readFile(await download.path());
      assert.ok(pdf.toString('latin1').includes('18 000,00 EUR'));
      await download.saveAs(fileURLToPath(new URL('../output/estimation-personnalisee.pdf', import.meta.url)));

      await page.reload({ waitUntil: 'domcontentloaded' });
      await waitForResults(page, state, expected);
      await page.locator('.estimation-editor summary').click();
      assert.equal(await purchase.inputValue(), '18000');
      assert.equal(await page.getByLabel('Autres frais par an', { exact: true }).inputValue(), '0');
      await page.getByLabel('Véhicule à personnaliser', { exact: true }).selectOption('veh_002');
      assert.equal(await purchase.inputValue(), '', 'Each vehicle has its own assumptions');
      await purchase.fill('24000');
      await page.getByRole('button', { name: 'Appliquer au comparatif' }).click();
      expected = { ...expected, ajustements: { ...expected.ajustements, veh_002: { prix_achat: 24000 } } };
      await waitForResults(page, state, expected);
      await page.getByLabel('Votre pays', { exact: true }).selectOption('CH');
      expected = { ...expected, region: 'CH' };
      await waitForResults(page, state, expected);
      assert.equal((await totalValues(page))[0], 23500, 'Country factor does not multiply a personal energy price');

      await setRange(page, 'Durée de possession', 6);
      const { valeur_revente: _oldResale, ...remaining } = custom;
      expected = { ...expected, duree_annees: 6, ajustements: { ...expected.ajustements, veh_001: remaining } };
      await waitForResults(page, state, expected);
      assert.match(await page.locator('.inline-notice').innerText(), /valeurs de revente personnalisées ont été réinitialisées/);
      await page.getByLabel('Véhicule à personnaliser', { exact: true }).selectOption('veh_001');
      assert.equal(await page.getByLabel('Revente estimée après 6 ans', { exact: true }).inputValue(), '');
      await page.setViewportSize({ width: 390, height: 844 });
      await page.locator('.estimation-editor').evaluate(element => element.scrollIntoView({ block: 'start', behavior: 'instant' }));
      await page.screenshot({ path: fileURLToPath(new URL('estimation-mobile.png', screenshotDir)), animations: 'disabled' });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No mobile page overflow');
      await page.getByRole('button', { name: 'Revenir aux références' }).click();
      expected = { ...expected, ajustements: { veh_002: { prix_achat: 24000 } } };
      await waitForResults(page, state, expected);
      assert.equal(await purchase.inputValue(), '');
      await page.getByLabel('Véhicule à personnaliser', { exact: true }).selectOption('veh_002');
      assert.equal(await purchase.inputValue(), '24000', 'Reset only affects the current vehicle');
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  });

  await scenario('Desktop: catalogue, real API contract and keyboard selection', async () => {
    const { page, context, state, errors } = await freshPage();
    try {
      assert.equal(await page.locator('.vehicle-card').count(), 6);
      assert.equal(await selectedCards(page).count(), 2);
      const addToyota = page.getByRole('button', { name: /Ajouter Toyota Yaris/ });
      await addToyota.focus();
      await page.keyboard.press('Space');
      await waitForResults(page, state, { vehicule_ids: ['veh_001', 'veh_002', 'veh_004'], ...defaults });
      assert.equal(await selectedCards(page).count(), 3);
      await page.keyboard.press('Enter');
      await waitForResults(page, state, { vehicule_ids: ['veh_001', 'veh_002'], ...defaults });
      assert.equal(await selectedCards(page).count(), 2);
      await capture(page, 'desktop.png');
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  });

  await scenario('Search handles accents; filters and sorting preserve the selection', async () => {
    const { page, context, state } = await freshPage();
    try {
      const search = page.getByRole('searchbox', { name: 'Rechercher un véhicule' });
      await search.fill('megane');
      await eventually(async () => assert.equal(await page.locator('.vehicle-card').count(), 1), 'Accent-insensitive model search');
      assert.match(await page.locator('.vehicle-card').textContent(), /Mégane/);
      await search.fill('électrique');
      await eventually(async () => assert.equal(await page.locator('.vehicle-card').count(), 3), 'Accent-insensitive energy search');
      await page.getByRole('button', { name: 'Effacer la recherche' }).click();
      await page.getByRole('group', { name: 'Filtrer par motorisation' }).getByRole('button', { name: 'Diesel', exact: true }).click();
      assert.equal(await page.locator('.vehicle-card').count(), 1);
      await page.getByRole('button', { name: 'Tous les véhicules', exact: true }).click();
      await page.getByRole('combobox', { name: 'Trier les véhicules' }).selectOption('price');
      assert.match(await page.locator('.vehicle-card').first().textContent(), /Clio/);
      assert.equal(await selectedCards(page).count(), 2);
      assert.equal(posts(state).length, 1, 'Catalogue display filters should not recalculate unchanged selections');
    } finally { await context.close(); }
  });

  await scenario('Parameters, presets and saved preferences survive a reload', async () => {
    const { page, context, state } = await freshPage();
    try {
      await page.getByRole('button', { name: 'Grand rouleur', exact: true }).click();
      await page.getByRole('combobox', { name: 'Votre pays' }).selectOption('CH');
      const expected = { vehicule_ids: ['veh_001', 'veh_002'], kilometrage_annuel: 30000, duree_annees: 4, region: 'CH' };
      await waitForResults(page, state, expected);
      await setRange(page, 'Durée de possession', 7);
      expected.duree_annees = 7;
      await waitForResults(page, state, expected);
      const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey);
      assert.deepEqual(saved.selectedIds, expected.vehicule_ids);
      assert.deepEqual(saved.params, { kilometrage_annuel: 30000, duree_annees: 7, region: 'CH' });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await waitForResults(page, state, expected);
      assert.equal(await page.getByRole('slider', { name: 'Durée de possession' }).inputValue(), '7');
      assert.equal(await page.getByRole('combobox', { name: 'Votre pays' }).inputValue(), 'CH');
    } finally { await context.close(); }
  });

  await scenario('Zero selection shows an empty state and disables PDF export', async () => {
    const { page, context, state } = await freshPage();
    try {
      while (await selectedCards(page).count()) await selectedCards(page).first().click();
      await eventually(async () => assert.equal(await page.locator('.comparison-total-row').count(), 0), 'Clear stale comparison');
      assert.equal(await page.getByRole('button', { name: 'Exporter mon comparatif', exact: true }).isDisabled(), true);
      assert.equal(posts(state).some(request => request.body.vehicule_ids.length === 0), false);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.locator('.vehicle-card').first().waitFor();
      assert.equal(await selectedCards(page).count(), 0, 'An intentional empty selection must persist');
      await page.getByRole('button', { name: /Ajouter Renault Clio/ }).click();
      await waitForResults(page, state, { vehicule_ids: ['veh_001'], ...defaults });
    } finally { await context.close(); }
  });

  await scenario('An older slow simulation cannot overwrite the latest results', async () => {
    const { page, context, state } = await freshPage();
    try {
      state.delayFor = body => body.kilometrage_annuel === 30000 ? 1300 : 20;
      await setRange(page, 'Kilométrage annuel', 30000);
      await eventually(async () => assert.equal(posts(state).at(-1).body.kilometrage_annuel, 30000), 'Start the slow request');
      assert.equal(await page.locator('.recommendation-card').count(), 0, 'The previous recommendation must disappear while inputs are changing');
      assert.equal(await page.getByRole('button', { name: 'Exporter mon comparatif', exact: true }).isDisabled(), true);
      await setRange(page, 'Kilométrage annuel', 40000);
      const expected = { vehicule_ids: ['veh_001', 'veh_002'], ...defaults, kilometrage_annuel: 40000 };
      await waitForResults(page, state, expected);
      await new Promise(resolve => setTimeout(resolve, 1400));
      await waitForResults(page, state, expected);
    } finally { await context.close(); }
  });

  await scenario('POST errors retry the failed simulation without reloading the catalogue', async () => {
    const { page, context, state } = await freshPage();
    try {
      const catalogueRequests = state.requests.filter(request => request.path.endsWith('/vehicules')).length;
      state.simulationErrors.push({ status: 500, message: 'Simulation temporairement indisponible.' });
      await setRange(page, 'Kilométrage annuel', 20000);
      await page.getByRole('alert').waitFor();
      assert.match(await page.getByRole('alert').textContent(), /Simulation temporairement indisponible/);
      await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
      await waitForResults(page, state, { vehicule_ids: ['veh_001', 'veh_002'], ...defaults, kilometrage_annuel: 20000 });
      assert.equal(state.requests.filter(request => request.path.endsWith('/vehicules')).length, catalogueRequests);
    } finally { await context.close(); }
  });

  for (const includeMissingIds of [true, false]) {
    await scenario(`404 removes only unavailable vehicles (${includeMissingIds ? 'IDs provided' : 'detail lookup'})`, async () => {
      const { page, context, state } = await freshPage();
      try {
        state.includeMissingIds = includeMissingIds;
        state.missingIds.add('veh_002');
        await setRange(page, 'Kilométrage annuel', 22000);
        await waitForResults(page, state, { vehicule_ids: ['veh_001'], ...defaults, kilometrage_annuel: 22000 });
        assert.equal(await selectedCards(page).count(), 1);
        assert.match(await selectedCards(page).textContent(), /Clio/);
        assert.match(await page.locator('.inline-notice').textContent(), /retiré de votre sélection/);
        if (!includeMissingIds) assert.ok(state.requests.some(request => request.path.endsWith('/vehicules/veh_002')));
      } finally { await context.close(); }
    });
  }

  await scenario('Catalogue errors retry correctly; demo mode reconnects to the API', async () => {
    const { page, context, state } = await freshPage();
    try {
      state.catalogueStatus = 500;
      await page.getByRole('button', { name: 'Actualiser le catalogue', exact: true }).click();
      await page.getByRole('alert').waitFor();
      assert.match(await page.getByRole('alert').textContent(), /Catalogue temporairement indisponible/);
      assert.equal(await page.locator('.recommendation-card').count(), 0);
      state.catalogueStatus = 200;
      await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
      await waitForResults(page, state, { vehicule_ids: ['veh_001', 'veh_002'], ...defaults });
      const beforeDemo = posts(state).length;
      state.networkFailure = true;
      await page.getByRole('button', { name: 'Actualiser le catalogue', exact: true }).click();
      await page.getByText('Mode démonstration', { exact: true }).waitFor();
      await page.locator('.comparison-total-row').waitFor();
      assert.equal(posts(state).length, beforeDemo, 'Local catalogue simulations must not POST demo IDs to the API');
      state.networkFailure = false;
      await page.getByRole('button', { name: 'Reconnecter' }).click();
      await waitForResults(page, state, { vehicule_ids: ['veh_001', 'veh_002'], ...defaults });
      assert.equal(await page.getByText('Mode démonstration', { exact: true }).count(), 0);
    } finally { await context.close(); }
  });

  await scenario('Catalogue failure remains actionable while profile and selection change', async () => {
    const { page, context, state } = await freshPage();
    try {
      state.catalogueStatus = 500;
      await page.getByRole('button', { name: 'Actualiser le catalogue', exact: true }).click();
      await page.getByRole('alert').waitFor();
      const postCount = posts(state).length;
      await page.getByRole('button', { name: 'Grand rouleur', exact: true }).click();
      await page.getByRole('button', { name: /Ajouter Toyota Yaris/ }).click();
      assert.match(await page.getByRole('alert').textContent(), /Catalogue temporairement indisponible/);
      assert.equal(await page.locator('.result-loading').count(), 0, 'An unavailable catalogue must not leave simulation loading indefinitely');
      assert.equal(await page.locator('#resultats').getAttribute('aria-busy'), 'false');
      assert.equal(await selectedCards(page).count(), 3);
      await new Promise(resolve => setTimeout(resolve, 350));
      assert.equal(posts(state).length, postCount, 'No simulation starts before catalogue recovery');
      state.catalogueStatus = 200;
      await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
      await waitForResults(page, state, { vehicule_ids: ['veh_001', 'veh_002', 'veh_004'], kilometrage_annuel: 30000, duree_annees: 4, region: 'FR' });
      assert.equal(await page.getByRole('alert').count(), 0);
    } finally { await context.close(); }
  });

  await scenario('Distinct live selections survive demo mode, a browser reload and reconnection', async () => {
    const liveCatalogue = catalogue.map(vehicle => ({ ...vehicle, id: vehicle.id.replace('veh_', 'live_') }));
    const respondToSimulation = payload => {
      const response = simulationFor({ ...payload, vehicule_ids: payload.vehicule_ids.map(id => id.replace('live_', 'veh_')) });
      return { resultats: response.resultats.map(result => ({ ...result, vehicule_id: result.vehicule_id.replace('veh_', 'live_') })) };
    };
    const { page, context, state } = await freshPage({}, { catalogue: liveCatalogue, respondToSimulation });
    try {
      await page.getByRole('button', { name: /Retirer Renault Clio.*comparatif/ }).click();
      await page.getByRole('button', { name: /Ajouter Toyota Yaris/ }).click();
      const expected = { vehicule_ids: ['live_002', 'live_004'], ...defaults };
      await waitForResults(page, state, expected);
      state.networkFailure = true;
      await page.getByRole('button', { name: 'Actualiser le catalogue', exact: true }).click();
      await page.getByText('Mode démonstration', { exact: true }).waitFor();
      await page.locator('.comparison-total-row').waitFor();
      const readSaved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey);
      assert.deepEqual((await readSaved()).apiSelectedIds, ['live_002', 'live_004']);
      assert.equal((await readSaved()).source, 'local');
      await page.getByRole('button', { name: /Ajouter Peugeot e-208/ }).click();
      await page.locator('.comparison-total-row').waitFor();
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByText('Mode démonstration', { exact: true }).waitFor();
      await page.locator('.comparison-total-row').waitFor();
      assert.deepEqual((await readSaved()).apiSelectedIds, ['live_002', 'live_004']);
      assert.equal(await selectedCards(page).count(), 3, 'Demo selection also survives the reload independently');
      state.networkFailure = false;
      await page.getByRole('button', { name: 'Reconnecter' }).click();
      await waitForResults(page, state, expected);
      assert.equal(await selectedCards(page).count(), 2);
      assert.match(await selectedCards(page).first().textContent(), /Mégane/);
      assert.match(await selectedCards(page).last().textContent(), /Yaris/);
      assert.deepEqual((await readSaved()).selectedIds, ['live_002', 'live_004']);
      assert.equal((await readSaved()).source, 'api');
    } finally { await context.close(); }
  });

  await scenario('A successful retry clears an earlier PDF download error', async () => {
    const { page, context } = await freshPage();
    try {
      await page.evaluate(() => {
        const createObjectURL = URL.createObjectURL.bind(URL);
        URL.createObjectURL = blob => {
          if (blob.type === 'application/pdf') {
            URL.createObjectURL = createObjectURL;
            throw new Error('Simulated PDF download failure');
          }
          return createObjectURL(blob);
        };
      });
      await page.getByRole('button', { name: 'Exporter mon comparatif', exact: true }).click();
      await page.getByRole('alert').waitFor();
      assert.match(await page.getByRole('alert').textContent(), /Le PDF n’a pas pu être créé/);
      const downloadReady = page.waitForEvent('download', { timeout: 30000 });
      await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
      const download = await downloadReady;
      assert.equal(await download.failure(), null);
      await eventually(async () => assert.equal(await page.getByRole('alert').count(), 0), 'Successful export clears its previous error');
    } finally { await context.close(); }
  });

  await scenario('PDF export produces a valid multi-page downloadable report', async () => {
    const { page, context, state, errors } = await freshPage();
    try {
      while (await page.locator('.vehicle-card[aria-pressed="false"]').count()) await page.locator('.vehicle-card[aria-pressed="false"]').first().click();
      await waitForResults(page, state);
      const downloadReady = page.waitForEvent('download', { timeout: 30000 });
      await page.getByRole('button', { name: 'Exporter mon comparatif', exact: true }).click();
      const download = await downloadReady;
      const pdfPath = fileURLToPath(new URL('../output/comparatif-test.pdf', import.meta.url));
      await download.saveAs(pdfPath);
      const pdf = await readFile(pdfPath);
      assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
      assert.ok(pdf.length > 5000);
      const pages = pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)?.length || 0;
      assert.ok(pages >= 2, `Expected pagination for six vehicles, found ${pages} page(s)`);
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  });

  await scenario('Readiness: partial catalogue retries and complete off-page selection on desktop and mobile', async () => {
    const records = Array.from({ length: 24 }, (_, index) => ({
      ...catalogue[index % 6], id: `carapi_${index + 1}`, source: 'carapi', marque: 'Acura', modele: 'MDX Base',
      annee: 2020, description: index === 0 ? 'Technology Package' : index === 1 ? 'Advance Package' : `Finition ${index + 1}`, simulable: true,
    }));
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
      let partial = true;
      let failRestore = false;
      try {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.route('**/api/**', async route => {
          const url = new URL(route.request().url());
          let response;
          let status = 200;
          if (url.pathname.endsWith('/simulation')) {
            const params = route.request().postDataJSON();
            response = { resultats: calculateTco(records.filter(v => params.vehicule_ids.includes(v.id)), params) };
            if (failRestore) { status = 503; response = { message: 'Fiche temporairement inaccessible.' }; }
          } else if (url.pathname.endsWith('/vehicules')) {
            const number = Number(url.searchParams.get('page') || 1);
            const data = records.slice((number - 1) * 12, number * 12).map(v => partial && v.id === 'carapi_3' ? {
              ...v, simulable: false, load_error: true, consommation_moyenne: null, indisponibilite: 'Fiche temporairement indisponible.',
            } : v);
            response = { data, meta: { source: 'carapi', access: 'public', year: 2020, page: number, pages: 2, total: 24, hasMore: number < 2, usdToEur: .92, unavailable: partial && number === 1 ? [{ id: 'carapi_3', status: 503 }] : [] } };
          } else {
            response = records.find(v => url.pathname.endsWith(`/${v.id}`));
            if (failRestore && response?.id === 'carapi_1') { status = 503; response = { message: 'Fiche temporairement inaccessible.' }; }
          }
          await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(response) });
        });
        await page.goto(baseURL);
        await page.locator('.comparison-total-row').waitFor();
        assert.equal(await page.locator('.vehicle-card').count(), 12);
        assert.equal(await page.locator('.vehicle-card:disabled').count(), 1);
        assert.match(await page.locator('.comparison-table thead').innerText(), /Technology Package/);
        assert.match(await page.locator('.comparison-table thead').innerText(), /Advance Package/);
        assert.match(await page.locator('.comparison-table thead').innerText(), /2020/);
        partial = false;
        await page.getByRole('button', { name: 'Réessayer les fiches' }).click();
        await eventually(async () => assert.equal(await page.locator('.catalog-partial').count(), 0), 'Partial sheet must recover');
        await page.locator('.comparison-total-row').waitFor();
        assert.equal(await page.locator('.vehicle-card:disabled').count(), 0);
        await page.locator('.vehicle-card').nth(3).click();
        await page.locator('.comparison-total-row td').nth(2).waitFor();
        await page.getByRole('button', { name: 'Suivant', exact: true }).click();
        await page.locator('.catalog-pagination p').filter({ hasText: /page 2 sur/ }).waitFor();
        await page.locator('.vehicle-card:not(:disabled)').first().click();
        await page.locator('.comparison-total-row td').nth(3).waitFor();
        await page.locator('.selection-manager summary').click();
        assert.equal(await page.locator('.selection-manager-list li').count(), 4);
        await page.locator('.selection-manager-list li').nth(2).getByRole('button').click();
        assert.equal(await page.locator('.selection-manager-list li').count(), 3);
        assert.equal(await page.locator('.vehicle-card').count(), 12);
        assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).selectedIds, storageKey), ['carapi_1', 'carapi_2', 'carapi_13']);
        failRestore = true;
        await page.getByRole('button', { name: 'Actualiser le catalogue', exact: true }).click();
        await page.locator('.catalog-panel[aria-busy="false"]').waitFor();
        await page.locator('.error-alert').waitFor();
        assert.equal(await page.locator('.vehicle-card:not(:disabled)').count(), 12);
        assert.equal(await page.locator('.selection-manager-list li').count(), 3);
        assert.match(await page.locator('.selection-manager-list').innerText(), /sélection est conservée/);
        failRestore = false;
        await page.getByRole('button', { name: 'Actualiser le catalogue', exact: true }).click();
        await page.locator('.comparison-total-row').waitFor();
        assert.equal(await page.locator('.comparison-total-row td').count(), 3);
        assert.equal(await page.locator('.error-alert').count(), 0);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        await page.locator('.selection-manager').evaluate(element => element.scrollIntoView({ block: 'start', behavior: 'instant' }));
        await page.screenshot({ path: fileURLToPath(new URL(`selection-${viewport.width}.png`, screenshotDir)) });
        assert.deepEqual(errors, []);
      } finally { await context.close(); }
    }
  });

  await scenario('Reload: starts at the top with cache disabled and preserves preferences', async () => {
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      const { page, context, state } = await freshPage({ viewport });
      try {
        await page.getByRole('button', { name: 'Grand rouleur', exact: true }).click();
        await waitForResults(page, state);
        const preferences = await page.evaluate(key => localStorage.getItem(key), storageKey);
        const devtools = await context.newCDPSession(page);
        for (const cacheDisabled of [false, true]) {
          await devtools.send('Network.setCacheDisabled', { cacheDisabled });
          await page.evaluate(useHash => {
            if (useHash) history.replaceState(history.state, '', location.pathname + '?test=reload#resultats');
            window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
          }, cacheDisabled);
          assert.ok(await page.evaluate(() => scrollY > innerHeight));
          await page.reload({ waitUntil: 'load' });
          assert.equal(await page.evaluate(() => scrollY), 0);
          await waitForResults(page, state);
          assert.equal(await page.evaluate(() => scrollY), 0, 'Loading results must not restore the footer position');
          assert.equal(await page.evaluate(() => location.hash), '');
          if (cacheDisabled) assert.equal(await page.evaluate(() => location.search), '?test=reload');
          assert.equal(await page.evaluate(key => localStorage.getItem(key), storageKey), preferences);
        }
        // The user can still navigate normally to a section after reloading.
        await page.locator('a[href="#resultats"]').first().click();
        await eventually(async () => assert.ok(await page.evaluate(() => scrollY > innerHeight)), 'Section links must still scroll');
      } finally { await context.close(); }
    }
  });

  await scenario('Pagination: slow requests keep the catalogue stable on desktop and mobile', async () => {
    const records = Array.from({ length: 24 }, (_, index) => ({
      ...catalogue[index % catalogue.length], id: `carapi_${index + 1}`, source: 'carapi',
      modele: `Modèle ${index + 1}`, simulable: true,
    }));
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport });
      let releasePage;
      try {
        const page = await context.newPage();
        await page.route('**/api/**', async route => {
          const url = new URL(route.request().url());
          let response;
          if (url.pathname.endsWith('/simulation')) {
            const params = route.request().postDataJSON();
            response = { resultats: calculateTco(records.filter(v => params.vehicule_ids.includes(v.id)), params) };
          } else if (url.pathname.endsWith('/vehicules')) {
            const number = Number(url.searchParams.get('page') || 1);
            if (number === 2) await new Promise(resolve => { releasePage = resolve; });
            response = { data: records.slice((number - 1) * 12, number * 12), meta: { source: 'carapi', access: 'public', year: 2020, page: number, pages: 2, total: 24, hasMore: number < 2, usdToEur: 0.92 } };
          } else response = records.find(v => url.pathname.endsWith(`/${v.id}`));
          await route.fulfill({ contentType: 'application/json', body: JSON.stringify(response) });
        });
        await page.goto(baseURL);
        await page.locator('.comparison-total-row').waitFor();
        await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all([...document.images].map(image => { image.loading = 'eager'; return image.decode().catch(() => {}); }));
        });
        const cards = await page.locator('.vehicle-card').allTextContents();
        const height = await page.locator('.vehicle-grid').evaluate(element => element.getBoundingClientRect().height);
        await page.evaluate(() => {
          document.addEventListener('click', event => {
            if (!event.target.closest('button')?.textContent.includes('Suivant')) return;
            window.paginationFrames = [];
            const start = performance.now();
            const sample = () => {
              window.paginationFrames.push(document.getElementById('catalog-title').getBoundingClientRect().top);
              if (performance.now() - start < 3000) requestAnimationFrame(sample);
            };
            requestAnimationFrame(sample);
          }, { capture: true });
        });
        await page.getByRole('button', { name: 'Suivant', exact: true }).click();
        await page.locator('.catalog-panel[aria-busy="true"]').waitFor();
        assert.equal(await page.locator('.vehicle-card:disabled').count(), 12);
        assert.deepEqual(await page.locator('.vehicle-card').allTextContents(), cards);
        assert.equal(await page.locator('.vehicle-grid').evaluate(element => element.getBoundingClientRect().height), height);
        // Hold the response for three seconds and observe every rendered frame.
        const positions = await page.evaluate(async () => {
          await new Promise(resolve => setTimeout(resolve, 3100));
          return window.paginationFrames;
        });
        assert.ok(positions.length > 10);
        assert.ok(positions.every(top => top >= 0 && top < viewport.height), `Catalogue jumped during loading (${viewport.width}px): ${positions.join(', ')}`);
        const scrollBefore = await page.evaluate(() => scrollY);
        releasePage();
        await page.locator('.catalog-pagination p').filter({ hasText: /page 2 sur/ }).waitFor();
        await page.locator('.comparison-total-row').waitFor();
        assert.equal(await page.locator('.vehicle-card').count(), 12);
        assert.notDeepEqual(await page.locator('.vehicle-card').allTextContents(), cards);
        assert.ok(Math.abs(await page.evaluate(() => scrollY) - scrollBefore) <= 1, 'The response must not trigger a second scroll');
      } finally { releasePage?.(); await context.close(); }
    }
  });

  await scenario('Mobile 390px: usable comparison without horizontal page overflow', async () => {
    const { page, context, state, errors } = await freshPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    try {
      while (await page.locator('.vehicle-card[aria-pressed="false"]').count()) await page.locator('.vehicle-card[aria-pressed="false"]').first().click();
      await waitForResults(page, state);
      const width = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
      assert.ok(width.document <= width.viewport + 1 && width.body <= width.viewport + 1, JSON.stringify(width));
      assert.ok(await page.getByRole('slider', { name: 'Kilométrage annuel' }).isVisible());
      await capture(page, 'mobile.png');
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  });
} finally {
  await browser?.close();
  if (vite) vite.kill();
}

console.log(`\nBrowser checks complete: ${failures ? `${failures} failure(s)` : 'all passed'}. Screenshots: output/screenshots/`);
process.exitCode = failures ? 1 : 0;
