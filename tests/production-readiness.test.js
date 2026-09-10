import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { createWindowLimiter, clientAddress } from '../server/protection.js';
import { createCarApiClient } from '../server/carapi.js';
import { createApiHandler } from '../server/api.js';
import { vehicleLabel } from '../shared/vehicleLabel.js';
import { createReportDocument } from '../src/utils/exportReport.js';
import { calculateTco } from '../shared/tco.js';

const sheet = id => ({ id, make: 'Acura', model: 'MDX', trim: 'Base', year: 2020,
  description: id === 1 ? '4dr SUV w/Technology Package' : '4dr SUV w/Advance Package', msrp: 40000,
  engines: [{ engine_type: 'gas', fuel_type: 'regular unleaded' }], mileages: [{ combined_mpg: 25 }] });
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers });

test('one failed sheet preserves the page, original pagination and successful vehicles; retry recovers it', async () => {
  let broken = true;
  const events = [];
  const client = createCarApiClient({ env: {}, logger: event => events.push(event), fetchImpl: async url => {
    if (url.includes('?')) return json({ data: [sheet(1), sheet(2)], collection: { total: 24, pages: 2 } });
    const id = Number(url.split('/').at(-1));
    return id === 2 && broken ? json({}, 503) : json(sheet(id));
  } });
  const first = await client.catalogue();
  assert.equal(first.data.length, 2);
  assert.equal(first.data[0].simulable, true);
  assert.equal(first.data[1].load_error, true);
  assert.equal(first.data[1].simulable, false);
  assert.equal(first.data[1].consommation_moyenne, null);
  assert.equal(first.meta.total, 24);
  assert.equal(first.meta.hasMore, true);
  assert.deepEqual(first.meta.unavailable, [{ id: 'carapi_2', status: 503 }]);
  assert.ok(events.some(event => event.event === 'carapi_error' && event.status === 503));
  broken = false;
  const retry = await client.catalogue();
  assert.deepEqual(retry.meta.unavailable, []);
  assert.ok(retry.data.every(v => v.simulable));
});

test('missing sheets are marked permanently unavailable; auth failures stay global', async () => {
  for (const status of [404, 401, 403]) {
    const client = createCarApiClient({ env: {}, logger: () => {}, fetchImpl: async url => url.includes('?')
      ? json({ data: [sheet(1)], collection: { total: 1, pages: 1 } }) : json({}, status) });
    if (status === 404) assert.equal((await client.catalogue()).data[0].unavailable_permanent, true);
    else await assert.rejects(client.catalogue(), { status });
  }
});

test('upstream quota response stops subsequent upstream calls until Retry-After expires', async t => {
  let now = 100000;
  let calls = 0;
  t.mock.method(Date, 'now', () => now);
  const client = createCarApiClient({ env: {}, logger: () => {}, fetchImpl: async () => ++calls === 1
    ? json({}, 429, { 'Retry-After': '30' }) : json(sheet(1)) });
  await assert.rejects(client.vehicle('carapi_1'), { status: 429, retryAfter: 30 });
  await assert.rejects(client.vehicle('carapi_1'), { status: 429 });
  assert.equal(calls, 1);
  now += 30001;
  assert.equal((await client.vehicle('carapi_1')).id, 'carapi_1');
  assert.equal(calls, 2);
});

test('bounded weighted limits recover after the window, and local clients cannot spoof their IP', () => {
  let now = 0;
  const limit = createWindowLimiter({ limit: 10, maxKeys: 1, now: () => now });
  limit('first', 10);
  assert.throws(() => limit('first'), { status: 429, retryAfter: 60 });
  assert.throws(() => limit('second'), { status: 429 });
  now = 60001;
  limit('second', 10);
  const req = { headers: { 'x-forwarded-for': '1.2.3.4', 'x-vercel-forwarded-for': '2.3.4.5' }, socket: { remoteAddress: '127.0.0.1' } };
  assert.equal(clientAddress(req, {}), '127.0.0.1');
  assert.equal(clientAddress(req, { VERCEL: '1' }), '2.3.4.5');
});

test('HTTP 429 includes retry delay and trace ID; logs do not include query strings or bodies', async t => {
  const events = [];
  let catalogueCalls = 0;
  const handler = createApiHandler({ env: {}, logger: event => events.push(event), limiter: createWindowLimiter({ limit: 10 }), client: {
    catalogue: async () => { catalogueCalls++; return { data: [], meta: {} }; },
  } });
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/api/vehicules?private=do-not-log`;
  assert.equal((await fetch(url)).status, 200);
  const denied = await fetch(url);
  assert.equal(denied.status, 429);
  assert.ok(Number(denied.headers.get('retry-after')) > 0);
  const body = await denied.json();
  assert.equal(body.requestId, denied.headers.get('x-request-id'));
  assert.equal(catalogueCalls, 1);
  assert.equal(events.length, 2);
  assert.ok(!JSON.stringify(events).includes('do-not-log'));
  assert.equal(events[1].status, 429);
});

test('Vercel parsed JSON and malformed JSON getter are handled like local requests', async t => {
  const handler = createApiHandler({ env: {}, logger: () => {}, client: {} });
  const server = createServer((req, res) => {
    Object.defineProperty(req, 'body', { get() { throw new SyntaxError('private-body'); } });
    return handler(req, res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/simulation`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
  assert.equal(response.status, 400);
  assert.ok(!(await response.text()).includes('private-body'));
});

test('identical model names remain distinguishable by finish and year in the PDF', async () => {
  const client = createCarApiClient({ env: {}, logger: () => {}, fetchImpl: async url => json(sheet(Number(url.split('/').at(-1)))) });
  const vehicles = await Promise.all([client.vehicle('carapi_1'), client.vehicle('carapi_2')]);
  assert.notEqual(vehicleLabel(vehicles[0]), vehicleLabel(vehicles[1]));
  assert.match(vehicleLabel(vehicles[0]), /2020.*Technology/);
  const params = { kilometrage_annuel: 15000, duree_annees: 5, region: 'FR' };
  const doc = createReportDocument({ vehicles, params, results: calculateTco(vehicles, params) });
  const content = [...doc.internal.pages.slice(1).flat().join('\n').matchAll(/\((.*?)\) Tj/g)].map(match => match[1]).join(' ');
  assert.match(content, /Technology Package/);
  assert.match(content, /Advance Package/);
  assert.match(content, /2020/);
});
