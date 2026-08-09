// ============================================
// Rutas API: Quizzes Adaptativos (v2.0)
// Synapse - Backend
// ============================================

const express = require('express');
const router = express.Router();
const { generarQuizAdaptativo, generarQuizPorVacios, evaluarQuiz } = require('../agents/quizGenerator');

/**
 * POST /api/quizzes/generar
 * Genera un quiz adaptativo en formato JSON.
 */
router.post('/generar', async (req, res) => {
  try {
    const { tema, nivelEducativo, numPreguntas, dificultad, vaciosDetectados } = req.body;
    if (!tema) return res.status(400).json({ error: true, mensaje: 'Debes proporcionar un tema para el quiz.' });
    const quiz = await generarQuizAdaptativo(tema, nivelEducativo || 'secundaria', numPreguntas || 3, dificultad || 'intermedio', vaciosDetectados || []);
    res.json({ exito: true, quiz, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('❌ Error generando quiz:', error);
    res.status(500).json({ error: true, mensaje: error.message });
  }
});

/**
 * POST /api/quizzes/diagnostico
 * Genera un quiz diagnóstico de 5 preguntas de dificultad mixta para determinar
 * el nivel real del estudiante en una materia.
 * Body: { materia, nivelEducativo }
 */
router.post('/diagnostico', async (req, res) => {
  try {
    const { materia = 'General', nivelEducativo = 'secundaria' } = req.body;
    const quiz = await generarQuizAdaptativo(
      `Diagnóstico de ${materia}`,
      nivelEducativo,
      5,        // Siempre 5 preguntas para el diagnóstico
      'basico', // Empieza fácil, progresión natural hacia avanzado
      []
    );
    quiz.esDiagnostico = true;
    quiz.materia = materia;
    res.json({ exito: true, quiz, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('❌ Error generando diagnóstico:', error);
    res.status(500).json({ error: true, mensaje: error.message });
  }
});

/**
 * POST /api/quizzes/personalizado
 * Genera un quiz personalizado basado en los vacíos de conocimiento del estudiante.
 */
router.post('/personalizado', async (req, res) => {
  try {
    const { estudianteId, nivelEducativo, numPreguntas } = req.body;
    if (!estudianteId) return res.status(400).json({ error: true, mensaje: 'Debes proporcionar el ID del estudiante.' });
    const quiz = await generarQuizPorVacios(estudianteId, nivelEducativo || 'secundaria', numPreguntas || 5);
    res.json({ exito: true, quiz, personalizado: true, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('❌ Error generando quiz personalizado:', error);
    res.status(500).json({ error: true, mensaje: error.message });
  }
});

/**
 * POST /api/quizzes/asignar-grupo
 * El profesor asigna un quiz a todos los alumnos de un grupo.
 * Body: { grupoId, materia, nivelEducativo, numPreguntas }
 */
router.post('/asignar-grupo', async (req, res) => {
  try {
    const { getDb } = require('../config/firebase');
    const db = getDb();
    const profesorId = req.usuario?.uid;
    const { grupoId, materia = 'General', nivelEducativo = 'secundaria', numPreguntas = 5 } = req.body;
    if (!grupoId) return res.status(400).json({ error: true, mensaje: 'Debes proporcionar el grupoId.' });

    const quiz = await generarQuizAdaptativo(`${materia} — Tarea del Profesor`, nivelEducativo, numPreguntas, 'intermedio');

    if (db) {
      await db.collection('quizzesAsignados').add({
        grupoId, profesorId, quiz, materia,
        asignadoEn: new Date().toISOString(),
        activo: true
      });
    }
    res.json({ exito: true, quiz, grupoId, materia, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('❌ Error asignando quiz al grupo:', error);
    res.status(500).json({ error: true, mensaje: error.message });
  }
});

/**
 * GET /api/quizzes/asignados
 * El estudiante obtiene los quizzes asignados por su profesor.
 * Query: grupoId
 */
router.get('/asignados', async (req, res) => {
  try {
    const { getDb } = require('../config/firebase');
    const db = getDb();
    const { grupoId } = req.query;
    if (!grupoId || !db) return res.json({ exito: true, quizzes: [] });

    const snap = await db.collection('quizzesAsignados')
      .where('grupoId', '==', grupoId)
      .where('activo', '==', true)
      .orderBy('asignadoEn', 'desc')
      .limit(5)
      .get();

    const quizzes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ exito: true, quizzes });
  } catch (error) {
    res.status(500).json({ error: true, mensaje: error.message });
  }
});

/**
 * POST /api/quizzes/evaluar
 * Evalúa las respuestas de un quiz completado.
 */
router.post('/evaluar', (req, res) => {
  try {
    const { quiz, respuestas } = req.body;
    if (!quiz || !respuestas) return res.status(400).json({ error: true, mensaje: 'Debes enviar el quiz original y las respuestas.' });
    const resultado = evaluarQuiz(quiz, respuestas);
    res.json({ exito: true, resultado, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('❌ Error evaluando quiz:', error);
    res.status(500).json({ error: true, mensaje: error.message });
  }
});

module.exports = router;
