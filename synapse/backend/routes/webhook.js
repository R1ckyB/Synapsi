// ============================================
// Webhook de WhatsApp (Twilio / Meta API)
// EduMentor - Backend
// ============================================

const express = require('express');
const router = express.Router();
const { procesarMensajeTutor } = require('../agents/tutorSocratico');

/**
 * POST /api/webhook/whatsapp
 * Recibe los mensajes entrantes de WhatsApp desde Twilio/Meta API.
 */
router.post('/whatsapp', async (req, res) => {
  try {
    // Soporte para formato Twilio (req.body.Body, req.body.From)
    const mensajeTexto = req.body.Body || req.body.message || '';
    const remitente = req.body.From || 'Estudiante';

    console.log(`📱 WhatsApp recibido de [${remitente}]: "${mensajeTexto}"`);

    if (!mensajeTexto) {
      return res.status(200).send('<Response></Response>');
    }

    const resultado = await procesarMensajeTutor(
      mensajeTexto,
      { nombre: 'Estudiante', nivelEducativo: 'secundaria' },
      []
    );

    // Formato de respuesta de Twilio TwiML
    const twimlResponse = `
<Response>
  <Message>${resultado.respuesta}</Message>
</Response>
`.trim();

    res.set('Content-Type', 'text/xml');
    res.send(twimlResponse);
  } catch (error) {
    console.error('❌ Error en Webhook de WhatsApp:', error);
    res.status(500).send('<Response><Message>Ocurrió un error. Intenta de nuevo.</Message></Response>');
  }
});

module.exports = router;
