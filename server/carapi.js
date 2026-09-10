import { ASSUMPTIONS } from '../shared/tco.js';
import { createWindowLimiter, configuredLimit, limitError, defaultLogger, logEvent } from './protection.js';

export const serviceError = (status, message, extra = {}) => Object.assign(new Error(message), { status, ...extra });
const positive = value => value !== null && value !== '' && Number.isFinite(Number(value)) && Number(value) > 0;

/** Convert US EPA units and historical USD MSRP; never replace missing specifications. */
export function adaptTrim(trim) {
  if (!Number.isInteger(trim?.id) || typeof trim.make !== 'string' || typeof trim.model !== 'string') {
    throw serviceError(502, 'CarAPI a renvoyé une fiche véhicule invalide.');
  }
  const engine = trim.engines?.[0];
  const mileage = trim.mileages?.[0];
  const type = engine?.engine_type?.toLowerCase() || '';
  const fuel = engine?.fuel_type?.toLowerCase() || '';
  let motorisation;
  // Plug-in hybrids require a charge/use split not available in this scenario.
  if (/plug|fuel cell|hydrogen|natural gas/.test(`${type} ${fuel}`)) motorisation = null;
  else if (type === 'electric') motorisation = 'electrique';
  else if (/hybrid/.test(type)) motorisation = 'hybride';
  else if (/diesel/.test(`${type} ${fuel}`)) motorisation = 'diesel';
  else if (type === 'gas' && /unleaded|gasoline|flex-fuel/.test(fuel)) motorisation = 'essence';
  const rawConsumption = motorisation === 'electrique' ? mileage?.epa_kwh_100_mi_electric : mileage?.combined_mpg;
  const consommation = positive(rawConsumption)
    ? (motorisation === 'electrique' ? Number(rawConsumption) / 1.609344 : 235.214583 / Number(rawConsumption)) : null;
  const eligible = !!motorisation && consommation !== null && positive(trim.msrp);
  return {
    id: `carapi_${trim.id}`, marque: trim.make, modele_base: trim.model, modele: [trim.model, trim.trim].filter(Boolean).join(' '),
    description: trim.description || '', annee: trim.year, motorisation: motorisation || 'non prise en charge',
    prix_achat: positive(trim.msrp) ? Math.round(Number(trim.msrp) * ASSUMPTIONS.usd_to_eur) : null,
    consommation_moyenne: consommation === null ? null : Number(consommation.toFixed(2)),
    msrp_usd: positive(trim.msrp) ? Number(trim.msrp) : null,
    source: 'carapi', simulable: eligible,
    indisponibilite: !motorisation ? 'Motorisation non prise en charge par ce calcul.'
      : consommation === null ? 'Consommation EPA non renseignée.' : !positive(trim.msrp) ? 'Prix catalogue non renseigné.' : null,
  };
}

export function createCarApiClient({ env = process.env, fetchImpl = globalThis.fetch, timeoutMs = 15000, cacheMs = 300000, logger = defaultLogger } = {}) {
  const cache = new Map();
  const pending = new Map();
  let jwt = '';
  let jwtUntil = 0;
  let loginPending;
  let activeRequests = 0;
  let upstreamRetryAt = 0;
  const consumeUpstream = createWindowLimiter({ limit: configuredLimit(env.CARAPI_UPSTREAM_PER_MINUTE, 240), maxKeys: 1 });
  const authenticated = !!(env.CARAPI_API_TOKEN && env.CARAPI_API_SECRET);
  async function fetchUpstream(path, options = {}) {
    if (Date.now() < upstreamRetryAt) throw limitError(Math.ceil((upstreamRetryAt - Date.now()) / 1000));
    if (activeRequests >= 16) throw Object.assign(new Error('Le catalogue reçoit beaucoup de demandes. Réessayez dans un instant.'), { status: 503, retryAfter: 5 });
    consumeUpstream('upstream');
    activeRequests++;
    try {
      const response = await fetchImpl(`https://carapi.app/api${path}`, { ...options, signal: AbortSignal.timeout(timeoutMs) });
      if (response.status === 429) {
        const header = response.headers.get('retry-after');
        const seconds = Number(header);
        const retryMs = header && Number.isFinite(seconds) ? seconds * 1000 : Date.parse(header) - Date.now();
        upstreamRetryAt = Date.now() + Math.min(3600000, Math.max(1000, Number.isFinite(retryMs) ? retryMs : 60000));
      }
      return response;
    } catch (error) {
      throw serviceError(error.name === 'TimeoutError' ? 504 : 502, 'CarAPI ne répond pas actuellement. Réessayez dans un instant.');
    } finally {
      activeRequests--;
    }
  }
  async function token() {
    if (!authenticated) return '';
    if (jwt && Date.now() < jwtUntil) return jwt;
    if (!loginPending) loginPending = (async () => {
      const response = await fetchUpstream('/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_token: env.CARAPI_API_TOKEN, api_secret: env.CARAPI_API_SECRET }),
      });
      if (!response.ok) throw serviceError(response.status === 429 ? 429 : 502, 'Authentification CarAPI impossible. Vérifiez les identifiants côté serveur.');
      const value = (await response.text()).trim().replace(/^"|"$/g, '');
      if (!/^[\w-]+\.[\w-]+\.[\w-]+$/.test(value)) throw serviceError(502, 'Réponse d’authentification CarAPI invalide.');
      jwt = value;
      jwtUntil = Date.now() + 6 * 86400000;
      return jwt;
    })().finally(() => { loginPending = null; });
    return loginPending;
  }
  async function request(path) {
    const cached = cache.get(path);
    if (cached && cached.until > Date.now()) return cached.data;
    if (pending.has(path)) return pending.get(path);
    const promise = (async () => {
      let auth = await token();
      const call = () => fetchUpstream(path, { headers: { Accept: 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) } });
      let response = await call();
      if (response.status === 401 && authenticated) {
        jwtUntil = 0;
        auth = await token();
        response = await call();
      }
      if (!response.ok) {
        const messages = { 401: 'CarAPI refuse l’authentification du serveur.', 403: 'Ces données nécessitent un abonnement CarAPI adapté.', 404: 'Cette fiche n’existe plus dans CarAPI.', 429: 'La limite de requêtes CarAPI est atteinte. Réessayez plus tard.' };
        throw serviceError(response.status, messages[response.status] || `CarAPI a renvoyé une erreur (${response.status}). Réessayez.`, response.status === 429 ? { retryAfter: Math.max(1, Math.ceil((upstreamRetryAt - Date.now()) / 1000)) } : {});
      }
      let data;
      try { data = await response.json(); } catch { throw serviceError(502, 'La réponse de CarAPI est illisible.'); }
      if (cache.size >= 500) cache.delete(cache.keys().next().value);
      cache.set(path, { until: Date.now() + cacheMs, data });
      return data;
    })().catch(error => {
      logEvent(logger, { event: 'carapi_error', endpoint: path.split('?')[0], status: error.status || 500 });
      throw error;
    }).finally(() => pending.delete(path));
    pending.set(path, promise);
    return promise;
  }
  async function vehicle(id) {
    if (!/^carapi_[1-9]\d{0,9}$/.test(id)) throw serviceError(404, 'Ce véhicule ne figure pas dans CarAPI.', { vehicleIds: [id] });
    try { return adaptTrim(await request(`/trims/v2/${id.slice(7)}`)); }
    catch (error) { if (error.status === 404) error.vehicleIds = [id]; throw error; }
  }
  async function catalogue(search = new URLSearchParams()) {
    const year = Number(search.get('year') || 2020);
    const page = Number(search.get('page') || 1);
    if (!Number.isInteger(year) || year < (authenticated ? 1900 : 2015) || year > (authenticated ? new Date().getFullYear() + 1 : 2020)
      || !Number.isInteger(page) || page < 1 || page > 10000) {
      throw serviceError(400, authenticated ? 'Millésime ou page invalide.' : 'L’accès public CarAPI couvre les millésimes 2015 à 2020. La page doit être un entier positif.');
    }
    const query = new URLSearchParams({ year: String(year), page: String(page), limit: '12' });
    for (const key of ['make', 'model']) {
      const value = search.get(key)?.trim();
      if (value?.length > 80) throw serviceError(400, 'La recherche est trop longue.');
      if (value) query.set(key, value);
    }
    // CarAPI names Tesla models "3", "S", "X", "Y" (GET /models/v2).
    if (query.get('make')?.toLowerCase() === 'tesla') {
      const model = query.get('model')?.match(/^model\s+([3sxy])$/i);
      if (model) query.set('model', model[1].toUpperCase());
    }
    const list = await request(`/trims/v2?${query}`);
    if (!Array.isArray(list?.data) || !Number.isInteger(list.collection?.total) || !Number.isInteger(list.collection?.pages)) {
      throw serviceError(502, 'Le catalogue renvoyé par CarAPI est invalide.');
    }
    const data = [];
    const unavailable = [];
    // Bound upstream concurrency and preserve page order.
    for (let offset = 0; offset < list.data.length; offset += 4) {
      data.push(...await Promise.all(list.data.slice(offset, offset + 4).map(async trim => {
        try { return await vehicle(`carapi_${trim.id}`); }
        catch (error) {
          // Authentication/quota failures concern the service; isolated bad sheets do not.
          if (![404, 408, 422, 500, 502, 503, 504].includes(error.status)) throw error;
          unavailable.push({ id: `carapi_${trim.id}`, status: error.status });
          return { ...adaptTrim({ ...trim, engines: [], mileages: [] }), simulable: false, load_error: true,
            unavailable_permanent: error.status === 404,
            indisponibilite: error.status === 404 ? 'Cette fiche n’est plus disponible.' : 'Caractéristiques temporairement indisponibles. Réessayez le chargement.' };
        }
      })));
    }
    return { data, meta: {
      source: 'carapi', access: authenticated ? 'authenticated' : 'public',
      year, page, pages: list.collection.pages, total: list.collection.total,
      hasMore: page < list.collection.pages, usdToEur: ASSUMPTIONS.usd_to_eur, unavailable,
    } };
  }
  async function catalogueOptions(search = new URLSearchParams()) {
    const year = Number(search.get('year') || 2020);
    const make = search.get('make')?.trim() || '';
    if (!Number.isInteger(year) || year < (authenticated ? 1900 : 2015) || year > (authenticated ? new Date().getFullYear() + 1 : 2020) || make.length > 80) {
      throw serviceError(400, 'Millésime ou marque invalide pour les suggestions.');
    }
    const query = new URLSearchParams({ year: String(year), limit: '1000' });
    const makes = await request(`/makes/v2?${query}`);
    const names = list => {
      if (!Array.isArray(list?.data) || !list.data.every(item => typeof item?.name === 'string' && item.name.trim())) throw serviceError(502, 'Les suggestions CarAPI sont invalides.');
      return [...new Set(list.data.map(item => item.name))].sort((a, b) => a.localeCompare(b, 'fr'));
    };
    const makeNames = names(makes);
    const canonical = makeNames.find(name => name.toLowerCase() === make.toLowerCase());
    let models = [];
    if (canonical) {
      query.set('make', canonical);
      const data = await request(`/models/v2?${query}`);
      models = names(data).map(name => canonical === 'Tesla' && /^[3SXY]$/i.test(name) ? `Model ${name.toUpperCase()}` : name);
    }
    return { makes: makeNames, models };
  }
  return { catalogue, vehicle, catalogueOptions };
}
