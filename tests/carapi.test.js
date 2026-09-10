import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { createCarApiClient, adaptTrim } from '../server/carapi.js';
import { createApiHandler } from '../server/api.js';
import { calculateTco } from '../shared/tco.js';

const trim = {
  id: 8860, make: 'Toyota', model: 'Camry', trim: 'LE', year: 2020, msrp: 24970,
  engines: [{ engine_type: 'gas', fuel_type: 'regular unleaded' }], mileages: [{ combined_mpg: 32 }],
};
const json = (data, status = 200) => new Response(JSON.stringify(data), { status });

test('CarAPI adapter converts US MPG, electric consumption and historical USD prices', () => {
  const gas = adaptTrim(trim);
  assert.equal(gas.id, 'carapi_8860');
  assert.equal(gas.consommation_moyenne, 7.35);
  assert.equal(gas.prix_achat, 22972);
  assert.equal(gas.msrp_usd, 24970);
  assert.equal(gas.annee, 2020);
  const electric = adaptTrim({ ...trim, engines: [{ engine_type: 'electric' }], mileages: [{ epa_kwh_100_mi_electric: 30 }] });
  assert.equal(electric.motorisation, 'electrique');
  assert.equal(electric.consommation_moyenne, 18.64);
  const hybrid = adaptTrim({ ...trim, engines: [{ engine_type: 'hybrid' }] });
  assert.equal(hybrid.motorisation, 'hybride');
  assert.equal(hybrid.simulable, true);
  assert.equal(adaptTrim({ ...trim, engines: [{ engine_type: 'diesel' }] }).motorisation, 'diesel');
});

test('missing data and unsupported engines are not given fabricated price or consumption', () => {
  for (const change of [{ msrp: null }, { msrp: 0 }, { mileages: [] }, { engines: [{ engine_type: 'plug-in hybrid' }] }, { engines: [{ engine_type: 'fuel cell' }] }]) {
    const vehicle = adaptTrim({ ...trim, ...change });
    assert.equal(vehicle.simulable, false);
    assert.ok(vehicle.indisponibilite);
  }
  assert.equal(adaptTrim({ ...trim, mileages: [] }).consommation_moyenne, null);
  assert.equal(adaptTrim({ ...trim, msrp: null }).prix_achat, null);
  assert.throws(() => adaptTrim({}), { status: 502 });
});

test('catalogue uses documented v2 endpoints, forwards page/filter and deduplicates cached details', async () => {
  const calls = [];
  const client = createCarApiClient({ env: {}, fetchImpl: async url => {
    calls.push(url);
    if (url.includes('/trims/v2?')) {
      const query = new URL(url).searchParams;
      assert.equal(query.get('year'), '2020');
      assert.equal(query.get('make'), 'Toyota');
      assert.equal(query.get('model'), 'Camry');
      assert.equal(query.get('page'), '2');
      assert.equal(query.get('limit'), '12');
      return json({ data: [{ id: 8860 }], collection: { total: 17, pages: 2 } });
    }
    assert.equal(url, 'https://carapi.app/api/trims/v2/8860');
    return json(trim);
  } });
  const response = await client.catalogue(new URLSearchParams('year=2020&make=Toyota&model=Camry&page=2'));
  assert.equal(response.meta.total, 17);
  assert.equal(response.meta.page, 2);
  assert.equal(response.meta.hasMore, false);
  assert.equal(response.meta.access, 'public');
  await Promise.all([client.vehicle('carapi_8860'), client.vehicle('carapi_8860')]);
  assert.equal(calls.length, 2);
  await assert.rejects(client.catalogue(new URLSearchParams('year=2025')), { status: 400 });
  await assert.rejects(client.vehicle('https://untrusted.example'), { status: 404 });
  assert.equal(calls.length, 2);
});

test('upstream failures stay explicit and failed requests can be retried', async () => {
  let calls = 0;
  const client = createCarApiClient({ env: {}, fetchImpl: async () => ++calls === 1 ? json({}, 503) : json(trim) });
  await assert.rejects(client.vehicle('carapi_8860'), { status: 503 });
  assert.equal((await client.vehicle('carapi_8860')).id, 'carapi_8860');
  const missing = createCarApiClient({ env: {}, fetchImpl: async () => json({}, 404) });
  await assert.rejects(missing.vehicle('carapi_8860'), { status: 404, vehicleIds: ['carapi_8860'] });
  const offline = createCarApiClient({ env: {}, fetchImpl: async () => { throw new TypeError('offline'); } });
  await assert.rejects(offline.vehicle('carapi_8860'), { status: 502 });
});

test('optional credentials stay in server requests and expired JWT is renewed once', async () => {
  let logins = 0;
  let gets = 0;
  const client = createCarApiClient({ env: { CARAPI_API_TOKEN: 'test-token', CARAPI_API_SECRET: 'test-secret' }, fetchImpl: async (url, options) => {
    if (url.endsWith('/auth/login')) {
      logins++;
      assert.deepEqual(JSON.parse(options.body), { api_token: 'test-token', api_secret: 'test-secret' });
      return new Response(`header.payload.signature${logins}`);
    }
    assert.ok(options.headers.Authorization.startsWith('Bearer header.payload.'));
    return ++gets === 1 ? json({}, 401) : json(trim);
  } });
  const result = await client.vehicle('carapi_8860');
  assert.equal(logins, 2);
  assert.equal(gets, 2);
  assert.ok(!JSON.stringify(result).includes('test-secret'));
});

test('TCO reconciles independent expense totals and growing depreciation across horizons', () => {
  const vehicle = adaptTrim(trim);
  const params = { kilometrage_annuel: 15000, duree_annees: 5, region: 'FR' };
  const [result] = calculateTco([vehicle], params);
  assert.equal(result.detail.carburant, Math.round(75000 / 100 * 7.35 * 1.85));
  assert.equal(result.detail.decote_estimee, Math.round(22972 * (1 - 0.9 ** 5)));
  assert.equal(result.cout_total, Object.values(result.detail).reduce((a, b) => a + b));
  assert.equal(result.evolution_annuelle.at(-1).cout_cumule, result.cout_total);
  const [short] = calculateTco([vehicle], { ...params, duree_annees: 1 });
  assert.ok(result.detail.decote_estimee > short.detail.decote_estimee);
  assert.equal(result.evolution_annuelle[0].cout_cumule, short.cout_total);
});

test('real HTTP application routes normalize catalogue and compute simulation without an upstream POST', async t => {
  const requested = [];
  const handler = createApiHandler({ env: {}, fetchImpl: async (url, options) => {
    requested.push({ url, method: options.method || 'GET' });
    return json(url.includes('?') ? { data: [{ id: 8860 }], collection: { total: 1, pages: 1 } } : trim);
  } });
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const catalogue = await (await fetch(`${base}/vehicules`)).json();
  assert.equal(catalogue.data[0].source, 'carapi');
  const payload = { vehicule_ids: ['carapi_8860'], kilometrage_annuel: 15000, duree_annees: 5, region: 'FR' };
  const post = body => fetch(`${base}/simulation`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const response = await post(payload);
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.source, 'autocompare');
  assert.equal(data.resultats[0].vehicule_id, 'carapi_8860');
  assert.ok(requested.every(call => call.method === 'GET' && call.url.includes('/trims/v2')));
  for (const change of [{ region: 'invalid' }, { vehicule_ids: ['carapi_8860', 'carapi_8860'] }, { duree_annees: 0 }, { kilometrage_annuel: 999999 }]) assert.equal((await post({ ...payload, ...change })).status, 400);
  assert.equal((await fetch(`${base}/simulation`)).status, 405);
  assert.equal((await fetch(`${base}/untrusted`)).status, 404);
  assert.equal((await fetch(`${base}/simulation`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })).status, 400);
});
