// ============================================
// Webhook de WhatsApp (Twilio) — v2.0 Completo
// Synapse - Backend
// Soporta: Texto, Audio, Imágenes, Historial, Quiz
// ============================================

const express = require('express');
const router = express.Router();
const { procesarMensajeTutor } = require('../agents/tutorSocratico');
const { generarQuizAdaptativo } = require('../agents/quizGenerator');
const { procesarAudioDuda } = require('../agents/audioProcessor');
const { analizarFotoCuaderno } = require('../agents/imageAnalyzer');

// ─────────────────────────────────────────────
// Almacenamiento en memoria del historial por usuario
// En producción esto se conectaría a Firestore
// ─────────────────────────────────────────────
const historialesPorUsuario = new Map();
const MAX_HISTORIAL = 20; // Máximo de mensajes en memoria por usuario

/**
 * Obtiene o crea el historial de un usuario de WhatsApp.
 */
function obtenerHistorial(remitente) {
  if (!historialesPorUsuario.has(remitente)) {
    historialesPorUsuario.set(remitente, []);
  }
  return historialesPorUsuario.get(remitente);
}

/**
 * Agrega un mensaje al historial del usuario y limita el tamaño.
 */
function agregarAlHistorial(remitente, role, text) {
  const historial = obtenerHistorial(remitente);
  historial.push({ role, text });

  // Mantener solo los últimos MAX_HISTORIAL mensajes
  if (historial.length > MAX_HISTORIAL) {
    historial.splice(0, historial.length - MAX_HISTORIAL);
  }
}

/**
 * Escapa caracteres XML/HTML para TwiML.
 */
function escaparXML(texto) {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Construye la respuesta TwiML para Twilio.
 */
function respuestaTwiML(mensaje) {
  // Truncar si excede el límite de WhatsApp (1600 chars)
  const mensajeLimitado = mensaje.length > 1500
    ? mensaje.substring(0, 1500) + '\n\n_...continúa preguntando para más detalles._'
    : mensaje;

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escaparXML(mensajeLimitado)}</Message>
</Response>`;
}

// ─────────────────────────────────────────────
// WEBHOOK PRINCIPAL: Recibe mensajes de WhatsApp
// ─────────────────────────────────────────────

/**
 * POST /api/webhook/whatsapp
 * Recibe mensajes entrantes de WhatsApp vía Twilio.
 * Soporta: texto, audio (notas de voz) e imágenes (fotos de cuaderno).
 */
router.post('/whatsapp', async (req, res) => {
  try {
    // ── Extraer datos del mensaje de Twilio ──
    const mensajeTexto = req.body.Body || '';
    const remitente = req.body.From || 'whatsapp:+0000000000';
    const numMedia = parseInt(req.body.NumMedia) || 0;
    const mediaType = req.body.MediaContentType0 || '';
    const mediaUrl = req.body.MediaUrl0 || '';
    const nombrePerfil = req.body.ProfileName || 'Estudiante';

    console.log(`📱 WhatsApp de [${nombrePerfil}] (${remitente}): "${mensajeTexto}" | Media: ${numMedia}`);

    // ── Datos del estudiante por WhatsApp ──
    const estudiante = {
      uid: remitente.replace('whatsapp:', ''),
      nombre: nombrePerfil,
      nivelEducativo: 'secundaria',
      materiaActual: 'General',
      grupoId: 'whatsapp'
    };

    let respuestaFinal = '';

    // ── CASO 1: Mensaje con IMAGEN adjunta ──
    if (numMedia > 0 && mediaType.startsWith('image/')) {
      console.log(`🖼️ Imagen recibida: ${mediaType} | URL: ${mediaUrl}`);

      try {
        // Descargar la imagen desde Twilio (requiere autenticación)
        const imagenBuffer = await descargarMediaTwilio(mediaUrl);

        if (imagenBuffer) {
          const analisis = await analizarFotoCuaderno(imagenBuffer, mediaType, 'General', 'secundaria');

          if (analisis.errorDetectado) {
            respuestaFinal = `📸 *Analicé tu ejercicio*\n\n📝 Ejercicio: ${analisis.ejercicioIdentificado || 'Detectado'}\n\n⚠️ ${analisis.descripcionError}\n\n❓ ${analisis.preguntaSocratica}\n\n💡 _Pista: ${analisis.pistaAdicional || 'Revisa paso a paso'}_\n\n${analisis.mensajeMotivador || ''}`;
          } else if (analisis.errorDetectado === false) {
            respuestaFinal = `📸 ✅ *¡Tu ejercicio está correcto!*\n\n${analisis.mensajeMotivador || '¡Excelente trabajo! 🏆'}`;
          } else {
            respuestaFinal = analisis.mensajeMotivador || '📸 No alcancé a leer bien tu ejercicio. ¿Podrías tomarle una foto con mejor iluminación? 📸';
          }
        } else {
          respuestaFinal = '📸 No pude descargar la imagen. ¿Podrías enviarla de nuevo?';
        }
      } catch (imgError) {
        console.error('❌ Error procesando imagen:', imgError.message);
        respuestaFinal = '📸 Tuve un problema analizando tu foto. Intenta enviarla de nuevo con buena iluminación.';
      }

    // ── CASO 2: Mensaje con AUDIO (nota de voz) ──
    } else if (numMedia > 0 && mediaType.startsWith('audio/')) {
      console.log(`🎙️ Audio recibido: ${mediaType} | URL: ${mediaUrl}`);

      try {
        const audioBuffer = await descargarMediaTwilio(mediaUrl);

        if (audioBuffer) {
          const analisis = await procesarAudioDuda(audioBuffer, mediaType, 'General', 'secundaria');

          respuestaFinal = `🎙️ *Escuché tu nota de voz*\n\n📝 Lo que entendí: _"${analisis.transcripcion?.substring(0, 200) || 'Procesado'}..."_\n\n📌 *Puntos clave:*\n${(analisis.resumen || []).map(p => `• ${p}`).join('\n')}\n\n🧠 ${analisis.respuestaSocratica || ''}\n\n❓ *Preguntas para reflexionar:*\n${(analisis.preguntasRepaso || []).map(p => `• ${p}`).join('\n')}`;
        } else {
          respuestaFinal = '🎙️ No pude procesar tu nota de voz. ¿Puedes enviarla de nuevo?';
        }
      } catch (audioError) {
        console.error('❌ Error procesando audio:', audioError.message);
        respuestaFinal = '🎙️ Tuve un problema con tu audio. Intenta grabarlo de nuevo.';
      }

    // ── CASO 3: Mensaje de TEXTO ──
    } else if (mensajeTexto) {

      // Comandos especiales
      const textoLower = mensajeTexto.toLowerCase().trim();

      if (textoLower === 'quiz' || textoLower === 'examen' || textoLower === 'evaluame') {
        // Generar un quiz rápido
        try {
          const quiz = await generarQuizAdaptativo('Repaso General', 'secundaria', 3, 'intermedio');
          const preguntas = quiz.preguntas || [];

          respuestaFinal = `📝 *Quiz Rápido — ${quiz.tema || 'Repaso'}*\n\n`;
          preguntas.forEach((p, i) => {
            respuestaFinal += `*${i + 1}. ${p.pregunta}*\n`;
            (p.opciones || []).forEach((op, j) => {
              const letras = ['A', 'B', 'C', 'D'];
              respuestaFinal += `   ${letras[j]}) ${op}\n`;
            });
            respuestaFinal += '\n';
          });
          respuestaFinal += `\n💬 _Responde con las letras de tus respuestas (ej: "A, C, B") y te digo cómo te fue._`;
        } catch (quizError) {
          respuestaFinal = '📝 No pude generar el quiz en este momento. Intenta de nuevo en unos segundos.';
        }

      } else if (textoLower === 'reiniciar' || textoLower === 'reset' || textoLower === 'nuevo tema') {
        // Limpiar historial
        historialesPorUsuario.delete(remitente);
        respuestaFinal = '🔄 ¡Listo! Historial limpiado. ¿Sobre qué tema quieres estudiar ahora?';

      } else if (textoLower === 'ayuda' || textoLower === 'help' || textoLower === 'menu') {
        respuestaFinal = `🧠 *Synapse — Tu Tutor IA*\n\n¿Qué puedo hacer por ti?\n\n📝 *Envíame tu duda* → Te guío paso a paso\n📸 *Envía foto de tu cuaderno* → Reviso tu ejercicio\n🎙️ *Envía nota de voz* → Escucho y te ayudo\n📋 Escribe *"quiz"* → Te hago un examen rápido\n🔄 Escribe *"reiniciar"* → Empezar tema nuevo\n\n💡 _Recuerda: no te doy la respuesta directa, ¡te ayudo a que TÚ la descubras!_`;

      } else {
        // Chat normal con el tutor socrático
        const historial = obtenerHistorial(remitente);
        const resultado = await procesarMensajeTutor(mensajeTexto, estudiante, historial);

        // Guardar en historial local
        agregarAlHistorial(remitente, 'user', mensajeTexto);
        agregarAlHistorial(remitente, 'model', resultado.respuesta);

        respuestaFinal = resultado.respuesta;

        // Si se generó un quiz automático, notificar
        if (resultado.generarQuiz) {
          respuestaFinal += '\n\n📝 _Parece que ya dominas este tema. Escribe "quiz" para evaluarte._';
        }
      }

    } else {
      // Mensaje vacío
      respuestaFinal = '🧠 ¡Hola! Soy Synapse, tu tutor IA. Envíame tu duda, una foto de tu cuaderno o una nota de voz y te ayudo. Escribe *"ayuda"* para ver todas las opciones.';
    }

    // ── Enviar respuesta TwiML ──
    res.set('Content-Type', 'text/xml');
    res.send(respuestaTwiML(respuestaFinal));

  } catch (error) {
    console.error('❌ Error en Webhook de WhatsApp:', error);
    res.set('Content-Type', 'text/xml');
    res.status(200).send(respuestaTwiML('⚠️ Ocurrió un error. Intenta de nuevo en unos segundos.'));
  }
});

// ─────────────────────────────────────────────
// VERIFICACIÓN GET (requerido por Twilio/Meta para verificar el webhook)
// ─────────────────────────────────────────────

/**
 * GET /api/webhook/whatsapp
 * Twilio y Meta envían un GET de verificación al configurar el webhook.
 */
router.get('/whatsapp', (req, res) => {
  // Meta API verification
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log('✅ Webhook verificado por Meta API');
    return res.status(200).send(challenge);
  }

  // Verificación genérica
  res.status(200).json({
    status: 'ok',
    servicio: 'Synapse WhatsApp Webhook',
    mensaje: 'Webhook activo y escuchando mensajes.'
  });
});

// ─────────────────────────────────────────────
// UTILIDAD: Descargar media de Twilio
// ─────────────────────────────────────────────

/**
 * Descarga un archivo multimedia (imagen/audio) desde los servidores de Twilio.
 * Requiere credenciales de autenticación.
 *
 * @param {string} mediaUrl - URL del media proporcionada por Twilio
 * @returns {Buffer|null} Buffer del archivo o null si falla
 */
async function descargarMediaTwilio(mediaUrl) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken || !mediaUrl) {
    console.warn('⚠️ No se puede descargar media: credenciales de Twilio faltantes.');
    return null;
  }

  try {
    const credenciales = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const response = await fetch(mediaUrl, {
      headers: {
        'Authorization': `Basic ${credenciales}`
      }
    });

    if (!response.ok) {
      console.error(`❌ Error descargando media: HTTP ${response.status}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('❌ Error de red al descargar media:', error.message);
    return null;
  }
}

module.exports = router;
