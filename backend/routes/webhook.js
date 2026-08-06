// ============================================
// Webhook de WhatsApp (Twilio) — v2.1 Completo
// Synapse - Backend
// Soporta: Texto, Audio, Imágenes, Historial Firestore, Perfil Estudiante
// ============================================

const express = require('express');
const router = express.Router();
let twilio = null;
try {
  twilio = require('twilio');
} catch (e) {
  console.warn('⚠️ twilio package no disponible');
}
const { procesarMensajeTutor } = require('../agents/tutorSocratico');
const { generarQuizAdaptativo } = require('../agents/quizGenerator');
const { procesarAudioDuda } = require('../agents/audioProcessor');
const { analizarFotoCuaderno } = require('../agents/imageAnalyzer');
const { getDb } = require('../config/firebase');
const { obtenerPerfil, procesarComandoPerfil, mensajeBienvenida, actualizarPerfil } = require('../services/perfilWhatsappService');

// ─────────────────────────────────────────────
// Historial persistente en Firestore + caché local en memoria
// El caché acelera las lecturas; Firestore garantiza persistencia
// entre reinicios y en entornos multi-instancia.
// ─────────────────────────────────────────────
const COLLECTION_HISTORIAL_WA = 'historial_whatsapp';
const MAX_HISTORIAL = 20;
// FIX #7 — Caché con TTL para evitar fuga de memoria (OOM en producción)
const cachHistorial = new Map();

/**
 * Guarda en caché asociando una fecha de expiración (1 hora de inactividad).
 */
function guardarEnCache(remitente, mensajes) {
  cachHistorial.set(remitente, {
    mensajes,
    expira: Date.now() + 60 * 60 * 1000 // 1 hora
  });
}

/**
 * Limpieza automática de caché cada 15 minutos.
 * Elimina entradas de usuarios inactivos para liberar memoria Heap.
 */
setInterval(() => {
  const ahora = Date.now();
  for (const [remitente, data] of cachHistorial.entries()) {
    if (ahora > data.expira) {
      cachHistorial.delete(remitente);
    }
  }
}, 15 * 60 * 1000);

/**
 * FIX #2 — Valida que el request viene realmente de Twilio usando firma HMAC.
 * Documentación: https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */
function validarFirmaTwilio(req) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  // En desarrollo (o si twilio/authToken no están configurados) se omite la validación
  if (!twilio || !authToken || process.env.NODE_ENV !== 'production') return true;

  const signature = req.headers['x-twilio-signature'] || '';
  // La URL debe ser la URL pública completa del webhook
  const url = `${process.env.BASE_URL || 'https://synapse-backend-316597665743.us-central1.run.app'}/api/webhook/whatsapp`;
  return twilio.validateRequest(authToken, signature, url, req.body);
}

/**
 * Obtiene el historial de conversación de un usuario.
 * Primero consulta el caché local; si no existe, lo carga desde Firestore.
 */
async function obtenerHistorial(remitente) {
  // FIX #7 — Usar el objeto con TTL en lugar del array directo
  const entrada = cachHistorial.get(remitente);
  if (entrada && Date.now() < entrada.expira) {
    return entrada.mensajes;
  }

  const db = getDb();
  if (db) {
    try {
      const docId = remitente.replace(/[^a-zA-Z0-9]/g, '_');
      const doc = await db.collection(COLLECTION_HISTORIAL_WA).doc(docId).get();
      if (doc.exists) {
        const historial = doc.data().mensajes || [];
        guardarEnCache(remitente, historial); // FIX #7 — Usar helper con TTL
        return historial;
      }
    } catch (err) {
      console.warn('⚠️ No se pudo cargar historial de Firestore:', err.message);
    }
  }

  guardarEnCache(remitente, []); // FIX #7 — Usar helper con TTL
  return cachHistorial.get(remitente).mensajes;
}

/**
 * Agrega un mensaje al historial y lo persiste en Firestore de forma asíncrona.
 */
async function agregarAlHistorial(remitente, role, text) {
  const historial = await obtenerHistorial(remitente);
  historial.push({ role, text, timestamp: new Date().toISOString() });

  if (historial.length > MAX_HISTORIAL) {
    historial.splice(0, historial.length - MAX_HISTORIAL);
  }

  // FIX #7 — Actualizar TTL al guardar nuevo mensaje
  guardarEnCache(remitente, historial);

  const db = getDb();
  if (db) {
    const docId = remitente.replace(/[^a-zA-Z0-9]/g, '_');
    db.collection(COLLECTION_HISTORIAL_WA).doc(docId).set({
      remitente,
      mensajes: historial,
      ultimaActividad: new Date().toISOString()
    }, { merge: true }).catch(err => {
      console.warn('⚠️ No se pudo guardar historial en Firestore:', err.message);
    });
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
 * Construye la respuesta TwiML para Twilio (limita a 1500 chars).
 */
function respuestaTwiML(mensaje) {
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
    // FIX #2 — Verificar que el mensaje viene de Twilio
    if (!validarFirmaTwilio(req)) {
      console.warn('⛔ Webhook rechazado: firma Twilio inválida');
      return res.status(403).send('Forbidden');
    }

    // ── Extraer datos del mensaje de Twilio ──
    const mensajeTexto = req.body.Body || '';
    const remitente = req.body.From || 'whatsapp:+0000000000';
    const numMedia = parseInt(req.body.NumMedia) || 0;
    const mediaType = req.body.MediaContentType0 || '';
    const mediaUrl = req.body.MediaUrl0 || '';
    const nombrePerfil = req.body.ProfileName || 'Estudiante';

    // FIX #3 — Enmascarar número de teléfono por privacidad (GDPR/LGPD)
    const numeroMascarado = remitente.replace(/(\+?\d+)(\d{4})/, (_, inicio, fin) =>
      '*'.repeat(inicio.length) + fin
    );
    // NO loggear el contenido del mensaje (privacidad del usuario)
    console.log(`📱 WhatsApp de [${nombrePerfil}] (${numeroMascarado}) | Media: ${numMedia}`);

    // ── Cargar perfil persistente del estudiante desde Firestore ──
    const perfil = await obtenerPerfil(remitente, nombrePerfil);

    const estudiante = {
      uid: remitente.replace('whatsapp:', ''),
      nombre: perfil.nombre || nombrePerfil,
      nivelEducativo: perfil.nivelEducativo || 'secundaria',
      materiaActual: perfil.materiaActual || 'General',
      grupoId: 'whatsapp'
    };

    let respuestaFinal = '';

    // ── Onboarding: mostrar bienvenida al primer mensaje si sin configurar ──
    if (!perfil.bienvenidaEnviada && mensajeTexto && !mensajeTexto.toLowerCase().startsWith('nivel')) {
      actualizarPerfil(remitente, { bienvenidaEnviada: true }).catch(() => {});
      respuestaFinal = mensajeBienvenida(nombrePerfil) + '\n\n---\n\n';
    }

    // ── CASO 1: Mensaje con IMAGEN adjunta ──
    if (numMedia > 0 && mediaType.startsWith('image/')) {
      console.log(`🖼️ Imagen recibida: ${mediaType} | URL: ${mediaUrl}`);

      try {
        const imagenBuffer = await descargarMediaTwilio(mediaUrl);

        if (imagenBuffer) {
          const analisis = await analizarFotoCuaderno(
            imagenBuffer, mediaType,
            estudiante.materiaActual, estudiante.nivelEducativo
          );

          if (analisis.errorDetectado) {
            respuestaFinal += `📸 *Analicé tu ejercicio*\n\n📝 Ejercicio: ${analisis.ejercicioIdentificado || 'Detectado'}\n\n⚠️ ${analisis.descripcionError}\n\n❓ ${analisis.preguntaSocratica}\n\n💡 _Pista: ${analisis.pistaAdicional || 'Revisa paso a paso'}_\n\n${analisis.mensajeMotivador || ''}`;
          } else if (analisis.errorDetectado === false) {
            respuestaFinal += `📸 ✅ *¡Tu ejercicio está correcto!*\n\n${analisis.mensajeMotivador || '¡Excelente trabajo! 🏆'}`;
          } else {
            respuestaFinal += analisis.mensajeMotivador || '📸 No alcancé a leer bien tu ejercicio. ¿Podrías tomarle una foto con mejor iluminación? 📸';
          }
        } else {
          respuestaFinal += '📸 No pude descargar la imagen. ¿Podrías enviarla de nuevo?';
        }
      } catch (imgError) {
        console.error('❌ Error procesando imagen:', imgError.message);
        respuestaFinal += '📸 Tuve un problema analizando tu foto. Intenta enviarla de nuevo con buena iluminación.';
      }

    // ── CASO 2: Mensaje con AUDIO (nota de voz) ──
    } else if (numMedia > 0 && mediaType.startsWith('audio/')) {
      console.log(`🎙️ Audio recibido: ${mediaType} | URL: ${mediaUrl}`);

      try {
        const audioBuffer = await descargarMediaTwilio(mediaUrl);

        if (audioBuffer) {
          const analisis = await procesarAudioDuda(
            audioBuffer, mediaType,
            estudiante.materiaActual, estudiante.nivelEducativo
          );

          respuestaFinal += `🎙️ *Escuché tu nota de voz*\n\n📝 Lo que entendí: _"${analisis.transcripcion?.substring(0, 200) || 'Procesado'}..."_\n\n📌 *Puntos clave:*\n${(analisis.resumen || []).map(p => `• ${p}`).join('\n')}\n\n🧠 ${analisis.respuestaSocratica || ''}\n\n❓ *Preguntas para reflexionar:*\n${(analisis.preguntasRepaso || []).map(p => `• ${p}`).join('\n')}`;
        } else {
          respuestaFinal += '🎙️ No pude procesar tu nota de voz. ¿Puedes enviarla de nuevo?';
        }
      } catch (audioError) {
        console.error('❌ Error procesando audio:', audioError.message);
        respuestaFinal += '🎙️ Tuve un problema con tu audio. Intenta grabarlo de nuevo.';
      }

    // ── CASO 3: Mensaje de TEXTO ──
    } else if (mensajeTexto) {
      const textoLower = mensajeTexto.toLowerCase().trim();

      // ── Comandos de perfil: "nivel X" o "materia X" ──
      const resultadoPerfil = await procesarComandoPerfil(textoLower, remitente);

      if (resultadoPerfil.esComando) {
        respuestaFinal += resultadoPerfil.respuesta;

      } else if (textoLower === 'quiz' || textoLower === 'examen' || textoLower === 'evaluame') {
        // Generar quiz personalizado con el nivel y materia real del estudiante
        try {
          const quiz = await generarQuizAdaptativo(
            estudiante.materiaActual,
            estudiante.nivelEducativo,
            3,
            'intermedio'
          );
          const preguntas = quiz.preguntas || [];

          respuestaFinal += `📝 *Quiz — ${quiz.tema || estudiante.materiaActual}* (${estudiante.nivelEducativo})\n\n`;
          preguntas.forEach((p, i) => {
            respuestaFinal += `*${i + 1}. ${p.pregunta}*\n`;
            (p.opciones || []).forEach((op, j) => {
              const letras = ['A', 'B', 'C', 'D'];
              respuestaFinal += `   ${letras[j]}) ${op}\n`;
            });
            respuestaFinal += '\n';
          });
          respuestaFinal += `\n💬 _Responde con las letras (ej: "A, C, B") y te digo cómo te fue._`;
        } catch (quizError) {
          respuestaFinal += '📝 No pude generar el quiz. Intenta de nuevo en unos segundos.';
        }

      } else if (textoLower === 'reiniciar' || textoLower === 'reset' || textoLower === 'nuevo tema') {
        // Limpiar historial en caché y en Firestore
        cachHistorial.delete(remitente); // FIX #7 — eliminar entrada con TTL
        const db = getDb();
        if (db) {
          const docId = remitente.replace(/[^a-zA-Z0-9]/g, '_');
          db.collection(COLLECTION_HISTORIAL_WA).doc(docId).delete().catch(() => {});
        }
        respuestaFinal += '🔄 ¡Listo! Historial limpiado. ¿Sobre qué tema quieres estudiar ahora?';

      } else if (textoLower === 'perfil' || textoLower === 'mi perfil') {
        // Mostrar perfil actual del estudiante
        respuestaFinal += `👤 *Tu perfil de aprendizaje:*\n\n📚 Nivel: *${estudiante.nivelEducativo}*\n🔬 Materia: *${estudiante.materiaActual}*\n\nPara cambiar: escribe *"nivel preparatoria"* o *"materia Física"*`;

      } else if (textoLower === 'ayuda' || textoLower === 'help' || textoLower === 'menu') {
        respuestaFinal += `🧠 *Synapse — Tu Tutor IA*\n\n¿Qué puedo hacer por ti?\n\n📝 *Envíame tu duda* → Te guío paso a paso\n📸 *Envía foto de tu cuaderno* → Reviso tu ejercicio\n🎙️ *Envía nota de voz* → Escucho y te ayudo\n📋 Escribe *"quiz"* → Examen personalizado\n🔄 Escribe *"reiniciar"* → Empezar tema nuevo\n🎯 Escribe *"nivel [primaria/secundaria/prepa/uni]"* → Ajusta tu nivel\n📚 Escribe *"materia [nombre]"* → Cambia tu materia\n👤 Escribe *"perfil"* → Ver tu configuración\n\n💡 _No te doy respuestas directas, ¡te ayudo a descubrirlas!_\n\n📅 *Tu perfil:* Nivel: ${estudiante.nivelEducativo} | Materia: ${estudiante.materiaActual}`;

      } else {
        // Chat normal con el tutor socrático usando el perfil real
        const historial = await obtenerHistorial(remitente);
        const resultado = await procesarMensajeTutor(mensajeTexto, estudiante, historial);

        await agregarAlHistorial(remitente, 'user', mensajeTexto);
        await agregarAlHistorial(remitente, 'model', resultado.respuesta);

        respuestaFinal += resultado.respuesta;

        if (resultado.generarQuiz) {
          respuestaFinal += '\n\n📝 _Parece que dominas este tema. Escribe "quiz" para evaluarte._';
        }
      }

    } else {
      // Mensaje vacío
      respuestaFinal += '🧠 ¡Hola! Soy Synapse, tu tutor IA. Envíame tu duda, una foto de tu cuaderno o una nota de voz y te ayudo. Escribe *"ayuda"* para ver todas las opciones.';
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

router.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log('✅ Webhook verificado por Meta API');
    return res.status(200).send(challenge);
  }

  res.status(200).json({
    status: 'ok',
    servicio: 'Synapse WhatsApp Webhook',
    mensaje: 'Webhook activo y escuchando mensajes.'
  });
});

// ─────────────────────────────────────────────
// UTILIDAD: Descargar media de Twilio
// ─────────────────────────────────────────────

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
      headers: { 'Authorization': `Basic ${credenciales}` }
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
