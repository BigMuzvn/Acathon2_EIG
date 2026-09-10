import { isIP } from 'node:net';

export const limitError = (retryAfter = 60) => Object.assign(new Error('Trop de demandes rapprochées. Patientez avant de réessayer.'), { status: 429, retryAfter });

/** Bounded fixed-window counters. These limits apply to one server instance. */
export function createWindowLimiter({ limit = 120, windowMs = 60000, maxKeys = 10000, now = Date.now } = {}) {
  const counters = new Map();
  return (key, cost = 1) => {
    const time = now();
    let counter = counters.get(key);
    if (!counter || counter.until <= time) {
      if (counters.size >= maxKeys) {
        for (const [entry, value] of counters) if (value.until <= time) counters.delete(entry);
        if (!counters.has(key) && counters.size >= maxKeys) throw limitError();
      }
      counter = { used: 0, until: time + windowMs };
      counters.set(key, counter);
    }
    if (counter.used + cost > limit) throw limitError(Math.max(1, Math.ceil((counter.until - time) / 1000)));
    counter.used += cost;
  };
}

export function clientAddress(req, env = process.env) {
  // Only trust forwarding headers inserted by the actual Vercel runtime.
  const forwarded = env.VERCEL === '1' ? req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] : null;
  const candidate = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '';
  return isIP(candidate) ? candidate : req.socket?.remoteAddress || 'unknown';
}

export function logEvent(logger, event) {
  // Structured fields only. Never log credentials, request bodies or raw upstream errors.
  try { logger(event); } catch { /* Logging cannot break an otherwise valid request. */ }
}

export const defaultLogger = event => console.info(JSON.stringify(event));

export function configuredLimit(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 100000 ? number : fallback;
}
