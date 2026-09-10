// Educational scenario assumptions, not live tariffs or insurance quotes.
export const ASSUMPTIONS = Object.freeze({
  usd_to_eur: 0.92,
  energy: Object.freeze({ essence: 1.85, hybride: 1.85, diesel: 1.7, electrique: 0.25 }),
  region: Object.freeze({ FR: 1, BE: 1, ES: 1, DE: 1.15, CH: 1.25 }),
  annual_depreciation: 0.1,
});

// Optional values are always entered in euros and metric units, never in USD.
export const ADJUSTMENT_LIMITS = Object.freeze({
  prix_achat: [0, 2000000], valeur_revente: [0, 2000000],
  consommation: [0.1, 200], prix_energie: [0, 20],
  entretien_annuel: [0, 100000], assurance_annuelle: [0, 100000], autres_annuels: [0, 100000],
});
const invalid = message => Object.assign(new Error(message), { status: 400 });

export function validateAdjustments(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length > 100) {
    throw invalid('Les ajustements de véhicules sont invalides.');
  }
  return Object.fromEntries(Object.entries(value).map(([id, fields]) => {
    if (!id.trim() || id.length > 80 || !fields || typeof fields !== 'object' || Array.isArray(fields)) {
      throw invalid('Les ajustements de véhicules sont invalides.');
    }
    const clean = {};
    for (const [key, number] of Object.entries(fields)) {
      const bounds = Object.hasOwn(ADJUSTMENT_LIMITS, key) && ADJUSTMENT_LIMITS[key];
      if (!bounds || typeof number !== 'number' || !Number.isFinite(number) || number < bounds[0] || number > bounds[1]) {
        throw invalid('Saisissez des montants et consommations valides dans les limites indiquées.');
      }
      clean[key] = number;
    }
    return [id, clean];
  }).filter(([, fields]) => Object.keys(fields).length));
}

export function resolveAssumptions(vehicle, parameters) {
  const custom = Object.hasOwn(parameters.ajustements || {}, vehicle.id) ? parameters.ajustements[vehicle.id] : {};
  const electric = vehicle.motorisation === 'electrique';
  const purchase = custom.prix_achat ?? vehicle.prix_achat;
  const resale = custom.valeur_revente ?? purchase * (1 - ASSUMPTIONS.annual_depreciation) ** parameters.duree_annees;
  if (resale > purchase) throw invalid('La valeur de revente estimée ne peut pas dépasser le prix d’achat.');
  return {
    prix_achat: purchase, valeur_revente: resale,
    consommation: custom.consommation ?? vehicle.consommation_moyenne,
    // An actual energy price already includes the user's local conditions.
    prix_energie: custom.prix_energie ?? ASSUMPTIONS.energy[vehicle.motorisation] * ASSUMPTIONS.region[parameters.region],
    entretien_annuel: custom.entretien_annuel ?? (electric ? 450 : 700),
    assurance_annuelle: custom.assurance_annuelle ?? (electric ? 850 : 980),
    autres_annuels: custom.autres_annuels ?? 300,
    personnalises: Object.keys(custom),
    methode_decote: custom.valeur_revente === undefined ? 'annuelle_10_pourcent' : 'lineaire_jusqua_revente',
  };
}

export function validateParameters(payload) {
  const { vehicule_ids: ids, kilometrage_annuel: km, duree_annees: years, region } = payload || {};
  if (!Array.isArray(ids) || !ids.length || ids.length > 50 || new Set(ids).size !== ids.length
    || !ids.every(id => typeof id === 'string' && id.trim().length > 0 && id.length <= 80)
    || !Number.isInteger(km) || km < 2000 || km > 60000
    || !Number.isInteger(years) || years < 1 || years > 15
    || !Object.hasOwn(ASSUMPTIONS.region, region)) {
    throw Object.assign(new Error('Choisissez 1 à 50 véhicules, 2 000 à 60 000 km/an, une durée de 1 à 15 ans et un pays proposé.'), { status: 400 });
  }
  const ajustements = validateAdjustments(payload.ajustements);
  if (Object.keys(ajustements).some(id => !ids.includes(id))) throw invalid('Un ajustement concerne un véhicule absent de la sélection.');
  return { vehicule_ids: [...ids], kilometrage_annuel: km, duree_annees: years, region,
    ...(Object.keys(ajustements).length ? { ajustements } : {}) };
}

export function calculateTco(vehicles, parameters) {
  const { kilometrage_annuel: km, duree_annees: years } = parameters;
  return vehicles.map(vehicle => {
    const assumptions = resolveAssumptions(vehicle, parameters);
    const annualEnergy = km / 100 * assumptions.consommation * assumptions.prix_energie;
    const atYear = year => ({
      carburant: Math.round(annualEnergy * year),
      entretien: Math.round(year * assumptions.entretien_annuel),
      assurance: Math.round(year * assumptions.assurance_annuelle),
      decote_estimee: Math.round(assumptions.methode_decote === 'lineaire_jusqua_revente'
        ? (assumptions.prix_achat - assumptions.valeur_revente) * year / years
        : assumptions.prix_achat * (1 - (1 - ASSUMPTIONS.annual_depreciation) ** year)),
      autres: Math.round(year * assumptions.autres_annuels),
    });
    const sum = detail => Object.values(detail).reduce((total, value) => total + value, 0);
    const detail = atYear(years);
    const cout_total = sum(detail);
    return {
      vehicule_id: vehicle.id, cout_total,
      hypotheses_appliquees: assumptions,
      cout_mensuel_moyen: Math.round(cout_total / (12 * years)),
      cout_par_km: Number((cout_total / (km * years)).toFixed(2)), detail,
      evolution_annuelle: Array.from({ length: years }, (_, index) => ({ annee: index + 1, cout_cumule: sum(atYear(index + 1)) })),
    };
  });
}
