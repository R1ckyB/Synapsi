// ============================================
// Rutas API: Análisis de Imágenes de Cuaderno
// Synapse - Backend
// ============================================

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { procesarImagenCuaderno } = require('../agents/tutorSocratico');
const { explicarImagenEducativa } = require('../agents/imageAnalyzer');

// Almacenamiento en memoria con límite de 10MB y validación de tipo MIME
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // Límite 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo se permiten imágenes (JPEG, PNG, WEBP).'), false);
    }
  }
});

/**
 * POST /api/imagen/analizar
 * Recibe una foto de cuaderno/ejercicio y retorna el análisis socrático de errores.
 */
router.post('/analizar', upload.single('imagen'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: true,
        mensaje: 'No se envió ninguna imagen. Envía una foto de tu cuaderno con el campo "imagen".'
      });
    }

    const estudiante = {
      uid: req.body.uid || 'anonimo',
      nombre: req.body.nombre || 'Estudiante',
      nivelEducativo: req.body.nivelEducativo || 'secundaria',
      materiaActual: req.body.materia || 'Matemáticas',
      grupoId: req.body.grupoId || 'general'
    };

    const mimeType = req.file.mimetype || 'image/jpeg';

    const analisis = await procesarImagenCuaderno(req.file.buffer, mimeType, estudiante);

    res.json({
      exito: true,
      ...analisis,
      observacion: analisis.descripcionError || analisis.ejercicioIdentificado || 'Análisis de libreta completado',
      guia_socratica: analisis.preguntaSocratica || analisis.mensajeMotivador || 'Revisa tu procedimiento',
      pistas: analisis.pistaAdicional ? [analisis.pistaAdicional] : [],
      analisis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error analizando imagen:', error);
    res.status(500).json({ error: true, mensaje: error.message });
  }
});

/**
 * POST /api/imagen/explicar
 * Recibe una imagen educativa (diagrama, gráfica, etc.) con una pregunta y retorna explicación socrática.
 */
router.post('/explicar', upload.single('imagen'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: true,
        mensaje: 'No se envió ninguna imagen.'
      });
    }

    const pregunta = req.body.pregunta || '¿Me puedes explicar esto?';
    const materia = req.body.materia || 'General';
    const mimeType = req.file.mimetype || 'image/jpeg';

    const explicacion = await explicarImagenEducativa(req.file.buffer, mimeType, pregunta, materia);

    res.json({
      exito: true,
      explicacion,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error explicando imagen:', error);
    res.status(500).json({ error: true, mensaje: error.message });
  }
});

module.exports = router;
