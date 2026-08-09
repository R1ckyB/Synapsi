// ============================================
// Rutas API: Chat de Tutoría Socrática (v2.0)
// Synapse - Backend
// ============================================

const express = require('express');
const router = express.Router();
const { procesarMensajeTutor } = require('../agents/tutorSocratico');
const { generarQuizAdaptativo } = require('../agents/quizGenerator');
const { guardarSesionTutoria } = require('../agents/vaciosService');
const { validarMensajeTutoria } = require('../middleware/inputValidator');

/**
 * POST /api/tutoria/mensaje
 * Recibe la duda del estudiante y retorna la guía socrática de Synapse.
 * Persiste la interacción en Firestore y dispara quizzes automáticos cuando corresponde.
 */
router.post('/mensaje', validarMensajeTutoria, async (req, res) => {
  try {
    const { mensaje, estudiante, historial } = req.body;

    if (!mensaje) {
      return res.status(400).json({ error: true, mensaje: 'El mensaje no puede estar vacío.' });
    }

    const datosEstudiante = {
      uid: req.usuario?.uid || estudiante?.uid || 'anonimo',
      nombre: estudiante?.nombre || req.usuario?.nombre || 'Estudiante',
      nivelEducativo: estudiante?.nivelEducativo || 'secundaria',
      materiaActual: estudiante?.materiaActual || 'General',
      grupoId: estudiante?.grupoId || 'general'
    };

    const resultado = await procesarMensajeTutor(mensaje, datosEstudiante, historial || []);

    // Si el tutor detectó que el alumno domina el tema, generar quiz automáticamente
    let quizAutoGenerado = null;
    if (resultado.generarQuiz && resultado.temaQuiz) {
      try {
        quizAutoGenerado = await generarQuizAdaptativo(
          resultado.temaQuiz,
          datosEstudiante.nivelEducativo,
          3,
          'intermedio'
        );
      } catch (quizError) {
        console.error('⚠️ Error al generar quiz automático:', quizError.message);
      }
    }

    // Persistir la interacción en Firestore (async, no bloquea la respuesta)
    guardarSesionTutoria(
      datosEstudiante.uid,
      datosEstudiante.materiaActual,
      [
        ...(historial || []),
        { role: 'user', text: mensaje },
        { role: 'model', text: resultado.respuesta }
      ],
      {
        vaciosDetectados: resultado.vacioConcepto ? [resultado.vacioConcepto] : [],
        quizzesGenerados: quizAutoGenerado ? 1 : 0
      }
    ).catch(err => console.error('⚠️ Error guardando sesión:', err.message));

    res.json({
      exito: true,
      respuesta: resultado.respuesta,
      estadoEmocional: resultado.estadoEmocional,
      generarQuiz: resultado.generarQuiz,
      temaQuiz: resultado.temaQuiz,
      quizAutoGenerado,
      vacioConcepto: resultado.vacioConcepto,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error en Tutoría:', error);
    res.status(500).json({ error: true, mensaje: error.message });
  }
});

/**
 * POST /api/tutoria/feynman
 * Modo Profesor Invertido: El estudiante enseña un tema a la IA.
 * Body: { tema, explicacionUsuario, historial }
 */
router.post('/feynman', async (req, res) => {
  try {
    const { procesarExplicacionFeynman } = require('../agents/feynmanAgent');
    const { tema = 'General', explicacionUsuario, historial = [] } = req.body;

    if (!explicacionUsuario) {
      return res.status(400).json({ error: true, mensaje: 'Debes escribir tu explicación.' });
    }

    const resultado = await procesarExplicacionFeynman(tema, explicacionUsuario, historial);

    res.json({
      exito: true,
      respuesta: resultado.respuesta,
      scoreComprension: resultado.scoreComprension,
      feedbackPedagogico: resultado.feedbackPedagogico,
      completado: resultado.completado,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error en Modo Feynman:', error);
    res.status(500).json({ error: true, mensaje: error.message });
  }
});

/**
 * POST /api/tutoria/genio-tiempo
 * Genio del Tiempo / Simulador Multiverso "What If?" con Genios Históricos.
 * Body: { personajeId, mensaje, historial }
 */
router.post('/genio-tiempo', async (req, res) => {
  try {
    const { procesarGenioTiempo } = require('../agents/genioTiempoAgent');
    const { personajeId = 'einstein', mensaje, historial = [] } = req.body;

    if (!mensaje) {
      return res.status(400).json({ error: true, mensaje: 'El mensaje no puede estar vacío.' });
    }

    const resultado = await procesarGenioTiempo(personajeId, mensaje, historial);

    res.json({
      exito: true,
      respuesta: resultado.respuesta,
      personaje: resultado.personaje,
      icono: resultado.icono,
      epoca: resultado.epoca,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error en Genio del Tiempo:', error);
    res.status(500).json({ error: true, mensaje: error.message });
  }
});

module.exports = router;
