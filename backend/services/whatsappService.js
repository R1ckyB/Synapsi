// ============================================
// Servicio de WhatsApp: Envío de Mensajes Proactivos
// Synapse - Backend
// Usa Twilio API para enviar mensajes, quiz diarios, rachas de estudio
// ============================================

const TWILIO_API_URL = 'https://api.twilio.com/2010-04-01';

/**
 * Obtiene las credenciales de Twilio desde las variables de entorno.
 */
function getTwilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

  if (!accountSid || !authToken) {
    console.warn('⚠️ Twilio no configurado. Mensajes proactivos deshabilitados.');
    return null;
  }

  return { accountSid, authToken, whatsappNumber };
}

/**
 * Envía un mensaje de WhatsApp a un número específico usando Twilio REST API.
 *
 * @param {string} destinatario - Número en formato 'whatsapp:+521234567890'
 * @param {string} mensaje - Texto del mensaje a enviar
 * @returns {Object} Resultado del envío
 */
async function enviarMensajeWhatsApp(destinatario, mensaje) {
  const config = getTwilioConfig();

  if (!config) {
    console.log(`📱 [Mock] WhatsApp → ${destinatario}: "${mensaje.substring(0, 80)}..."`);
    return { enviado: false, mock: true, razon: 'Twilio no configurado' };
  }

  const url = `${TWILIO_API_URL}/Accounts/${config.accountSid}/Messages.json`;

  // Twilio usa autenticación HTTP Basic y form-urlencoded
  const credenciales = Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');

  const body = new URLSearchParams({
    From: config.whatsappNumber,
    To: destinatario,
    Body: mensaje
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credenciales}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`✅ WhatsApp enviado a ${destinatario} | SID: ${data.sid}`);
      return { enviado: true, sid: data.sid };
    } else {
      console.error(`❌ Error Twilio: ${data.message}`);
      return { enviado: false, error: data.message };
    }
  } catch (error) {
    console.error('❌ Error de red al enviar WhatsApp:', error.message);
    return { enviado: false, error: error.message };
  }
}

/**
 * Envía la "Pregunta del Día" a un estudiante para fomentar el hábito de estudio.
 *
 * @param {string} destinatario - Número de WhatsApp del estudiante
 * @param {string} pregunta - Texto de la pregunta
 * @param {string} materia - Materia de la pregunta
 */
async function enviarPreguntaDelDia(destinatario, pregunta, materia = 'General') {
  const mensaje = `🧠 *Synapse — Pregunta del Día*\n\n📚 Materia: ${materia}\n\n❓ ${pregunta}\n\n💬 _Respóndeme aquí y te ayudo a verificar tu respuesta paso a paso._`;
  return enviarMensajeWhatsApp(destinatario, mensaje);
}

/**
 * Envía notificación de racha de estudio al estudiante.
 *
 * @param {string} destinatario - Número de WhatsApp
 * @param {number} diasRacha - Días consecutivos de estudio
 */
async function enviarRachaEstudio(destinatario, diasRacha) {
  const emojis = diasRacha >= 7 ? '🏆🔥' : diasRacha >= 3 ? '🔥💪' : '⭐';
  const mensaje = `${emojis} *¡Racha de estudio: ${diasRacha} días!*\n\n¡Sigue así! Cada día que estudias, tu cerebro se fortalece.\n\n💬 _Envíame tu duda de hoy y mantenemos la racha._`;
  return enviarMensajeWhatsApp(destinatario, mensaje);
}

/**
 * Envía un recordatorio de repaso sobre un tema con vacío detectado.
 *
 * @param {string} destinatario - Número de WhatsApp
 * @param {string} concepto - Concepto que necesita refuerzo
 * @param {string} materia - Materia del concepto
 */
async function enviarRecordatorioRepaso(destinatario, concepto, materia) {
  const mensaje = `📖 *Synapse — Recordatorio de Repaso*\n\n🔍 Noté que el tema *"${concepto}"* de ${materia} necesita un poco más de práctica.\n\n¿Quieres que te haga unas preguntas rápidas para reforzarlo? Responde *"sí"* y empezamos 💪`;
  return enviarMensajeWhatsApp(destinatario, mensaje);
}

module.exports = {
  enviarMensajeWhatsApp,
  enviarPreguntaDelDia,
  enviarRachaEstudio,
  enviarRecordatorioRepaso
};
