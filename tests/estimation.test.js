import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:http';
import { calculateTco, validateAdjustments, validateParameters } from '../shared/tco.js';
import { runSimulation } from '../src/services/api.js';
import { createApiHandler } from '../server/api.js';
import { createReportDocument } from '../src/utils/exportReport.js';

const vehicle = { id: 'veh_001', marque: 'Renault', modele: 'Clio', motorisation: 'essence', prix_achat: 21000, consommation_moyenne: 5.5, simulable: true };
const params = { vehicule_ids: [vehicle.id], kilometrage_annuel: 10000, duree_annees: 5, region: 'FR' };
const custom = { prix_achat: 18000, valeur_revente: 9000, consommation: 6, prix_energie: 2, entretien_annuel: 500, assurance_annuelle: 600, autres_annuels: 0 };
const personalized = { ...params, ajustements: { [vehicle.id]: custom } };

test('real purchase and resale produce a reconciled TCO without double counting acquisition', () => {
  const [result] = calculateTco([vehicle], validateParameters(personalized));
  assert.deepEqual(result.detail, { carburant: 6000, entretien: 2500, assurance: 3000, decote_estimee: 9000, autres: 0 });
  assert.equal(result.cout_total, 20500);
  assert.equal(result.cout_mensuel_moyen, 342);
  assert.equal(result.cout_par_km, 0.41);
  assert.deepEqual(result.evolution_annuelle.map(point => point.cout_cumule), [4100, 8200, 12300, 16400, 20500]);
  assert.equal(result.hypotheses_appliquees.prix_achat, 18000);
  assert.equal(result.hypotheses_appliquees.methode_decote, 'lineaire_jusqua_revente');
  assert.equal(vehicle.prix_achat, 21000, 'The catalogue reference is not mutated');
});

test('personal energy price overrides country factors and only affects its own vehicle', () => {
  const second = { ...vehicle, id: 'second', motorisation: 'electrique', consommation_moyenne: 20 };
  const options = { ...personalized, region: 'CH' };
  const [first, other] = calculateTco([vehicle, second], options);
  assert.equal(first.detail.carburant, 6000);
  assert.equal(other.detail.carburant, 3125);
  assert.equal(other.hypotheses_appliquees.assurance_annuelle, 850);
  assert.deepEqual(other.hypotheses_appliquees.personnalises, []);
});

test('zero amounts are explicit; omitted resale uses the actual purchase price and default depreciation', () => {
  const [defaultResale] = calculateTco([vehicle], { ...params, ajustements: { [vehicle.id]: { prix_achat: 10000 } } });
  assert.equal(defaultResale.detail.decote_estimee, 4095);
  assert.equal(defaultResale.hypotheses_appliquees.valeur_revente, 10000 * 0.9 ** 5);
  for (const resale of [0, 18000]) {
    const [result] = calculateTco([vehicle], { ...params, ajustements: { [vehicle.id]: { ...custom, valeur_revente: resale, prix_energie: 0, entretien_annuel: 0, assurance_annuelle: 0 } } });
    assert.equal(result.cout_total, 18000 - resale);
    assert.equal(result.evolution_annuelle.at(-1).cout_cumule, result.cout_total);
  }
});

test('invalid optional inputs are rejected, including unknown fields, nonfinite values and unrelated IDs', () => {
  for (const value of [null, [], 'invalid', { veh_001: null }, { veh_001: [] }, { veh_001: { unknown: 12 } },
    ...[-1, Infinity, NaN, null, '', '12', true, 2000001].map(prix_achat => ({ veh_001: { prix_achat } })),
    { veh_001: { consommation: 0 } }, { veh_001: { prix_energie: 21 } }, { veh_001: { entretien_annuel: 100001 } }]) {
    assert.throws(() => validateParameters({ ...params, ajustements: value }), { status: 400 });
  }
  assert.throws(() => validateParameters({ ...params, ajustements: { another: { prix_achat: 10 } } }), { status: 400 });
  assert.throws(() => calculateTco([vehicle], { ...params, ajustements: { veh_001: { valeur_revente: 21001 } } }), { status: 400 });
  assert.deepEqual(validateParameters({ ...params, ajustements: { veh_001: {} } }), params);
  assert.deepEqual(validateAdjustments(), {});
});

test('fractional annual costs reconcile with rounded totals for all supported horizons', () => {
  for (let years = 1; years <= 15; years++) {
    const [result] = calculateTco([vehicle], { ...personalized, duree_annees: years, ajustements: { veh_001: { ...custom, entretien_annuel: 500.19, assurance_annuelle: 611.99, valeur_revente: 4321.56 } } });
    assert.equal(result.cout_total, Object.values(result.detail).reduce((sum, value) => sum + value, 0));
    assert.equal(result.evolution_annuelle.at(-1).cout_cumule, result.cout_total);
    assert.ok(result.evolution_annuelle.every((point, index, all) => !index || point.cout_cumule >= all[index - 1].cout_cumule));
  }
});

test('frontend forwards personal values, rejects malformed metadata and keeps offline calculations identical', async t => {
  const local = await runSimulation(personalized, { source: 'local' });
  assert.equal(local.data.resultats[0].cout_total, 20500);
  let response = local.data;
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    assert.deepEqual(JSON.parse(options.body), personalized);
    return new Response(JSON.stringify(response), { headers: { 'Content-Type': 'application/json' } });
  });
  assert.deepEqual((await runSimulation(personalized)).data, local.data);
  response = structuredClone(local.data);
  response.resultats[0].hypotheses_appliquees.personnalises = null;
  await assert.rejects(runSimulation(personalized), { status: 502 });
});

test('HTTP simulation applies overrides, enforces resale consistency and accepts 50 fully customized cars', async t => {
  const handler = createApiHandler({ env: {}, logger: () => {}, client: { vehicle: async id => ({ ...vehicle, id }) } });
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const post = body => fetch(`http://127.0.0.1:${server.address().port}/api/simulation`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const response = await post(personalized);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).resultats[0].cout_total, 20500);
  assert.equal((await post({ ...params, ajustements: { veh_001: { valeur_revente: 99999 } } })).status, 400);
  const ids = Array.from({ length: 50 }, (_, index) => `vehicle_${index}_${'x'.repeat(60)}`);
  const full = { ...params, vehicule_ids: ids, ajustements: Object.fromEntries(ids.map(id => [id, custom])) };
  const many = await post(full);
  assert.equal(many.status, 200);
  assert.equal((await many.json()).resultats.length, 50);
});

test('PDF exports actual personal inputs, their origin and complete annual evolution within page bounds', () => {
  const options = { ...personalized, duree_annees: 15 };
  const doc = createReportDocument({ params: options, vehicles: [vehicle], results: calculateTco([vehicle], options) });
  const content = doc.internal.pages.slice(1).flat().join('\n');
  assert.ok(content.includes('18 000,00 EUR'));
  assert.ok(content.includes('9 000,00 EUR'));
  assert.ok(content.includes('2,00 EUR/L'));
  assert.ok(content.includes('Saisi'));
  assert.ok(content.includes('sans coefficient pays'));
  const countryParams = { ...params, region: 'CH' };
  const referencePdf = createReportDocument({ params: countryParams, vehicles: [vehicle], results: calculateTco([vehicle], countryParams) });
  assert.ok(referencePdf.output().includes('2,3125 EUR/L'), 'Country-adjusted energy price retains meaningful precision in the PDF');
  assert.equal([...content.matchAll(/\(Année \d+\) Tj/g)].length, 15);
  const scale = doc.internal.scaleFactor;
  for (const match of content.matchAll(/([\d.-]+) ([\d.-]+) Td/g)) {
    const top = doc.internal.pageSize.getHeight() - Number(match[2]) / scale;
    assert.ok(top >= 14 && (top <= 276 || (top >= 286 && top <= 287.1)), 'Content respects page and footer bounds');
  }
});
