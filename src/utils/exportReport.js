import { jsPDF } from 'jspdf';

import { vehicleLabel } from '../../shared/vehicleLabel.js';

const COLORS = {
  ink: '#263b2d',
  accent: '#c4ed63',
  muted: '#6b746d',
  line: '#dfe5dc',
  pale: '#f3f6ef',
  white: '#ffffff',
};
const COSTS = [
  ['decote_estimee', 'Décote estimée'],
  ['carburant', 'Énergie'],
  ['assurance', 'Assurance'],
  ['entretien', 'Entretien'],
  ['autres', 'Autres frais'],
];
const REGIONS = { FR: 'France', DE: 'Allemagne', CH: 'Suisse', BE: 'Belgique', ES: 'Espagne' };
const ENGINES = { electrique: 'Électrique', essence: 'Essence', diesel: 'Diesel', hybride: 'Hybride' };
const MARGIN = 18;
const BOTTOM = 276;

// Helvetica supports French and the euro in WinAnsi, but not the narrow spaces
// emitted by Intl or typographic symbols copied from other interfaces.
function pdfText(value) {
  return String(value ?? '')
    .normalize('NFC')
    .replace(/[\u00a0\u202f]/g, ' ')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\u2026/g, '...');
}

function numeric(value) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

function number(value, digits = 0, maximumDigits = digits) {
  const result = numeric(value);
  return result === null ? '-' : pdfText(result.toLocaleString('fr-FR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: maximumDigits,
  }));
}

function money(value, digits = 0) {
  return numeric(value) === null ? '-' : `${number(value, digits)} €`;
}

function reportDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

/** Build a selectable, paginated PDF without accessing the DOM or the network. */
export function createReportDocument({ results = [], vehicles = [], params = {}, isMock = false, generatedAt = new Date() } = {}) {
  const date = reportDate(generatedAt);
  const rawEntries = Array.isArray(results) ? results : results?.resultats;
  const entries = (Array.isArray(rawEntries) ? rawEntries : []).filter(entry => entry && typeof entry === 'object');
  const catalog = Array.isArray(vehicles) ? vehicles : [];
  const settings = params || {};
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const width = doc.internal.pageSize.getWidth();
  const contentWidth = width - MARGIN * 2;
  let y = 36;

  doc.setProperties({
    title: 'AutoCompare - Rapport de coût de possession',
    subject: 'Comparaison des coûts de possession des véhicules',
    author: 'AutoCompare',
    creator: 'AutoCompare',
  });
  doc.setCreationDate(date);

  function write(value, x, baseline, { size = 10, bold = false, color = COLORS.ink, align = 'left' } = {}) {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(color);
    doc.text(pdfText(value), x, baseline, { align });
  }

  function lines(value, availableWidth, size = 10, bold = false) {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    return doc.splitTextToSize(pdfText(value), availableWidth);
  }

  function header() {
    doc.setFillColor(COLORS.ink);
    doc.roundedRect(MARGIN, 14, 8, 8, 2, 2, 'F');
    write('A', MARGIN + 4, 19.8, { size: 12, bold: true, color: COLORS.accent, align: 'center' });
    write('AutoCompare', MARGIN + 11, 20, { size: 15, bold: true });
    write('VOTRE COÛT ESTIMÉ, EN CLAIR.', width - MARGIN, 20, { size: 7, color: COLORS.muted, align: 'right' });
    doc.setDrawColor(COLORS.line);
    doc.line(MARGIN, 27, width - MARGIN, 27);
  }

  function page() {
    doc.addPage();
    header();
    y = 38;
  }

  function reserve(height) {
    if (y + height > BOTTOM) page();
  }

  function paragraph(value, { size = 10, bold = false, color = COLORS.ink, gap = 4, availableWidth = contentWidth } = {}) {
    const lineHeight = size * 0.46;
    for (const line of lines(value, availableWidth, size, bold)) {
      reserve(lineHeight);
      write(line, MARGIN, y, { size, bold, color });
      y += lineHeight;
    }
    y += gap;
  }

  function section(title, subtitle) {
    reserve(19);
    paragraph(title, { size: 14, bold: true, gap: subtitle ? 1 : 4 });
    if (subtitle) paragraph(subtitle, { size: 8, color: COLORS.muted, gap: 5 });
  }

  function vehicleFor(result) {
    return catalog.find(vehicle => String(vehicle?.id) === String(result.vehicule_id)) || {};
  }

  function vehicleName(result) {
    const vehicle = vehicleFor(result);
    return vehicle.marque || vehicle.modele ? vehicleLabel(vehicle) : `Véhicule ${result.vehicule_id ?? ''}`.trim();
  }

  header();
  paragraph('Votre prochain véhicule,', { size: 25, bold: true, gap: 0 });
  paragraph('les chiffres en clair.', { size: 25, bold: true, gap: 5 });
  paragraph(`Rapport de coût total de possession · ${date.toLocaleDateString('fr-FR')}`, { size: 10, color: COLORS.muted, gap: 7 });

  const years = numeric(settings.duree_annees);
  const annualKm = numeric(settings.kilometrage_annuel);
  const parameterValues = [
    ['DISTANCE ANNUELLE', `${number(annualKm)} km / an`],
    ['DURÉE DE POSSESSION', `${number(years)} an${years === 1 ? '' : 's'}`],
    ['RÉGION', REGIONS[settings.region] || settings.region || '-'],
  ];
  const parameterWidth = contentWidth / 3;
  const parameterLines = parameterValues.map(([, value]) => lines(value, parameterWidth - 8, 12, true));
  const parameterHeight = Math.max(25, 16 + Math.max(...parameterLines.map(value => value.length)) * 5.5);
  reserve(parameterHeight);
  doc.setFillColor(COLORS.pale);
  doc.roundedRect(MARGIN, y - 2, contentWidth, parameterHeight, 3, 3, 'F');
  parameterValues.forEach(([label], index) => {
    const x = MARGIN + 6 + index * parameterWidth;
    write(label, x, y + 5, { size: 7, color: COLORS.muted });
    parameterLines[index].forEach((line, lineIndex) => write(line, x, y + 13 + lineIndex * 5.5, { size: 12, bold: true }));
  });
  y += parameterHeight + 7;
  paragraph(isMock
    ? 'Données de démonstration : cette estimation a été calculée localement.'
    : 'Estimation calculée par AutoCompare à partir des caractéristiques CarAPI. CarAPI ne fournit pas les coûts de possession.',
  { size: 8, color: COLORS.muted, gap: 5 });
  if (catalog.some(vehicle => vehicle.source === 'carapi')) {
    paragraph('Sans ajustement personnel : MSRP historique américain converti à 1 USD = 0,92 EUR, sans cours du jour ni prix d’occasion actuel. Consommation EPA convertie en unités métriques, distincte du WLTP. Les valeurs personnalisées remplacent ces références.', { size: 8, color: COLORS.muted, gap: 4 });
  }
  paragraph('Hypothèses : essence/hybride 1,85 EUR/L ; diesel 1,70 EUR/L ; électricité 0,25 EUR/kWh. Énergie : facteur 1,15 en Allemagne, 1,25 en Suisse, 1 ailleurs. Par an : entretien 450 EUR en électrique ou 700 EUR ; assurance 850 EUR en électrique ou 980 EUR ; autres 300 EUR. Décote : 10 % de la valeur restante par an. Tarifs constants, sans financement, fiscalité d’importation ni ajustement pour l’âge ou l’état réel du véhicule. Total = dépenses d’usage + perte de valeur.', { size: 8, color: COLORS.muted, gap: 5 });
  if (entries.some(entry => entry.hypotheses_appliquees?.personnalises.length)) {
    paragraph('Personnalisation : les valeurs saisies détaillées sur chaque fiche remplacent les hypothèses par défaut ci-dessus. Un prix d’énergie saisi est utilisé sans coefficient pays. Une revente saisie définit la perte de valeur finale, répartie linéairement sur les années. Ces hypothèses ne sont pas des prévisions garanties.', { size: 8, color: COLORS.muted, gap: 5 });
  }

  const ranked = entries.filter(entry => numeric(entry.cout_total) !== null)
    .sort((a, b) => Number(a.cout_total) - Number(b.cout_total));
  const best = ranked[0];
  const worst = ranked[ranked.length - 1];

  if (best) {
    const bestLines = lines(vehicleName(best), contentWidth - 14, 19, true);
    const savings = Number(worst.cout_total) - Number(best.cout_total);
    const ties = ranked.filter(entry => Number(entry.cout_total) === Number(best.cout_total)).length;
    const description = ranked.length > 1
      ? `${money(savings)} d'économie sur la période face au véhicule le plus coûteux de la sélection.`
      : 'Coût estimé pour le véhicule sélectionné sur toute la période.';
    const descriptionLines = lines(description, contentWidth - 14, 9);
    const cardHeight = 22 + bestLines.length * 8 + descriptionLines.length * 4.5;
    reserve(cardHeight + 9);
    doc.setFillColor(COLORS.ink);
    doc.roundedRect(MARGIN, y - 1, contentWidth, cardHeight, 3, 3, 'F');
    write(ranked.length === 1 ? 'VOTRE ESTIMATION' : `LE COÛT LE PLUS BAS${ties > 1 ? ' - EX AEQUO' : ''}`, MARGIN + 7, y + 7,
      { size: 8, bold: true, color: COLORS.accent });
    bestLines.forEach((line, index) => write(line, MARGIN + 7, y + 18 + index * 8,
      { size: 19, bold: true, color: COLORS.white }));
    descriptionLines.forEach((line, index) => write(line, MARGIN + 7, y + 24 + (bestLines.length - 1) * 8 + index * 4.5,
      { size: 9, color: COLORS.white }));
    y += cardHeight + 8;
  }

  section('La comparaison en un regard', `${entries.length} véhicule${entries.length === 1 ? '' : 's'} · Montants estimés en euros`);

  function comparisonHeader() {
    reserve(14);
    doc.setFillColor(COLORS.pale);
    doc.rect(MARGIN, y - 4, contentWidth, 9, 'F');
    write('VÉHICULE', MARGIN + 3, y + 1, { size: 7, bold: true });
    write('TOTAL', width - MARGIN - 62, y + 1, { size: 7, bold: true, align: 'right' });
    write('PAR MOIS', width - MARGIN - 29, y + 1, { size: 7, bold: true, align: 'right' });
    write('PAR KM', width - MARGIN - 3, y + 1, { size: 7, bold: true, align: 'right' });
    y += 12;
  }

  comparisonHeader();
  for (const entry of entries) {
    const nameLines = lines(vehicleName(entry), contentWidth - 103, 9, entry === best);
    const rowHeight = Math.max(12, nameLines.length * 4.2 + 5);
    if (y + rowHeight > BOTTOM) {
      page();
      section('La comparaison en un regard - suite');
      comparisonHeader();
    }
    nameLines.forEach((line, index) => write(line, MARGIN + 3, y + index * 4.2, { size: 9, bold: entry === best }));
    write(money(entry.cout_total), width - MARGIN - 62, y, { size: 10, bold: true, align: 'right' });
    write(money(entry.cout_mensuel_moyen), width - MARGIN - 29, y, { size: 9, align: 'right' });
    write(money(entry.cout_par_km, 2), width - MARGIN - 3, y, { size: 9, align: 'right' });
    doc.setDrawColor(COLORS.line);
    doc.line(MARGIN, y + rowHeight - 5, width - MARGIN, y + rowHeight - 5);
    y += rowHeight;
  }
  if (!entries.length) paragraph('Aucun résultat de simulation disponible.', { color: COLORS.muted });
  y += 5;
  paragraph('Le coût total comprend la décote estimée, l’énergie, l’assurance, l’entretien et les autres frais. Le prix d’achat ne s’ajoute pas à la décote. Les montants sont des estimations selon les paramètres choisis.', { size: 8, color: COLORS.muted });

  entries.forEach((entry, entryIndex) => {
    page();
    y = 35;
    const vehicle = vehicleFor(entry);
    paragraph(`FICHE ${String(entryIndex + 1).padStart(2, '0')} / ${String(entries.length).padStart(2, '0')}`, { size: 8, bold: true, color: COLORS.muted, gap: 2 });
    paragraph(vehicleName(entry), { size: 22, bold: true, gap: 2 });
    const specifications = [ENGINES[vehicle.motorisation] || vehicle.motorisation, vehicle.annee].filter(Boolean).join(' · ');
    if (specifications) paragraph(specifications, { size: 9, color: COLORS.muted, gap: 4 });

    reserve(31);
    doc.setFillColor(COLORS.pale);
    doc.roundedRect(MARGIN, y - 1, contentWidth, 25, 3, 3, 'F');
    const metrics = [
      ['COÛT TOTAL', money(entry.cout_total)],
      ['PAR MOIS', money(entry.cout_mensuel_moyen)],
      ['PAR KILOMÈTRE', money(entry.cout_par_km, 2)],
    ];
    metrics.forEach(([label, value], index) => {
      const x = MARGIN + 6 + index * parameterWidth;
      write(label, x, y + 6, { size: 7, color: COLORS.muted });
      write(value, x, y + 17, { size: 18, bold: true });
    });
    y += 31;

    const applied = entry.hypotheses_appliquees;
    if (applied) {
      section('Hypothèses utilisées', 'Saisi : votre valeur. Référence : valeur indicative. Calculé : revente à 10 % de décote annuelle.');
      const energyUnit = vehicle.motorisation === 'electrique' ? 'EUR/kWh' : 'EUR/L';
      const consumptionUnit = vehicle.motorisation === 'electrique' ? 'kWh/100 km' : 'L/100 km';
      const assumptions = [['prix_achat', 'Achat', 'EUR'], ['valeur_revente', `Revente après ${number(years)} ans`, 'EUR'], ['consommation', 'Consommation', consumptionUnit], ['prix_energie', 'Énergie', energyUnit], ['assurance_annuelle', 'Assurance', 'EUR/an'], ['entretien_annuel', 'Entretien', 'EUR/an'], ['autres_annuels', 'Autres frais', 'EUR/an']];
      for (const [key, label, unit] of assumptions) {
        const origin = applied.personnalises.includes(key) ? 'Saisi' : key === 'valeur_revente' ? 'Calculé' : 'Référence';
        paragraph(`${label} : ${number(applied[key], 2, ['prix_energie', 'consommation'].includes(key) ? 4 : 2)} ${unit} (${origin})`, { size: 8, gap: 1 });
      }
      paragraph(applied.methode_decote === 'lineaire_jusqua_revente' ? 'Décote répartie linéairement jusqu’à la revente saisie.' : 'Décote de 10 % par an sur la valeur restante.', { size: 8, color: COLORS.muted, gap: 5 });
    }

    section('Ce que vous payez', 'Répartition des coûts sur toute la durée de possession');
    const detail = entry.detail || {};
    const largestCost = Math.max(1, ...COSTS.map(([key]) => Math.max(0, numeric(detail[key]) || 0)));
    for (const [key, label] of COSTS) {
      reserve(11);
      write(label, MARGIN, y, { size: 9 });
      doc.setFillColor(COLORS.pale);
      doc.roundedRect(MARGIN + 45, y - 3, 89, 4, 1, 1, 'F');
      const value = numeric(detail[key]);
      const barWidth = Math.max(0, value || 0) / largestCost * 89;
      if (barWidth > 0) {
        doc.setFillColor(key === 'decote_estimee' ? COLORS.ink : COLORS.accent);
        doc.roundedRect(MARGIN + 45, y - 3, barWidth, 4, Math.min(1, barWidth / 2), 1, 'F');
      }
      write(money(value), width - MARGIN, y, { size: 10, bold: true, align: 'right' });
      y += 9;
    }
    y += 5;

    const evolution = Array.isArray(entry.evolution_annuelle) ? entry.evolution_annuelle.filter(Boolean) : [];
    if (evolution.length) {
      section('Le coût au fil des années', 'Coût cumulé depuis le début de la possession');
      function annualHeader() {
        reserve(13);
        doc.setFillColor(COLORS.pale);
        doc.rect(MARGIN, y - 4, contentWidth, 8, 'F');
        write('ANNÉE', MARGIN + 3, y + 1, { size: 7, bold: true });
        write('COÛT CUMULÉ', width - MARGIN - 3, y + 1, { size: 7, bold: true, align: 'right' });
        y += 10;
      }
      annualHeader();
      for (const annual of evolution) {
        if (y + 6 > BOTTOM) {
          page();
          paragraph(vehicleName(entry), { size: 15, bold: true });
          section('Le coût au fil des années - suite');
          annualHeader();
        }
        write(`Année ${number(annual.annee)}`, MARGIN + 3, y, { size: 8 });
        write(money(annual.cout_cumule), width - MARGIN - 3, y, { size: 8, align: 'right' });
        doc.setDrawColor(COLORS.line);
        doc.line(MARGIN, y + 2, width - MARGIN, y + 2);
        y += 6;
      }
    }
  });

  const pageCount = doc.getNumberOfPages();
  for (let index = 1; index <= pageCount; index++) {
    doc.setPage(index);
    doc.setDrawColor(COLORS.line);
    doc.line(MARGIN, 281, width - MARGIN, 281);
    write(isMock ? 'AutoCompare · Démonstration · Montants estimés en euros' : 'AutoCompare · Montants estimés en euros', MARGIN, 287,
      { size: 7, color: COLORS.muted });
    write(`${index} / ${pageCount}`, width - MARGIN, 287, { size: 8, color: COLORS.muted, align: 'right' });
  }
  return doc;
}

/** Download the report in a browser and return its filename. */
export async function exportReport(options = {}) {
  const date = reportDate(options.generatedAt ?? new Date());
  const doc = createReportDocument({ ...options, generatedAt: date });
  const filename = `AutoCompare_TCO_${date.toISOString().slice(0, 10)}.pdf`;
  await doc.save(filename, { returnPromise: true });
  return filename;
}
