import assert from 'node:assert/strict';
import test from 'node:test';
import { createReportDocument } from '../src/utils/exportReport.js';

const generatedAt = new Date('2026-09-09T10:00:00.000Z');
const vehicles = Array.from({ length: 6 }, (_, index) => ({
  id: `vehicle-${index}`,
  marque: index === 0 ? 'Citroën' : 'Renault',
  modele: index === 0 ? 'ë-C4' : `Mégane E-Tech ${index}`,
  motorisation: 'electrique',
  annee: 2025,
}));
const results = vehicles.map((vehicle, index) => ({
  vehicule_id: vehicle.id,
  cout_total: 50000 + index * 10000,
  cout_mensuel_moyen: 278 + index * 55,
  cout_par_km: 0.17 + index * 0.03,
  detail: {
    decote_estimee: 20000,
    carburant: 18000 + index * 10000,
    assurance: 6000,
    entretien: 4000,
    autres: 2000,
  },
  evolution_annuelle: Array.from({ length: 15 }, (_, year) => ({
    annee: year + 1,
    cout_cumule: Math.round((50000 + index * 10000) * (year + 1) / 15),
  })),
}));
const options = { results, vehicles, params: { kilometrage_annuel: 20000, duree_annees: 15, region: 'FR' }, generatedAt };

function pageText(doc, page) {
  return doc.internal.pages[page].join('\n');
}

function assertPageBounds(doc) {
  const scale = doc.internal.scaleFactor;
  const height = doc.internal.pageSize.getHeight();
  for (let page = 1; page <= doc.getNumberOfPages(); page++) {
    for (const match of pageText(doc, page).matchAll(/([\d.-]+) ([\d.-]+) Td/g)) {
      const x = Number(match[1]) / scale;
      const top = height - Number(match[2]) / scale;
      assert.ok(x >= 17.9, `Page ${page}: text starts inside left margin (${x})`);
      assert.ok(top >= 14 && top <= 287.1, `Page ${page}: text baseline is inside page (${top})`);
      assert.ok(top <= 276 || top >= 286, `Page ${page}: report content must not enter the footer (${top})`);
    }
  }
}

test('six vehicles and fifteen years are complete, selectable and paginated', () => {
  const doc = createReportDocument({ ...options, isMock: true });
  assert.equal(doc.getNumberOfPages(), 8);
  for (let index = 0; index < vehicles.length; index++) {
    const content = pageText(doc, index + 3);
    assert.ok(content.includes(`${vehicles[index].marque} ${vehicles[index].modele}`));
    assert.equal([...content.matchAll(/\(Année \d+\) Tj/g)].length, 15);
    assert.ok(content.includes('(Année 15) Tj'));
    assert.ok(content.includes(`(${index + 3} / 8) Tj`));
    assert.ok(content.includes('Démonstration'));
  }
  const cover = pageText(doc, 1) + pageText(doc, 2);
  assert.ok(cover.includes("50 000 \x80 d'économie"));
  assert.ok(cover.includes('Citroën ë-C4'));
  const output = doc.output();
  assert.ok(output.startsWith('%PDF-'));
  assert.ok(!output.includes('/Subtype /Image'), 'The report uses native text instead of a screenshot');
  assert.ok(!/[\u202f\u00a0]/.test(output), 'French thousands separators use supported spaces');
  assertPageBounds(doc);
});

test('long vehicle names paginate without dropping yearly values', () => {
  const doc = createReportDocument({
    ...options,
    vehicles: vehicles.map(vehicle => ({ ...vehicle, modele: `${vehicle.modele} ${'Version longue autonomie et équipement complet '.repeat(4)}` })),
  });
  const content = doc.internal.pages.slice(1).flat().join('\n');
  assert.equal([...content.matchAll(/\(Année \d+\) Tj/g)].length, 90);
  assert.equal([...content.matchAll(/\(Année 15\) Tj/g)].length, 6);
  assert.ok(doc.getNumberOfPages() > 7);
  assertPageBounds(doc);
});

test('missing or malformed optional values do not become fabricated zero costs', () => {
  const doc = createReportDocument({
    results: [{ vehicule_id: 'missing', cout_total: null, cout_mensuel_moyen: 'unknown', cout_par_km: Infinity }, null],
    vehicles: null,
    params: null,
    generatedAt,
  });
  const content = doc.internal.pages.slice(1).flat().join('\n');
  assert.ok(content.includes('Véhicule missing'));
  assert.ok(content.includes('(-) Tj'));
  assert.ok(!content.includes('NaN'));
  assert.ok(!content.includes('Infinity'));
  assert.ok(!content.includes('LE COÛT LE PLUS BAS'));
  assertPageBounds(doc);
  assert.equal(createReportDocument({ results: { resultats: {} }, generatedAt }).getNumberOfPages(), 1);
});

test('equal total costs are reported as a tie and never as negative savings', () => {
  const doc = createReportDocument({ ...options, results: results.slice(0, 2).map(result => ({ ...result, cout_total: 50000 })) });
  const cover = pageText(doc, 1);
  assert.ok(cover.includes('EX AEQUO'));
  assert.ok(cover.includes("0 \x80 d'économie"));
});
