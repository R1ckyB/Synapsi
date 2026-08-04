// ============================================
// Logger Estructurado — Synapse Backend
// Sistema de logging con niveles, contexto y formato JSON
// Sin dependencias externas (Node.js nativo)
// ============================================

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const CURRENT_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL?.toLowerCase()] ?? LOG_LEVELS.info;
const IS_DEV = process.env.NODE_ENV !== 'production';

/**
 * Emojis para terminal en desarrollo
 */
const EMOJI = { debug: '🔍', info: '💡', warn: '⚠️ ', error: '❌' };
const COLORS = {
  debug: '\x1b[36m',   // Cyan
  info:  '\x1b[32m',   // Green
  warn:  '\x1b[33m',   // Yellow
  error: '\x1b[31m',   // Red
  reset: '\x1b[0m'
};

/**
 * Escribe un log estructurado.
 *
 * @param {string} level   - Nivel: 'debug' | 'info' | 'warn' | 'error'
 * @param {string} mensaje - Mensaje principal
 * @param {Object} contexto - Datos adicionales (uid, ruta, duración, etc.)
 */
function log(level, mensaje, contexto = {}) {
  if (LOG_LEVELS[level] < CURRENT_LEVEL) return;

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    mensaje,
    ...contexto
  };

  if (IS_DEV) {
    // Formato legible para desarrollo
    const color  = COLORS[level] || '';
    const reset  = COLORS.reset;
    const emoji  = EMOJI[level] || '';
    const ts     = new Date().toLocaleTimeString('es-MX');
    const ctx    = Object.keys(contexto).length > 0
      ? ' ' + JSON.stringify(contexto)
      : '';

    const fn = level === 'error' ? console.error
             : level === 'warn'  ? console.warn
             : console.log;

    fn(`${color}${emoji} [${ts}] ${mensaje}${reset}${ctx}`);
  } else {
    // Formato JSON para producción (CloudWatch, Stackdriver, etc.)
    console.log(JSON.stringify(entry));
  }
}

// ── Métodos de conveniencia ──

/** @param {string} msg @param {Object} ctx */
const debug = (msg, ctx) => log('debug', msg, ctx);

/** @param {string} msg @param {Object} ctx */
const info  = (msg, ctx) => log('info',  msg, ctx);

/** @param {string} msg @param {Object} ctx */
const warn  = (msg, ctx) => log('warn',  msg, ctx);

/** @param {string} msg @param {Object} ctx */
const error = (msg, ctx) => log('error', msg, ctx);

/**
 * Middleware de Express que loguea cada petición HTTP con duración.
 */
function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level    = res.statusCode >= 500 ? 'error'
                   : res.statusCode >= 400 ? 'warn'
                   : 'info';

    log(level, `${req.method} ${req.path}`, {
      status:   res.statusCode,
      duracionMs: duration,
      ip:       req.ip || req.headers['x-forwarded-for'],
      uid:      req.usuario?.uid || 'anon'
    });
  });

  next();
}

module.exports = { log, debug, info, warn, error, requestLogger };
