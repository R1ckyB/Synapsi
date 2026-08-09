// ============================================
// Rutas API: Procesamiento de Audio / Notas de Voz
// Synapse - Backend
// ============================================

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { procesarAudioDuda } = require('../agents/audioProcessor');

// Almacenamiento en memoria con límite de 10MB y filtro de tipo MIME
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype && (file.mimetype.startsWith('audio/') || file.mimetype.includes('webm') || file.mimetype.includes('ogg') || file.mimetype.includes('mp4'))) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo se permiten archivos de audio.'), false);
    }
  }
});

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
      ...resultado,
      analisis: resultado,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error procesando audio:', error);
    res.status(500).json({ error: true, mensaje: error.message });
  }
});

module.exports = router;
