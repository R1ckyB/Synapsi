// ============================================
// Rutas API: Dashboard del Profesor / Vacíos de Conocimiento
// EduMentor - Backend
// ============================================

const express = require('express');
const router = express.Router();
const { getDb } = require('../config/firebase');

/**
 * GET /api/profesores/vacios
 * Retorna las métricas de vacíos de conocimiento identificados por Gemini para un grupo/profesor.
 */
router.get('/vacios', async (req, res) => {
  try {
    const db = getDb();

    if (!db) {
      // Mock data realista para desarrollo y pruebas del dashboard
      return res.json({
        exito: true,
        vacios: [
          { tema: 'Leyes de Newton', porcentajeDificultad: 68, consultasSemana: 24, conceptoCritico: 'Tercera Ley (Acción y Reacción)' },
          { tema: 'Factorización de Polinomios', porcentajeDificultad: 54, consultasSemana: 18, conceptoCritico: 'Trinomio Cuadrado Perfecto' },
          { tema: 'Fotosíntesis y Respiración Celular', porcentajeDificultad: 42, consultasSemana: 12, conceptoCritico: 'Ciclo de Krebs' }
        ]
      });
    }

    const snapshot = await db.collection('vacios_conocimiento').get();
    const vacios = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.json({ exito: true, vacios });
  } catch (error) {
    res.status(500).json({ error: true, mensaje: error.message });
  }
});

module.exports = router;
