import { ADJUSTMENT_LIMITS, calculateTco, validateParameters } from '../../shared/tco.js';

const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

// Mock catalog for offline/fallback mode if real API is down or CORS blocked
const MOCK_VEHICLES = [
  {
    id: "veh_001",
    marque: "Renault",
    modele: "Clio V 1.0 TCe",
    motorisation: "essence",
    prix_achat: 21000,
    consommation_moyenne: 5.5,
    annee: 2025,
    image_url: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=500&auto=format&fit=crop&q=80"
  },
  {
    id: "veh_002",
    marque: "Renault",
    modele: "Megane E-Tech",
    motorisation: "electrique",
    prix_achat: 35000,
    consommation_moyenne: 16.5,
    annee: 2025,
    image_url: "https://images.unsplash.com/photo-1563720223185-11003d516935?w=500&auto=format&fit=crop&q=80"
  },
  {
    id: "veh_003",
    marque: "Peugeot",
    modele: "e-208 GT",
    motorisation: "electrique",
    prix_achat: 33800,
    consommation_moyenne: 15.2,
    annee: 2025,
    image_url: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=500&auto=format&fit=crop&q=80"
  },
  {
    id: "veh_004",
    marque: "Toyota",
    modele: "Yaris Hybrid 116",
    motorisation: "hybride",
    prix_achat: 24500,
    consommation_moyenne: 4.2,
    annee: 2025,
    image_url: "https://images.unsplash.com/photo-1590362891991-f776e747a588?w=500&auto=format&fit=crop&q=80"
  },
  {
    id: "veh_005",
    marque: "Tesla",
    modele: "Model 3 Prop",
    motorisation: "electrique",
    prix_achat: 39990,
    consommation_moyenne: 14.4,
    annee: 2025,
    image_url: "https://images.unsplash.com/photo-1536700503339-1e4b06520771?w=500&auto=format&fit=crop&q=80"
  },
  {
    id: "veh_006",
    marque: "Volkswagen",
    modele: "Golf 8 2.0 TDI",
    motorisation: "diesel",
    prix_achat: 32000,
    consommation_moyenne: 4.6,
    annee: 2025,
    image_url: "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=500&auto=format&fit=crop&q=80"
  }
];

const COST_FIELDS = ['carburant', 'entretien', 'assurance', 'decote_estimee', 'autres'];

function apiError(status, message, extra = {}) {
  return Object.assign(new Error(message), { status, ...extra });
}

function checkAborted(signal) {
  if (signal?.aborted) {
    throw signal.reason || new DOMException('La requête a été annulée.', 'AbortError');
  }
}

function isAbortError(error, signal) {
  return signal?.aborted || error?.name === 'AbortError';
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function nonNegativeNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function validVehicle(vehicle) {
  return vehicle && nonEmptyString(vehicle.id) && nonEmptyString(vehicle.marque)
    && nonEmptyString(vehicle.modele) && nonEmptyString(vehicle.motorisation)
    && ((vehicle.source === 'carapi' && vehicle.simulable === false
      && (vehicle.prix_achat === null || nonNegativeNumber(vehicle.prix_achat))
      && (vehicle.consommation_moyenne === null || nonNegativeNumber(vehicle.consommation_moyenne)))
      || (nonNegativeNumber(vehicle.prix_achat) && nonNegativeNumber(vehicle.consommation_moyenne)));
}

function invalidResponse(message) {
  return apiError(502, message || 'La réponse du service est incomplète. Veuillez réessayer.');
}

function validateCatalogue(data) {
  if (!Array.isArray(data) || !data.every(validVehicle)
    || new Set(data.map(vehicle => vehicle.id)).size !== data.length) {
    throw invalidResponse('Le catalogue reçu est invalide. Veuillez réessayer.');
  }
  return data;
}

function validateSimulation(data, vehicleIds) {
  const results = data?.resultats;
  if (!Array.isArray(results) || results.length !== vehicleIds.length) {
    throw invalidResponse();
  }
  const receivedIds = new Set();
  for (const result of results) {
    if (!result || !vehicleIds.includes(result.vehicule_id) || receivedIds.has(result.vehicule_id)
      || !['cout_total', 'cout_mensuel_moyen', 'cout_par_km'].every(key => nonNegativeNumber(result[key]))
      || !COST_FIELDS.every(key => nonNegativeNumber(result.detail?.[key]))
      || !Array.isArray(result.evolution_annuelle) || result.evolution_annuelle.length === 0
      || !result.evolution_annuelle.every(point => point && Number.isInteger(point.annee)
        && point.annee >= 0 && nonNegativeNumber(point.cout_cumule))) {
      throw invalidResponse();
    }
    const applied = result.hypotheses_appliquees;
    if (applied !== undefined && (!applied
      || !Object.keys(ADJUSTMENT_LIMITS).every(key => nonNegativeNumber(applied[key]))
      || !Array.isArray(applied.personnalises) || !applied.personnalises.every(key => Object.hasOwn(ADJUSTMENT_LIMITS, key))
      || !['annuelle_10_pourcent', 'lineaire_jusqua_revente'].includes(applied.methode_decote))) throw invalidResponse();
    receivedIds.add(result.vehicule_id);
  }
  return data;
}

function missingIdsFrom(body, requestedIds) {
  const value = body?.missing_vehicle_ids ?? body?.missing_vehicule_ids
    ?? body?.unknown_vehicle_ids ?? body?.vehicule_ids ?? body?.vehicleIds
    ?? body?.vehicule_id ?? body?.vehicle_id;
  const ids = Array.isArray(value) ? value : [value];
  return [...new Set(ids.filter(id => nonEmptyString(id) && requestedIds.includes(id)))];
}

/** Keep HTTP errors distinct from network failures; only the latter allow a fallback. */
async function requestJson(path, { signal, method = 'GET', body, vehicleIds = [] } = {}) {
  checkAborted(signal);
  const timeout = AbortSignal.timeout(75000);
  const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      signal: requestSignal,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    if (isAbortError(error, signal)) throw error;
    if (timeout.aborted) throw apiError(504, 'Le service met trop de temps à répondre. Réessayez.');
    throw apiError(0, 'Connexion au service impossible. Vérifiez votre connexion puis réessayez.', { cause: error });
  }
  checkAborted(signal);

  let data;
  try {
    data = await response.json();
  } catch (error) {
    if (isAbortError(error, signal)) throw error;
    if (timeout.aborted) throw apiError(504, 'Le service met trop de temps à répondre. Réessayez.');
    if (response.ok) throw invalidResponse('La réponse du service ne peut pas être lue. Veuillez réessayer.');
  }
  checkAborted(signal);

  if (!response.ok) {
    const messages = {
      400: 'Les paramètres envoyés sont invalides.',
      404: 'Un ou plusieurs véhicules de la sélection sont introuvables.',
      500: 'Le service rencontre une erreur. Veuillez réessayer dans un instant.',
    };
    throw apiError(response.status,
      nonEmptyString(data?.message) ? data.message : messages[response.status] || `Erreur du service (${response.status}). Veuillez réessayer.`,
      { vehicleIds: response.status === 404 ? missingIdsFrom(data, vehicleIds) : [],
        ...(Number.isFinite(Number(data?.retry_after)) && Number(data.retry_after) > 0 ? { retryAfter: Number(data.retry_after) } : {}) });
  }
  return data;
}

export async function getCatalogueOptions({ year, make = '', signal }) {
  const query = new URLSearchParams({ year: String(year), make });
  const data = await requestJson(`/catalogue-options?${query}`, { signal });
  if (!data || !['makes', 'models'].every(key => Array.isArray(data[key]) && data[key].every(nonEmptyString))) throw invalidResponse();
  return data;
}

function localVehicle(id) {
  const vehicle = MOCK_VEHICLES.find(item => item.id === id);
  if (!vehicle) {
    throw apiError(404, 'Ce véhicule n’est pas disponible dans le catalogue de démonstration.', { vehicleIds: [id] });
  }
  return { ...vehicle };
}

/** A local catalogue is only returned on network failure, never for an HTTP error. */
export async function getVehicules({ signal, allowFallback = true, query } = {}) {
  try {
    const search = new URLSearchParams(query || {}).toString();
    const response = await requestJson(`/vehicules${search ? `?${search}` : ''}`, { signal });
    const data = validateCatalogue(Array.isArray(response) ? response : response?.data);
    return { data, isMock: false, ...(response?.meta ? { meta: response.meta } : {}) };
  } catch (error) {
    if (isAbortError(error, signal) || !allowFallback || error.status !== 0) throw error;
    return {
      data: MOCK_VEHICLES.map(vehicle => ({ ...vehicle })),
      isMock: true,
      warning: 'Connexion au service indisponible. Le catalogue de démonstration est affiché.',
    };
  }
}

export async function getVehiculeById(id, { signal, source = 'api', allowFallback = false } = {}) {
  checkAborted(signal);
  if (!nonEmptyString(id)) throw apiError(400, 'L’identifiant du véhicule est invalide.');
  if (source === 'local') return localVehicle(id);
  try {
    const data = await requestJson(`/vehicules/${encodeURIComponent(id)}`, { signal, vehicleIds: [id] });
    if (!validVehicle(data) || data.id !== id) throw invalidResponse();
    return data;
  } catch (error) {
    if (isAbortError(error, signal)) throw error;
    if (error.status === 404) error.vehicleIds = [id];
    if (!allowFallback || error.status !== 0) throw error;
    return localVehicle(id);
  }
}

/**
 * Keep the source consistent with the catalogue: a local catalogue must use source: 'local'.
 * Live simulations preserve server errors and never invent data for an unknown vehicle.
 */
export async function runSimulation(payload, { signal, source = 'api', allowFallback = false } = {}) {
  checkAborted(signal);
  const parameters = validateParameters(payload);
  if (source === 'local') return simulateLocally(parameters);
  try {
    const data = validateSimulation(await requestJson('/simulation', {
      method: 'POST', signal, body: parameters, vehicleIds: parameters.vehicule_ids,
    }), parameters.vehicule_ids);
    return { data, isMock: false };
  } catch (error) {
    if (isAbortError(error, signal) || !allowFallback || error.status !== 0) throw error;
    return simulateLocally(parameters);
  }
}

/** The offline sample uses the same cost assumptions as our application server. */
function simulateLocally(parameters) {
  const { vehicule_ids } = parameters;
  const missingIds = vehicule_ids.filter(id => !MOCK_VEHICLES.some(vehicle => vehicle.id === id));
  if (missingIds.length) {
    throw apiError(404, 'Certains véhicules ne sont pas disponibles dans le catalogue de démonstration.', { vehicleIds: missingIds });
  }
  const resultats = calculateTco(vehicule_ids.map(localVehicle), parameters);
  return {
    data: { resultats },
    isMock: true,
    warning: 'Estimation de démonstration calculée localement à partir d’hypothèses indicatives.',
  };
}
