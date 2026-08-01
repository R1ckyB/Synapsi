// ============================================
// Rutas API: Dashboard del Profesor / Vacíos de Conocimiento (v2.0)
// Synapse - Backend
// ============================================

const express = require('express');
const router = express.Router();
const { obtenerVaciosGrupo, obtenerVaciosEstudiante } = require('../agents/vaciosService');

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
