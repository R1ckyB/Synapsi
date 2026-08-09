// ============================================
// Middleware: Centralizado de Grupos y Permisos
// Synapse - Backend
// ============================================

const { getDb } = require('../config/firebase');

/**
 * Obtiene un grupo por su código alfanumérico o lanza error HTTP.
 *
 * @param {string} codigo - Código de grupo (ej: "DEMO12")
 * @returns {Promise<Object>} Datos del grupo
 */
async function obtenerGrupoSeguro(codigo) {
  if (!codigo) {
    throw Object.assign(new Error('Código de grupo requerido'), { status: 400 });
  }

  const { getDb } = require('../config/firebase');
  const db = getDb();

  if (!db) {
    if (codigo.toUpperCase().trim() === 'DEMO12') {
      return { id: 'DEMO12', nombre: 'Grupo Demo', profesorId: 'profesor-123', alumnos: ['alumno-456'] };
    }
    throw Object.assign(new Error('Base de datos no disponible'), { status: 503 });
  }

  const docRef = db.collection('grupos').doc(codigo.toUpperCase().trim());
  const snap = await docRef.get();

  if (!snap.exists) {
    throw Object.assign(new Error('Grupo no encontrado'), { status: 404 });
  }

  return { id: snap.id, ...snap.data() };
}

/**
 * Exige que el usuario autenticado (alumno, profesor o admin) pertenezca al grupo.
 *
 * @param {Object} req - Objeto de petición Express (con req.usuario)
 * @param {string} grupoId - Código del grupo
 * @returns {Promise<Object>} Datos del grupo
 */
async function exigirMiembroGrupo(req, grupoId) {
  const grupo = await obtenerGrupoSeguro(grupoId);
  const uid = req.usuario?.uid;
  const esAdmin = req.usuario?.rol === 'admin';
  const esProfesor = grupo.profesorId === uid;
  const esAlumno = Array.isArray(grupo.alumnos) && grupo.alumnos.includes(uid);

  if (!esAdmin && !esProfesor && !esAlumno) {
    throw Object.assign(new Error('No perteneces a este grupo'), { status: 403 });
  }
  return grupo;
}

/**
 * Exige que el usuario autenticado sea el profesor propietario del grupo (o admin).
 *
 * @param {Object} req - Objeto de petición Express (con req.usuario)
 * @param {string} grupoId - Código del grupo
 * @returns {Promise<Object>} Datos del grupo
 */
async function exigirProfesorPropietario(req, grupoId) {
  const grupo = await obtenerGrupoSeguro(grupoId);
  const uid = req.usuario?.uid;
  const esAdmin = req.usuario?.rol === 'admin';

  if (!esAdmin && grupo.profesorId !== uid) {
    throw Object.assign(new Error('No tienes permisos sobre este grupo'), { status: 403 });
  }
  return grupo;
}

module.exports = {
  obtenerGrupoSeguro,
  exigirMiembroGrupo,
  exigirProfesorPropietario
};
