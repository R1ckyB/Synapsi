// ============================================
// Middleware: Rate Limiter con Firestore (Multi-Instancia)
// Synapse - Backend
// FIX #6 — Soporta múltiples instancias de Cloud Run
// ============================================

const { getDb } = require('../config/firebase');

/**
 * Caché local para reducir lecturas a Firestore.
 * Estructura: { [clave]: { count, resetAt, ultimaSync } }
 */
const cacheLocal = new Map();
const SYNC_INTERVAL_MS = 5000; // Sincroniza con Firestore cada 5 segundos
const COLECCION = 'rate_limits';

/**
 * Limpia entradas expiradas del caché local cada 5 minutos.
 */
const cleanupInterval = setInterval(() => {
  const ahora = Date.now();
  for (const [clave, datos] of cacheLocal.entries()) {
    if (ahora > datos.resetAt) cacheLocal.delete(clave);
  }
}, 5 * 60 * 1000);
if (cleanupInterval.unref) cleanupInterval.unref();

/**
 * Obtiene o inicializa el contador para una clave (ip + endpoint).
 * Primero revisa el caché local; si no existe o está expirado, consulta Firestore.
 */
async function obtenerContador(clave, ventanaMs) {
  const ahora = Date.now();
  const db = getDb();

  // Usar caché local si está vigente y fue sincronizado recientemente
  const local = cacheLocal.get(clave);
  if (local && ahora < local.resetAt && ahora - local.ultimaSync < SYNC_INTERVAL_MS) {
    return local;
  }

  // Consultar Firestore
  if (db) {
    try {
      const ref = db.collection(COLECCION).doc(clave.replace(/[^a-zA-Z0-9]/g, '_'));
      const doc = await ref.get();

      if (doc.exists) {
        const datos = doc.data();
        if (ahora < datos.resetAt) {
          const registro = { count: datos.count, resetAt: datos.resetAt, ultimaSync: ahora };
          cacheLocal.set(clave, registro);
          return registro;
        }
      }
    } catch (err) {
      console.warn('⚠️ Rate limiter: no se pudo leer Firestore, usando caché local.', err.message);
      if (local) return local; // Fallback a caché si Firestore falla
    }
  }

  // Crear nuevo registro (ventana fresca)
  const nuevo = { count: 0, resetAt: ahora + ventanaMs, ultimaSync: ahora };
  cacheLocal.set(clave, nuevo);
  return nuevo;
}

/**
 * Incrementa el contador en caché y persiste en Firestore de forma asíncrona.
 */
function incrementarContador(clave, registro) {
  registro.count += 1;
  registro.ultimaSync = Date.now();
  cacheLocal.set(clave, registro);

  // Persistir en Firestore sin bloquear el request
  const db = getDb();
  if (db) {
    const ref = db.collection(COLECCION).doc(clave.replace(/[^a-zA-Z0-9]/g, '_'));
    ref.set(
      { count: registro.count, resetAt: registro.resetAt, ultimaActualizacion: new Date().toISOString() },
      { merge: true }
    ).catch(err => console.warn('⚠️ Rate limiter: no se pudo guardar en Firestore.', err.message));
  }
}

/**
 * Crea un middleware de rate limiting respaldado por Firestore.
 *
 * @param {Object} opciones
 * @param {number} opciones.max       - Máximo de peticiones en la ventana
 * @param {number} opciones.ventanaMs - Ventana de tiempo en ms (default: 60000)
 * @param {string} opciones.mensaje   - Mensaje de error personalizado
 */
function crearRateLimiter({ max = 60, ventanaMs = 60 * 1000, mensaje = null } = {}) {
  return async (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const endpoint = req.path || 'general';
    const clave = `${ip}::${endpoint}`;

    try {
      const registro = await obtenerContador(clave, ventanaMs);

      if (registro.count >= max) {
        const segundosRestantes = Math.ceil((registro.resetAt - Date.now()) / 1000);
        return res.status(429).json({
          error: true,
          codigo: 'RATE_LIMIT_EXCEDIDO',
          mensaje: mensaje || `Demasiadas peticiones. Intenta de nuevo en ${segundosRestantes} segundos.`,
          retryAfter: segundosRestantes
        });
      }

      // Headers informativos estándar (Rate Limit Headers RFC)
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - registro.count - 1));
      res.setHeader('X-RateLimit-Reset', Math.ceil(registro.resetAt / 1000));

      incrementarContador(clave, registro);
      next();
    } catch (err) {
      // Si el rate limiter falla completamente, dejar pasar el request (no bloquear el servicio)
      console.error('⚠️ Rate limiter falló, dejando pasar el request:', err.message);
      next();
    }
  };
}

// ── Limitadores predefinidos por tipo de endpoint ──

/** Endpoints de IA (tutoria, audio, imagen): 20 req/min por IP */
const limiterIA = crearRateLimiter({
  max: 20,
  ventanaMs: 60_000,
  mensaje: 'Has excedido el límite de consultas al tutor IA. Espera un momento y vuelve a intentarlo.'
});

/** Endpoint de quiz: 15 req/min por IP */
const limiterQuiz = crearRateLimiter({
  max: 15,
  ventanaMs: 60_000,
  mensaje: 'Límite de generación de quizzes alcanzado. Intenta de nuevo en unos segundos.'
});

/** Endpoint de auth: 10 req/min por IP (protección contra brute force) */
const limiterAuth = crearRateLimiter({
  max: 10,
  ventanaMs: 60_000,
  mensaje: 'Demasiados intentos de autenticación. Espera 1 minuto antes de intentarlo de nuevo.'
});

/** Endpoints de profesor: 30 req/min por IP */
const limiterProfesor = crearRateLimiter({
  max: 30,
  ventanaMs: 60_000
});

module.exports = { crearRateLimiter, limiterIA, limiterQuiz, limiterAuth, limiterProfesor };
