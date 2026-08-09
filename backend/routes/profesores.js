// ============================================
// Rutas API: Dashboard del Profesor / Vacíos de Conocimiento (v2.0)
// Synapse - Backend
// ============================================

const express = require('express');
const router = express.Router();
const { obtenerVaciosGrupo, obtenerVaciosEstudiante } = require('../agents/vaciosService');
const { getFirestore } = require('../config/firebase');

/** Genera un código de grupo único de 6 caracteres alfanuméricos */
function generarCodigo() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

/**
 * POST /api/profesores/grupos
 * El profesor crea un nuevo grupo y recibe un código de invitación.
 * Body: { nombreGrupo: string }
 */
router.post('/grupos', async (req, res) => {
  try {
    const db = getFirestore();
    const profesorId = req.usuario?.uid;
    const { nombreGrupo = 'Mi Grupo' } = req.body;

    // Generar código único
    let codigo;
    let intentos = 0;
    do {
      codigo = generarCodigo();
      const exists = await db.collection('grupos').doc(codigo).get();
      if (!exists.exists) break;
      intentos++;
    } while (intentos < 5);

    const grupoData = {
      codigo,
      nombre: nombreGrupo,
      profesorId,
      alumnos: [],
      creadoEn: new Date().toISOString()
    };

    await db.collection('grupos').doc(codigo).set(grupoData);

    // Asociar grupo al perfil del profesor
    await db.collection('usuarios').doc(profesorId).set(
      { grupos: require('firebase-admin').firestore.FieldValue.arrayUnion(codigo) },
      { merge: true }
    );

    res.json({ exito: true, codigo, nombre: nombreGrupo });
  } catch (error) {
    console.error('❌ Error creando grupo:', error);
    res.status(500).json({ error: true, mensaje: error.message });
  }
});

/**
 * POST /api/profesores/grupos/unirse
 * Un estudiante ingresa un código para unirse a un grupo.
 * Body: { codigo: string }
 */
router.post('/grupos/unirse', async (req, res) => {
  try {
    const db = getFirestore();
    const estudianteId = req.usuario?.uid;
    const { codigo } = req.body;

    if (!codigo) return res.status(400).json({ error: true, mensaje: 'Código requerido' });

    const grupoRef = db.collection('grupos').doc(codigo.toUpperCase().trim());
    const grupoSnap = await grupoRef.get();

    if (!grupoSnap.exists) {
      return res.status(404).json({ error: true, mensaje: 'Código de grupo no encontrado' });
    }

    const grupo = grupoSnap.data();

    // Agregar alumno al grupo (sin duplicados)
    await grupoRef.update({
      alumnos: require('firebase-admin').firestore.FieldValue.arrayUnion(estudianteId)
    });

    // Guardar grupoId en el perfil del estudiante
    await db.collection('usuarios').doc(estudianteId).set(
      { grupoId: codigo.toUpperCase().trim(), grupoNombre: grupo.nombre },
      { merge: true }
    );

    res.json({ exito: true, grupoNombre: grupo.nombre, grupoId: codigo.toUpperCase().trim() });
  } catch (error) {
    console.error('❌ Error al unirse al grupo:', error);
    res.status(500).json({ error: true, mensaje: error.message });
  }
});

/**
 * GET /api/profesores/grupos
 * Lista todos los grupos del profesor autenticado.
 */
router.get('/grupos', async (req, res) => {
  try {
    const db = getFirestore();
    const profesorId = req.usuario?.uid;

    const snap = await db.collection('grupos')
      .where('profesorId', '==', profesorId)
      .get();

    const grupos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ exito: true, grupos });
  } catch (error) {
    res.status(500).json({ error: true, mensaje: error.message });
  }
});

/**
 * GET /api/profesores/vacios
 * Retorna las métricas de vacíos de conocimiento para el dashboard del profesor.
 * Query params opcionales: grupoId, totalEstudiantes
 */
router.get('/vacios', async (req, res) => {
  try {
    const grupoId = req.query.grupoId || 'general';
    const totalEstudiantes = parseInt(req.query.totalEstudiantes) || 30;

    const vacios = await obtenerVaciosGrupo(grupoId, totalEstudiantes);

    res.json({
      exito: true,
      grupoId,
      totalEstudiantes,
      vaciosDetectados: vacios.length,
      vacios,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error obteniendo vacíos:', error);
    res.status(500).json({ error: true, mensaje: error.message });
  }
});

/**
 * GET /api/profesores/vacios/estudiante/:uid
 * Retorna los vacíos específicos de un estudiante individual.
 */
router.get('/vacios/estudiante/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const vacios = await obtenerVaciosEstudiante(uid);

    res.json({
      exito: true,
      estudianteId: uid,
      vaciosDetectados: vacios.length,
      vacios,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error obteniendo vacíos del estudiante:', error);
    res.status(500).json({ error: true, mensaje: error.message });
  }
});

module.exports = router;
