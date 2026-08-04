// ============================================
// Middleware: Autenticación de Endpoints API
// Synapse - Backend
// Soporta: Firebase ID Token (header Authorization: Bearer <token>)
// ============================================

const { getAuth } = require('../config/firebase');

/**
 * Middleware que verifica el Firebase ID Token enviado en el header
 * Authorization: Bearer <idToken>
 *
 * Si Firebase no está configurado (modo dev), acepta la petición
 * y adjunta un usuario de prueba para no bloquear el desarrollo local.
 *
 * En producción, rechaza cualquier petición sin token válido con 401.
 *
 * @param {Request} req
 * @param {Response} res
 * @param {Function} next
 */
async function verificarToken(req, res, next) {
  const auth = getAuth();

  // ── Modo desarrollo sin Firebase configurado ──
  if (!auth) {
    req.usuario = {
      uid: 'dev-user',
      email: 'dev@synapse.edu',
      nombre: 'Dev User',
      rol: 'estudiante'
    };
    return next();
  }

  // ── Extraer token del header Authorization ──
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      error: true,
      codigo: 'TOKEN_REQUERIDO',
      mensaje: 'Se requiere autenticación. Incluye tu Firebase ID Token en el header: Authorization: Bearer <token>'
    });
  }

  try {
    // ── Verificar y decodificar el token con Firebase Admin ──
    const decodedToken = await auth.verifyIdToken(token);

    req.usuario = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      nombre: decodedToken.name || decodedToken.email || 'Usuario',
      rol: decodedToken.rol || 'estudiante'  // Claim personalizado (opcional)
    };

    return next();
  } catch (error) {
    console.warn(`⚠️ Token inválido o expirado: ${error.code || error.message}`);

    const esExpirado = error.code === 'auth/id-token-expired';
    return res.status(401).json({
      error: true,
      codigo: esExpirado ? 'TOKEN_EXPIRADO' : 'TOKEN_INVALIDO',
      mensaje: esExpirado
        ? 'Tu sesión ha expirado. Por favor inicia sesión de nuevo.'
        : 'Token de autenticación inválido.'
    });
  }
}

/**
 * Middleware solo para rutas de profesores.
 * Verifica además que el usuario tenga rol de 'profesor' o 'admin'.
 */
async function verificarProfesor(req, res, next) {
  await verificarToken(req, res, async () => {
    const { rol } = req.usuario;
    if (rol !== 'profesor' && rol !== 'admin') {
      return res.status(403).json({
        error: true,
        codigo: 'SIN_PERMISO',
        mensaje: 'Esta ruta es exclusiva para profesores.'
      });
    }
    next();
  });
}

module.exports = { verificarToken, verificarProfesor };
