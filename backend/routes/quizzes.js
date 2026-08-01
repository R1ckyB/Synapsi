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

    if (!tema) {
      return res.status(400).json({ error: true, mensaje: 'Debes proporcionar un tema para el quiz.' });
    }

    const quiz = await generarQuizAdaptativo(
      tema,
      nivelEducativo || 'secundaria',
      numPreguntas || 3,
      dificultad || 'intermedio',
      vaciosDetectados || []
    );

    res.json({
      exito: true,
      quiz,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error generando quiz:', error);
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

    if (!estudianteId) {
      return res.status(400).json({ error: true, mensaje: 'Debes proporcionar el ID del estudiante.' });
    }

    const quiz = await generarQuizPorVacios(
      estudianteId,
      nivelEducativo || 'secundaria',
      numPreguntas || 5
    );

    res.json({
      exito: true,
      quiz,
      personalizado: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error generando quiz personalizado:', error);
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

    if (!quiz || !respuestas) {
      return res.status(400).json({ error: true, mensaje: 'Debes enviar el quiz original y las respuestas.' });
    }

    const resultado = evaluarQuiz(quiz, respuestas);

    res.json({
      exito: true,
      resultado,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error evaluando quiz:', error);
    res.status(500).json({ error: true, mensaje: error.message });
  }
});

module.exports = router;
