import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getVehicules, getVehiculeById, runSimulation } from './api.js';

const payload = {
  vehicule_ids: ['veh_001', 'veh_002'],
  kilometrage_annuel: 15000,
  duree_annees: 5,
  region: 'FR',
};

const vehicle = {
  id: 'vehicle/live',
  marque: 'Renault',
  modele: 'Clio',
  motorisation: 'essence',
  prix_achat: 21000,
  consommation_moyenne: 5.5,
};

const jsonResponse = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

test('catalogue API: preserves the contract and forwards cancellation', async t => {
  const controller = new AbortController();
  const fetchMock = t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.ok(url.endsWith('/vehicules'));
    assert.equal(options.method, 'GET');
    assert.equal(options.signal.aborted, false);
    controller.signal.addEventListener('abort', () => assert.equal(options.signal.aborted, true));
    return jsonResponse([vehicle]);
  });
  assert.deepEqual(await getVehicules({ signal: controller.signal }), { data: [vehicle], isMock: false });
  assert.equal(fetchMock.mock.callCount(), 1);
});

test('network fallback returns six isolated demo records and can be disabled', async t => {
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('Failed to fetch'); });
  const first = await getVehicules();
  assert.equal(first.isMock, true);
  assert.equal(first.data.length, 6);
  assert.ok(first.warning);
  first.data[0].prix_achat = 0;
  assert.equal((await getVehicules()).data[0].prix_achat, 21000);
  await assert.rejects(getVehicules({ allowFallback: false }), { status: 0 });
});

test('HTTP errors are visible and cannot activate demo fallback', async t => {
  let status = 500;
  t.mock.method(globalThis, 'fetch', async () => jsonResponse({ message: 'Server message' }, status));
  for (status of [400, 404, 401, 429, 500, 503]) {
    await assert.rejects(getVehicules(), { status, message: 'Server message' });
    await assert.rejects(runSimulation(payload, { allowFallback: true }), { status });
  }
});

test('catalogue rejects invalid shapes and duplicate IDs; an empty catalogue is valid', async t => {
  let data;
  t.mock.method(globalThis, 'fetch', async () => jsonResponse(data));
  for (data of [{ vehicles: [vehicle] }, [null], [{ ...vehicle, prix_achat: '21000' }],
    [{ ...vehicle, consommation_moyenne: -1 }], [vehicle, vehicle]]) {
    await assert.rejects(getVehicules(), { status: 502 });
  }
  data = [];
  assert.deepEqual(await getVehicules(), { data: [], isMock: false });
});

test('malformed JSON preserves HTTP failures and does not produce invented data', async t => {
  let status = 200;
  t.mock.method(globalThis, 'fetch', async () => new Response('<html>Error</html>', { status }));
  await assert.rejects(getVehicules(), { status: 502 });
  await assert.rejects(runSimulation(payload, { allowFallback: true }), { status: 502 });
  status = 500;
  await assert.rejects(getVehicules(), { status: 500 });
});

test('all methods preserve AbortError and never fall back after cancellation', async t => {
  const abort = new DOMException('Cancelled', 'AbortError');
  t.mock.method(globalThis, 'fetch', async () => { throw abort; });
  for (const action of [
    () => getVehicules(),
    () => getVehiculeById('veh_001', { allowFallback: true }),
    () => runSimulation(payload, { allowFallback: true }),
  ]) {
    await assert.rejects(action(), error => error === abort);
  }
});

test('already aborted signals avoid requests and local calculations', async t => {
  const fetchMock = t.mock.method(globalThis, 'fetch', () => assert.fail('Unexpected fetch'));
  const controller = new AbortController();
  controller.abort();
  for (const source of ['api', 'local']) {
    await assert.rejects(runSimulation(payload, { signal: controller.signal, source }), { name: 'AbortError' });
    await assert.rejects(getVehiculeById('veh_001', { signal: controller.signal, source }), { name: 'AbortError' });
  }
  await assert.rejects(getVehicules({ signal: controller.signal }), { name: 'AbortError' });
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('cancellation during response parsing prevents stale results', async t => {
  const controller = new AbortController();
  t.mock.method(globalThis, 'fetch', async () => ({
    ok: true,
    json: async () => {
      controller.abort();
      return [vehicle];
    },
  }));
  await assert.rejects(getVehicules({ signal: controller.signal }), { name: 'AbortError' });
});

test('simulation validates parameters before issuing any request', async t => {
  const fetchMock = t.mock.method(globalThis, 'fetch', () => assert.fail('Unexpected fetch'));
  const invalidPayloads = [null, {},
    { ...payload, vehicule_ids: [] },
    { ...payload, vehicule_ids: 'veh_001' },
    { ...payload, vehicule_ids: ['veh_001', 'veh_001'] },
    { ...payload, vehicule_ids: [' '] },
    ...[0, -1, NaN, Infinity, '15000'].map(kilometrage_annuel => ({ ...payload, kilometrage_annuel })),
    ...[0, -1, 16, 1.5, NaN, Infinity, '5'].map(duree_annees => ({ ...payload, duree_annees })),
    ...['', ' ', null, 5].map(region => ({ ...payload, region })),
  ];
  for (const invalidPayload of invalidPayloads) {
    await assert.rejects(runSimulation(invalidPayload), { status: 400 });
  }
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('API simulations preserve payload fields and require explicit network fallback', async t => {
  const local = await runSimulation(payload, { source: 'local' });
  const controller = new AbortController();
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.ok(url.endsWith('/simulation'));
    assert.equal(options.method, 'POST');
    assert.equal(options.headers['Content-Type'], 'application/json');
    assert.equal(options.signal.aborted, false);
    assert.deepEqual(JSON.parse(options.body), payload);
    return jsonResponse(local.data);
  });
  assert.deepEqual(await runSimulation({ ...payload, ignored: true }, { signal: controller.signal }), {
    data: local.data,
    isMock: false,
  });
});

test('live simulation network failures stay visible unless fallback was requested', async t => {
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('Network offline'); });
  await assert.rejects(runSimulation(payload), { status: 0 });
  assert.equal((await runSimulation(payload, { allowFallback: true })).isMock, true);
});

test('simulation rejects missing, duplicate, unrelated and incomplete results', async t => {
  const valid = (await runSimulation(payload, { source: 'local' })).data;
  let data;
  t.mock.method(globalThis, 'fetch', async () => jsonResponse(data));
  const invalidResults = [null, {}, { resultats: [] },
    { resultats: [valid.resultats[0], valid.resultats[0]] },
    { resultats: [valid.resultats[0], { ...valid.resultats[1], vehicule_id: 'unrelated' }] },
    { resultats: [valid.resultats[0], { ...valid.resultats[1], cout_total: '25000' }] },
    { resultats: [valid.resultats[0], { ...valid.resultats[1], detail: {} }] },
    { resultats: [valid.resultats[0], { ...valid.resultats[1], evolution_annuelle: [] }] },
    { resultats: [valid.resultats[0], { ...valid.resultats[1], evolution_annuelle: [{ annee: 1, cout_cumule: -5 }] }] },
  ];
  for (data of invalidResults) await assert.rejects(runSimulation(payload), { status: 502 });
});

test('404 responses expose only missing IDs that belong to the request', async t => {
  t.mock.method(globalThis, 'fetch', async () => jsonResponse({
    message: 'Vehicle removed',
    missing_vehicle_ids: ['veh_002', 'unrelated', 'veh_002'],
  }, 404));
  await assert.rejects(runSimulation(payload), error => {
    assert.equal(error.status, 404);
    assert.deepEqual(error.vehicleIds, ['veh_002']);
    return true;
  });
  await assert.rejects(getVehiculeById('veh_001'), error => {
    assert.deepEqual(error.vehicleIds, ['veh_001']);
    return error.status === 404;
  });
});

test('local mode does not call API or invent vehicles unknown to its catalogue', async t => {
  const fetchMock = t.mock.method(globalThis, 'fetch', () => assert.fail('Unexpected fetch'));
  assert.equal((await getVehiculeById('veh_001', { source: 'local' })).marque, 'Renault');
  await assert.rejects(getVehiculeById('unknown', { source: 'local' }), { status: 404 });
  await assert.rejects(runSimulation({ ...payload, vehicule_ids: ['veh_001', 'unknown'] }, { source: 'local' }), error => {
    assert.deepEqual(error.vehicleIds, ['unknown']);
    return error.status === 404;
  });
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('vehicle detail URLs encode IDs and reject mismatching records', async t => {
  let data = vehicle;
  t.mock.method(globalThis, 'fetch', async url => {
    assert.ok(url.endsWith('/vehicules/vehicle%2Flive'));
    return jsonResponse(data);
  });
  assert.deepEqual(await getVehiculeById('vehicle/live'), vehicle);
  data = { ...vehicle, id: 'other' };
  await assert.rejects(getVehiculeById('vehicle/live'), { status: 502 });
});

test('local estimates retain assumptions and reconcile all cost totals for every duration', async () => {
  for (let years = 1; years <= 15; years++) {
    const response = await runSimulation({
      ...payload,
      vehicule_ids: ['veh_001', 'veh_002', 'veh_003', 'veh_004', 'veh_005', 'veh_006'],
      duree_annees: years,
    }, { source: 'local' });
    for (const result of response.data.resultats) {
      assert.equal(Object.values(result.detail).reduce((sum, cost) => sum + cost, 0), result.cout_total);
      assert.equal(result.evolution_annuelle.length, years);
      assert.equal(result.evolution_annuelle.at(-1).cout_cumule, result.cout_total);
      assert.equal(result.cout_mensuel_moyen, Math.round(result.cout_total / (years * 12)));
      assert.equal(result.cout_par_km, Number((result.cout_total / (15000 * years)).toFixed(2)));
      for (let index = 1; index < result.evolution_annuelle.length; index++) {
        assert.ok(result.evolution_annuelle[index].cout_cumule >= result.evolution_annuelle[index - 1].cout_cumule);
      }
    }
  }
  const france = await runSimulation(payload, { source: 'local' });
  const switzerland = await runSimulation({ ...payload, region: 'CH' }, { source: 'local' });
  assert.equal(france.data.resultats[0].detail.carburant, Math.round(75000 / 100 * 5.5 * 1.85));
  assert.equal(france.data.resultats[1].detail.carburant, Math.round(75000 / 100 * 16.5 * 0.25));
  assert.equal(switzerland.data.resultats[0].detail.carburant, Math.round(75000 / 100 * 5.5 * 1.85 * 1.25));
});
