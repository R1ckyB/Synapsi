// ============================================
// Rutas API: Procesamiento de Audio / Notas de Voz
// Synapse - Backend
// ============================================

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { procesarAudioDuda } = require('../agents/audioProcessor');

// Almacenamiento en memoria para procesamiento rápido sin disco
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /api/audio/procesar
 * Recibe un archivo de audio (form-data field 'audio') y retorna el análisis socrático.
 */
router.post('/procesar', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: true, mensaje: 'No se envió ningún archivo de audio.' });
    }

    const contextoTema = req.body.materia || 'General';
    const mimeType = req.file.mimetype || 'audio/mp3';
    const nivelEducativo = req.body.nivelEducativo || 'secundaria';

    const resultado = await procesarAudioDuda(req.file.buffer, mimeType, contextoTema, nivelEducativo);

    res.json({
      exito: true,
      analisis: resultado,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error procesando audio:', error);
    res.status(500).json({ error: true, mensaje: error.message });
  }
});

module.exports = router;
