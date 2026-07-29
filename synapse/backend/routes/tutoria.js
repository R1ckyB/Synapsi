// ============================================
// Rutas API: Chat de Tutoría Socrática
// EduMentor - Backend
// ============================================

const express = require('express');
const router = express.Router();
const { procesarMensajeTutor } = require('../agents/tutorSocratico');

/**
 * POST /api/tutoria/mensaje
 * Recibe la duda del estudiante y retorna la guía socrática de EduMentor.
 */
router.post('/mensaje', async (req, res) => {
  try {
    const { mensaje, estudiante, historial } = req.body;

    if (!mensaje) {
      return res.status(400).json({ error: true, mensaje: 'El mensaje no puede estar vacío.' });
    }

    const resultado = await procesarMensajeTutor(mensaje, estudiante || {}, historial || []);

    res.json({
      exito: true,
      respuesta: resultado.respuesta,
      generarQuiz: resultado.generarQuiz,
      temaQuiz: resultado.temaQuiz,
      vacioConcepto: resultado.vacioConcepto,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error en Tutoría:', error);
    res.status(500).json({ error: true, mensaje: error.message });
  }
});

module.exports = router;
