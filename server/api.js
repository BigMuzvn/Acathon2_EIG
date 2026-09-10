import { createCarApiClient, serviceError } from './carapi.js';
import { calculateTco, validateParameters, ASSUMPTIONS } from '../shared/tco.js';
import { randomUUID } from 'node:crypto';
import { clientAddress, createWindowLimiter, configuredLimit, defaultLogger, logEvent } from './protection.js';

async function readBody(req) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw serviceError(415, 'Un corps JSON est requis.');
  let parsed;
  try { parsed = req.body; } catch { throw serviceError(400, 'Le corps de la requête doit être un JSON valide.'); }
  if (parsed !== undefined) {
    if (JSON.stringify(parsed).length > 32000) throw serviceError(413, 'La requête est trop volumineuse.');
    if (typeof parsed === 'object') return parsed;
    try { return JSON.parse(parsed); } catch { throw serviceError(400, 'Le corps de la requête doit être un JSON valide.'); }
  }
  let text = '';
  for await (const chunk of req) {
    text += chunk.toString();
    if (text.length > 32000) throw serviceError(413, 'La requête est trop volumineuse.');
  }
  try { return JSON.parse(text); } catch { throw serviceError(400, 'Le corps de la requête doit être un JSON valide.'); }
}

/** Our application routes; /vehicules and /simulation are NOT CarAPI endpoints. */
export function createApiHandler(options = {}) {
  const env = options.env || process.env;
  const logger = options.logger || defaultLogger;
  const consume = options.limiter || createWindowLimiter({ limit: configuredLimit(env.CARAPI_CLIENT_POINTS_PER_MINUTE, 120) });
  const carapi = options.client || createCarApiClient(options);
  return async function handleApi(req, res, next) {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/api/')) { if (next) next(); return; }
    const started = Date.now();
    const requestId = randomUUID();
    const routeName = url.pathname === '/api/vehicules' ? 'catalogue' : url.pathname === '/api/catalogue-options' ? 'suggestions' : url.pathname === '/api/simulation' ? 'simulation' : url.pathname.startsWith('/api/vehicules/') ? 'vehicle' : url.pathname === '/api/health' ? 'health' : 'unknown';
    res.setHeader('X-Request-Id', requestId);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    try {
      consume(clientAddress(req, env), routeName === 'catalogue' ? 10 : routeName === 'simulation' ? 3 : 1);
      let result;
      if (url.pathname === '/api/health' && req.method === 'GET') result = { status: 'ok', service: 'autocompare', checks: { server: 'ok' } };
      else if (url.pathname === '/api/vehicules' && req.method === 'GET') result = await carapi.catalogue(url.searchParams);
      else if (url.pathname === '/api/catalogue-options' && req.method === 'GET') result = await carapi.catalogueOptions(url.searchParams);
      else if (/^\/api\/vehicules\/[^/]+$/.test(url.pathname) && req.method === 'GET') {
        let id;
        try { id = decodeURIComponent(url.pathname.split('/').at(-1)); } catch { throw serviceError(400, 'Identifiant de véhicule invalide.'); }
        result = await carapi.vehicle(id);
      }
      else if (url.pathname === '/api/simulation' && req.method === 'POST') {
        const params = validateParameters(await readBody(req));
        const vehicles = [];
        for (let offset = 0; offset < params.vehicule_ids.length; offset += 4) {
          vehicles.push(...await Promise.all(params.vehicule_ids.slice(offset, offset + 4).map(id => carapi.vehicle(id))));
        }
        const unsupported = vehicles.filter(vehicle => !vehicle.simulable);
        if (unsupported.length) throw serviceError(422, 'Les caractéristiques de certains véhicules ne permettent pas cette estimation. Retirez-les du comparatif.');
        result = { resultats: calculateTco(vehicles, params), source: 'autocompare', hypotheses: ASSUMPTIONS };
      } else {
        const known = url.pathname === '/api/health' || url.pathname === '/api/catalogue-options' || url.pathname === '/api/simulation' || /^\/api\/vehicules(?:\/[^/]+)?$/.test(url.pathname);
        if (known) res.setHeader('Allow', url.pathname === '/api/simulation' ? 'POST' : 'GET');
        throw serviceError(known ? 405 : 404, known ? 'Méthode non autorisée.' : 'Route inconnue.');
      }
      if (!res.destroyed) res.end(JSON.stringify(result));
    } catch (error) {
      if (res.destroyed) return;
      res.statusCode = error.status >= 400 && error.status <= 599 ? error.status : 500;
      if (error.retryAfter) res.setHeader('Retry-After', String(error.retryAfter));
      res.end(JSON.stringify({ message: error.status ? error.message : 'Le serveur a rencontré une erreur.', requestId, ...(error.retryAfter ? { retry_after: error.retryAfter } : {}), ...(error.vehicleIds ? { missing_vehicle_ids: error.vehicleIds } : {}) }));
    } finally {
      logEvent(logger, { event: 'api_request', requestId, route: routeName, method: ['GET', 'POST', 'HEAD', 'OPTIONS'].includes(req.method) ? req.method : 'OTHER', status: res.statusCode, durationMs: Date.now() - started, aborted: res.destroyed && !res.writableEnded });
    }
  };
}
