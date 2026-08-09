// ============================================
// Agente IA: Modo Profesor Invertido / Técnica Feynman (v1.0)
// Synapse - Backend
// ============================================

const { chatJSON } = require('../config/gemini');

/**
 * Procesa un turno del Modo Profesor Invertido.
 * Gemini actúa como "Leo", un estudiante novato y curioso que necesita que el usuario le enseñe un tema.
 *
 * @param {string} tema - Tema que el usuario debe explicar (ej: "Fotosíntesis", "Leyes de Newton")
 * @param {string} explicacionUsuario - La explicación enviada por el usuario
 * @param {Array} historial - Historial de la conversación previa
 * @returns {Object} { respuesta, scoreComprension, feedbackPedagogico, completado }
 */
async function procesarExplicacionFeynman(tema, explicacionUsuario, historial = []) {
  const systemPrompt = `
Eres "Leo", un estudiante de 12 años muy curioso, simpático e ingenioso, pero que está TOTALMENTE CONFUNDIDO sobre el tema: "${tema}".
El usuario es tu profesor o tutor y está tratando de explicarte este tema usando sus propias palabras (Técnica Feynman).

REGLAS OBLIGATORIAS:
1. NUNCA expliques el tema tú mismo. Tú eres el alumno novato.
2. Escucha la explicación del usuario con mucha atención.
3. Si la explicación es buena y clara, muestra entusiasmo y comprensión progresiva ("¡Ahhh ya entendí esa parte!").
4. Si la explicación es confusa, usa jerga técnica sin explicar, o comete un error conceptual, hazle una PREGUNTA INGENUA o pon un ejemplo divertido que ponga a prueba su razonamiento.
5. Asigna una puntuación de 0 a 100 indicando qué tan clara y precisa fue la explicación del usuario hasta ahora.

DEBES DEVOLVER ÚNICAMENTE UN OBJETO JSON CON ESTA ESTRUCTURA ESTRICTA:
{
  "respuesta": "Tu respuesta en personaje como Leo el estudiante curioso (máximo 3 oraciones con emojis)...",
  "scoreComprension": 65,
  "feedbackPedagogico": "Breve nota pedagógica de 1 oración evaluando qué explicó bien el usuario y qué faltó.",
  "completado": false
}
`.trim();

  const userMessage = `[Tema: ${tema}]\nExplicación del usuario: "${explicacionUsuario}"`;

  try {
    const res = await chatJSON(systemPrompt, userMessage);
    return {
      respuesta: res.respuesta || '¡Interesante! ¿Me lo puedes explicar con un ejemplo cotidiano?',
      scoreComprension: typeof res.scoreComprension === 'number' ? Math.min(100, Math.max(0, res.scoreComprension)) : 50,
      feedbackPedagogico: res.feedbackPedagogico || 'Sigue explicando paso a paso.',
      completado: !!res.completado || (res.scoreComprension >= 90)
    };
  } catch (err) {
    return {
      respuesta: '¡Vaya! Me perdí un poco en esa parte. ¿Podrías explicármelo de otra forma más sencilla? 🤔',
      scoreComprension: 50,
      feedbackPedagogico: 'Intenta usar analogías simples.',
      completado: false
    };
  }
}

module.exports = {
  procesarExplicacionFeynman
};
