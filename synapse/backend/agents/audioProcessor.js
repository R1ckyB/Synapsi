// ============================================
// Agente IA: Procesador de Audio y Voz
// EduMentor - Backend
// ============================================

const { chatMultimodal } = require('../config/gemini');

/**
 * Procesa un archivo de audio (nota de voz de duda o lección) y genera transcripción + resumen socrático.
 * @param {Buffer} audioBuffer - Buffer con el contenido del audio
 * @param {string} mimeType - Tipo MIME del audio (ej: 'audio/mp3', 'audio/wav', 'audio/ogg')
 * @param {string} contextoTema - Materia o tema de la duda
 */
async function procesarAudioDuda(audioBuffer, mimeType = 'audio/mp3', contextoTema = 'General') {
  const systemPrompt = `
Eres EduMentor analizando una nota de voz enviada por un estudiante.
Materia/Tema de contexto: ${contextoTema}.

Tu tarea:
1. Transcribir o entender la duda/tema expuesto en el audio.
2. Generar un resumen claro en 3 puntos clave.
3. Formular 2 preguntas socráticas para ayudar al estudiante a pensar sobre su duda.

Responde de forma estructurada y motivadora en español.
`.trim();

  const audioPart = {
    inlineData: {
      data: audioBuffer.toString('base64'),
      mimeType
    }
  };

  const respuesta = await chatMultimodal(systemPrompt, [audioPart]);
  return respuesta;
}

module.exports = {
  procesarAudioDuda
};
