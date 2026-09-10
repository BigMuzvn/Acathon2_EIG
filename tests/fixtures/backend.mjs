export const catalogue = [
  { id: 'veh_001', marque: 'Renault', modele: 'Clio V 1.0 TCe', motorisation: 'essence', prix_achat: 21000, consommation_moyenne: 5.5, annee: 2025 },
  { id: 'veh_002', marque: 'Renault', modele: 'Mégane E-Tech', motorisation: 'electrique', prix_achat: 35000, consommation_moyenne: 16.5, annee: 2025 },
  { id: 'veh_003', marque: 'Peugeot', modele: 'e-208 GT', motorisation: 'electrique', prix_achat: 33800, consommation_moyenne: 15.2, annee: 2025 },
  { id: 'veh_004', marque: 'Toyota', modele: 'Yaris Hybrid 116', motorisation: 'hybride', prix_achat: 24500, consommation_moyenne: 4.2, annee: 2025 },
  { id: 'veh_005', marque: 'Tesla', modele: 'Model 3 Prop', motorisation: 'electrique', prix_achat: 39990, consommation_moyenne: 14.4, annee: 2025 },
  { id: 'veh_006', marque: 'Volkswagen', modele: 'Golf 8 2.0 TDI', motorisation: 'diesel', prix_achat: 32000, consommation_moyenne: 4.6, annee: 2025 },
];
const imageNames = ['clio', 'megane', 'e208', 'yaris', 'model3', 'golf'];
catalogue.forEach((vehicle, index) => { vehicle.image_url = `/images/${imageNames[index]}.webp`; });

// Deterministic API fixtures validate the UI's behavior independently of the local simulator.
export function simulationFor({ vehicule_ids, kilometrage_annuel, duree_annees, region }) {
  return {
    resultats: vehicule_ids.map(id => {
      const index = catalogue.findIndex(vehicle => vehicle.id === id);
      const energy = [0.1, 0.04, 0.038, 0.075, 0.036, 0.085][index];
      const detail = {
        carburant: Math.round(kilometrage_annuel * duree_annees * energy * (region === 'CH' ? 1.25 : 1)),
        entretien: (index === 0 ? 700 : 450) * duree_annees,
        assurance: (index === 0 ? 980 : 850) * duree_annees,
        decote_estimee: Math.round(catalogue[index].prix_achat * 0.35),
        autres: 300 * duree_annees,
      };
      const cout_total = Object.values(detail).reduce((total, cost) => total + cost, 0);
      return {
        vehicule_id: id,
        cout_total,
        cout_mensuel_moyen: Math.round(cout_total / (duree_annees * 12)),
        cout_par_km: Number((cout_total / (kilometrage_annuel * duree_annees)).toFixed(2)),
        detail,
        evolution_annuelle: Array.from({ length: duree_annees }, (_, index) => ({
          annee: index + 1,
          cout_cumule: Math.round(cout_total * (index + 1) / duree_annees),
        })),
      };
    }),
  };
}

export async function mockBackend(page, overrides = {}) {
  const state = {
    requests: [],
    catalogue: structuredClone(catalogue),
    missingIds: new Set(),
    simulationErrors: [],
    delayFor: () => 0,
    includeMissingIds: true,
    catalogueStatus: 200,
    networkFailure: false,
    respondToSimulation: simulationFor,
    ...overrides,
  };
  await page.route(/\/(vehicules(?:\/[^?]*)?|simulation)(?:\?.*)?$/, async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const body = request.method() === 'POST' ? request.postDataJSON() : undefined;
    const record = { method: request.method(), path, body, responded: false };
    state.requests.push(record);
    if (state.networkFailure) return route.abort('failed');
    let status = 200;
    let response;
    if (path.endsWith('/simulation')) {
      const missing = body.vehicule_ids.filter(id => state.missingIds.has(id));
      const error = state.simulationErrors.shift();
      if (error) {
        status = error.status;
        response = { message: error.message };
      } else if (missing.length) {
        status = 404;
        response = { message: 'Ce véhicule est indisponible.', ...(state.includeMissingIds ? { missing_vehicle_ids: missing } : {}) };
      } else {
        response = state.respondToSimulation(body);
      }
      const delay = state.delayFor(body);
      if (delay) await new Promise(resolve => setTimeout(resolve, delay));
    } else if (path.endsWith('/vehicules')) {
      status = state.catalogueStatus;
      response = status === 200 ? state.catalogue.filter(vehicle => !state.missingIds.has(vehicle.id)) : { message: 'Catalogue temporairement indisponible.' };
    } else {
      const id = decodeURIComponent(path.split('/').at(-1));
      response = state.catalogue.find(vehicle => vehicle.id === id);
      if (!response || state.missingIds.has(id)) {
        status = 404;
        response = { message: 'Véhicule introuvable.' };
      }
    }
    try {
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(response) });
      record.responded = true;
    } catch (error) {
      // Cancellation is expected in the race regression scenario.
      record.cancelled = true;
      record.error = error.message;
    }
  });
  return state;
}
