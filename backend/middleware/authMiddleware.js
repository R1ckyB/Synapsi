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
    // FIX #4 — Guard de Firebase en producción
    // Si estamos en producción y Firebase no está configurado, es un error fatal
    if (process.env.NODE_ENV === 'production') {
      console.error('🚨 FATAL: Firebase no configurado en producción. Rechazando request.');
      return res.status(500).json({
        error: true,
        mensaje: 'Error de configuración del servidor. Contacta al administrador.'
      });
    }

    // Solo en desarrollo: usuario de prueba para no bloquear el trabajo local
    console.warn('⚠️  [DEV] Firebase no configurado. Usando usuario de prueba.');
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

  // Si no hay token o es un token demo, solo permitir si ALLOW_DEMO_AUTH=true
  if (!token || token === 'demo-token' || token.startsWith('demo-')) {
    if (process.env.ALLOW_DEMO_AUTH === 'true') {
      req.usuario = {
        uid: 'demo-user',
        email: 'estudiante@synapse.edu',
        nombre: 'Estudiante',
        rol: 'estudiante'
      };
      return next();
    }
    return res.status(401).json({
      error: true,
      codigo: 'TOKEN_REQUERIDO',
      mensaje: 'Acceso denegado. Se requiere un token de sesión válido de Firebase.'
    });
  }

  try {
    // ── Verificar y decodificar el token con Firebase Admin ──
    const decodedToken = await auth.verifyIdToken(token);
    const { getDb } = require('../config/firebase');
    const db = getDb();

    let userRol = decodedToken.rol || 'estudiante';
    if (db && userRol === 'estudiante') {
      try {
        const userDoc = await db.collection('usuarios').doc(decodedToken.uid).get();
        if (userDoc.exists && userDoc.data().rol) {
          userRol = userDoc.data().rol;
        }
      } catch (e) { /* ignore read failure */ }
    }

    req.usuario = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      nombre: decodedToken.name || decodedToken.email || 'Usuario',
      rol: userRol
    };

    return next();
  } catch (error) {
    console.warn(`⚠️ Token de Firebase no verificado (${error.message}). Rechazando petición 401.`);
    return res.status(401).json({
      error: true,
      mensaje: 'Token de sesión inválido o expirado. Por favor inicia sesión nuevamente.'
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
