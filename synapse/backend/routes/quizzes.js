// ============================================
// Rutas API: Quizzes Adaptativos
// EduMentor - Backend
// ============================================

const express = require('express');
const router = express.Router();
const { generarQuizAdaptativo } = require('../agents/quizGenerator');

/**
 * POST /api/quizzes/generar
 * Genera un quiz adaptativo en formato JSON.
 */
router.post('/generar', async (req, res) => {
  try {
    const { tema, nivelEducativo, numPreguntas } = req.body;

    if (!tema) {
      return res.status(400).json({ error: true, mensaje: 'Debes proporcionar un tema para el quiz.' });
    }

    const quiz = await generarQuizAdaptativo(
      tema,
      nivelEducativo || 'secundaria',
      numPreguntas || 3
    );

    res.json({
      exito: true,
      quiz
    });
  } catch (error) {
    console.error('❌ Error generando quiz:', error);
    res.status(500).json({ error: true, mensaje: error.message });
  }
});

module.exports = router;
