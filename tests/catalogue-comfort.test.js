import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createCarApiClient } from '../server/carapi.js';
import { createApiHandler } from '../server/api.js';
import { VEHICLE_ILLUSTRATIONS, VEHICLE_PHOTOS, vehicleIllustration, vehiclePhoto } from '../shared/vehiclePhotos.js';
const json = (data, status = 200) => new Response(JSON.stringify(data), { status });

test('suggestions use documented v2 routes, year and exact brand; requests share the cache', async () => {
  const calls = [];
  const client = createCarApiClient({ env: {}, fetchImpl: async url => {
    calls.push(url);
    const parsed = new URL(url);
    assert.equal(parsed.searchParams.get('limit'), '1000');
    assert.equal(parsed.searchParams.get('year'), '2020');
    return parsed.pathname.includes('/makes/') ? json({ data: [{ name: 'Toyota' }, { name: 'Tesla' }] })
      : json({ data: parsed.searchParams.get('make') === 'Tesla' ? [{ name: '3' }, { name: 'S' }] : [{ name: 'Camry' }] });
  } });
  const brandOnly = await client.catalogueOptions(new URLSearchParams('year=2020&make=Toy'));
  assert.deepEqual(brandOnly.models, []);
  assert.equal(calls.length, 1);
  const options = await client.catalogueOptions(new URLSearchParams('year=2020&make=tesla'));
  assert.deepEqual(options.models, ['Model 3', 'Model S']);
  assert.deepEqual(await client.catalogueOptions(new URLSearchParams('year=2020&make=Tesla')), options);
  assert.equal(calls.length, 2);
  assert.match(calls[0], /\/makes\/v2\?/);
  assert.match(calls[1], /\/models\/v2\?/);
});

test('suggestions validate inputs and preserve quota/authentication and malformed response errors', async () => {
  let response = json({ data: [{ name: null }] });
  const client = createCarApiClient({ env: {}, cacheMs: 0, logger: () => {}, fetchImpl: async () => response });
  for (const query of ['year=2014', 'year=2021', 'year=NaN', `make=${'x'.repeat(81)}`]) await assert.rejects(client.catalogueOptions(new URLSearchParams(query)), { status: 400 });
  await assert.rejects(client.catalogueOptions(), { status: 502 });
  for (const status of [403, 429]) {
    response = json({}, status);
    await assert.rejects(client.catalogueOptions(), { status });
  }
});

test('same-origin suggestion route supports GET and rejects other methods', async t => {
  const handler = createApiHandler({ env: {}, logger: () => {}, client: { catalogueOptions: async query => ({ makes: ['Toyota'], models: query.get('make') === 'Toyota' ? ['Camry'] : [] }) } });
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/api/catalogue-options?year=2020&make=Toyota`;
  const response = await fetch(url);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { makes: ['Toyota'], models: ['Camry'] });
  const post = await fetch(url, { method: 'POST' });
  assert.equal(post.status, 405);
  assert.equal(post.headers.get('allow'), 'GET');
});

test('photos match reviewed model/year combinations, never fuzzy names or unrelated generations', async () => {
  const base = { source: 'carapi', marque: 'Toyota', modele_base: 'Camry', annee: 2020 };
  assert.equal(vehiclePhoto(base)?.author, 'Bull-Doser');
  for (const change of [{ annee: 2017 }, { annee: 2021 }, { annee: '2020' }, { modele_base: 'Camry Hybrid' }, { modele_base: undefined, modele: 'Camry' }, { marque: 'Honda' }, { source: 'local' }]) assert.equal(vehiclePhoto({ ...base, ...change }), null);
  assert.equal(vehiclePhoto({ ...base, marque: 'Tesla', modele_base: '3' })?.author, 'jerjozwik');
  for (const photo of VEHICLE_PHOTOS) {
    const path = new URL(`../public${photo.src}`, import.meta.url);
    const content = await readFile(path);
    assert.equal(content.subarray(0, 3).toString('hex'), 'ffd8ff', 'Asset is a JPEG, not an error page');
    assert.ok((await stat(path)).size < 200000, 'Photographs have a bounded download size');
    assert.ok(photo.source.startsWith('https://commons.wikimedia.org/wiki/File:'));
    assert.ok(photo.author && photo.license && photo.licenseUrl);
  }
});

test('CarAPI vehicles receive clearly generic local illustrations when no verified photo exists', () => {
  const illustration = vehicleIllustration({ source: 'carapi', marque: 'Acura', modele_base: 'MDX', modele: 'MDX Base', description: '4dr SUV', motorisation: 'essence' });
  assert.equal(illustration?.key, 'crossover');
  assert.ok(illustration?.src.startsWith('/images/'));
  assert.equal(vehicleIllustration({ source: 'local', motorisation: 'essence' }), null);
  assert.equal(VEHICLE_ILLUSTRATIONS.length, 6);
});
