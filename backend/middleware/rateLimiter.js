// ============================================
// Middleware: Rate Limiter (Sin dependencias externas)
// Synapse - Backend
// Protege la API contra abuso y exceso de llamadas a Gemini
// ============================================

/**
 * Almacena contadores por IP en memoria.
 * Estructura: { [ip]: { count, resetAt } }
 */
const contadores = new Map();

/**
 * Limpia entradas expiradas para evitar memory leaks.
 * Se ejecuta cada 5 minutos.
 */
setInterval(() => {
  const ahora = Date.now();
  for (const [ip, datos] of contadores.entries()) {
    if (ahora > datos.resetAt) {
      contadores.delete(ip);
    }
  }
}, 5 * 60 * 1000);

/**
 * Crea un middleware de rate limiting configurable.
 *
 * @param {Object} opciones
 * @param {number} opciones.max        - Máximo de peticiones en la ventana de tiempo
 * @param {number} opciones.ventanaMs  - Ventana de tiempo en milisegundos (default: 60000 = 1 minuto)
 * @param {string} opciones.mensaje    - Mensaje de error personalizado
 * @returns {Function} Middleware de Express
 *
 * @example
 * // Máximo 30 peticiones por minuto
 * app.use('/api/tutoria', crearRateLimiter({ max: 30, ventanaMs: 60000 }));
 */
function crearRateLimiter({ max = 60, ventanaMs = 60 * 1000, mensaje = null } = {}) {
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const ahora = Date.now();

    const registro = contadores.get(ip) || { count: 0, resetAt: ahora + ventanaMs };

    // Si la ventana expiró, reiniciar contador
    if (ahora > registro.resetAt) {
      registro.count = 0;
      registro.resetAt = ahora + ventanaMs;
    }

    registro.count++;
    contadores.set(ip, registro);

    // Headers informativos estándar (Rate Limit Headers RFC)
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - registro.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(registro.resetAt / 1000));

    if (registro.count > max) {
      const segundosRestantes = Math.ceil((registro.resetAt - ahora) / 1000);
      return res.status(429).json({
        error: true,
        codigo: 'RATE_LIMIT_EXCEDIDO',
        mensaje: mensaje || `Demasiadas peticiones. Por favor espera ${segundosRestantes} segundo(s) antes de continuar.`,
        reintentarEn: segundosRestantes
      });
    }

    next();
  };
}

// ── Limitadores predefinidos por tipo de ruta ──

/** Endpoints de IA (tutoria, audio, imagen): 20 req/min por IP */
const limiterIA = crearRateLimiter({
  max: 20,
  ventanaMs: 60 * 1000,
  mensaje: 'Has excedido el límite de consultas al tutor IA. Espera un momento y vuelve a intentarlo.'
});

/** Endpoint de quiz: 15 req/min por IP */
const limiterQuiz = crearRateLimiter({
  max: 15,
  ventanaMs: 60 * 1000,
  mensaje: 'Límite de generación de quizzes alcanzado. Intenta de nuevo en unos segundos.'
});

/** Endpoint de auth: 10 req/min por IP (protección contra brute force) */
const limiterAuth = crearRateLimiter({
  max: 10,
  ventanaMs: 60 * 1000,
  mensaje: 'Demasiados intentos de autenticación. Espera 1 minuto antes de intentarlo de nuevo.'
});

/** Endpoints de profesor: 30 req/min por IP */
const limiterProfesor = crearRateLimiter({
  max: 30,
  ventanaMs: 60 * 1000
});

module.exports = { crearRateLimiter, limiterIA, limiterQuiz, limiterAuth, limiterProfesor };
