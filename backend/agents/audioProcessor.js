// ============================================
// Agente IA: Procesador de Audio y Voz (v2.0)
// Synapse - Backend
// Pilar Diferenciador #2: Multimodalidad Real
// ============================================

const { chatMultimodal } = require('../config/gemini');

/**
 * Procesa un archivo de audio (nota de voz de duda o lección) y genera
 * un análisis estructurado en JSON con transcripción, resumen y preguntas socráticas.
 *
 * @param {Buffer} audioBuffer - Buffer con el contenido del audio
 * @param {string} mimeType - Tipo MIME del audio (ej: 'audio/mp3', 'audio/wav', 'audio/ogg')
 * @param {string} contextoTema - Materia o tema de la duda
 * @param {string} nivelEducativo - Nivel del estudiante
 * @returns {Object} Análisis JSON estructurado del audio
 */
async function procesarAudioDuda(audioBuffer, mimeType = 'audio/mp3', contextoTema = 'General', nivelEducativo = 'secundaria') {
  const systemPrompt = `
Eres Synapse analizando una nota de voz enviada por un estudiante de nivel ${nivelEducativo}.
Materia/Tema de contexto: ${contextoTema}.

Tu tarea es analizar el audio y RESPONDER ÚNICAMENTE EN FORMATO JSON con esta estructura exacta:

{
  "transcripcion": "Texto completo transcrito del audio del estudiante",
  "resumen": [
    "Primer punto clave del contenido del audio",
    "Segundo punto clave",
    "Tercer punto clave"
  ],
  "preguntasRepaso": [
    "Primera pregunta socrática para que el estudiante reflexione sobre su duda",
    "Segunda pregunta socrática que lo guíe a encontrar la respuesta"
  ],
  "nivelComprension": "bajo | medio | alto",
  "estadoEmocional": "frustrado | confundido | curioso | neutral",
  "temaIdentificado": "Nombre específico del tema o concepto que menciona",
  "respuestaSocratica": "Respuesta breve y motivadora usando el método socrático para abordar la duda del estudiante. NO dar la respuesta directa, solo guiar.",
  "sugerenciaEstudio": "Una sugerencia concreta de qué estudiar o repasar"
}

REGLAS:
1. Si el audio no es claro, indica en la transcripción las partes ininteligibles con [inaudible].
2. El nivel de comprensión se determina por cómo formula la duda:
   - "bajo": No puede articular qué no entiende, confunde conceptos básicos.
   - "medio": Identifica el tema pero no sabe cómo resolverlo.
   - "alto": Entiende el concepto pero tiene una duda específica.
3. La respuesta socrática NUNCA debe dar la solución directa.
4. Adapta el lenguaje al nivel educativo: ${nivelEducativo}.
`.trim();

  const audioPart = {
    inlineData: {
      data: audioBuffer.toString('base64'),
      mimeType
    }
  };

  const respuestaTexto = await chatMultimodal(systemPrompt, [audioPart]);

  // Intentar parsear como JSON
  try {
    return JSON.parse(respuestaTexto);
  } catch {
    // Fallback: extraer JSON embebido en texto
    const jsonMatch = respuestaTexto.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        // Si no se puede parsear, retornar en formato estructurado manual
      }
    }

    return {
      transcripcion: respuestaTexto,
      resumen: ['No se pudo generar un resumen estructurado automáticamente.'],
      preguntasRepaso: [],
      nivelComprension: 'medio',
      estadoEmocional: 'neutral',
      temaIdentificado: contextoTema,
      respuestaSocratica: respuestaTexto,
      sugerenciaEstudio: `Repasa los conceptos básicos de ${contextoTema}.`
    };
  }
}

/**
 * Procesa un audio largo de una clase o lección y genera un resumen didáctico.
 *
 * @param {Buffer} audioBuffer - Buffer con el audio de la clase
 * @param {string} mimeType - Tipo MIME
 * @param {string} materia - Materia de la clase
 * @returns {Object} Resumen estructurado de la clase
 */
async function procesarAudioClase(audioBuffer, mimeType = 'audio/mp3', materia = 'General') {
  const systemPrompt = `
Eres Synapse procesando la grabación de audio de una clase o lección.
Materia: ${materia}.

Analiza el audio completo y RESPONDE ÚNICAMENTE EN FORMATO JSON:

{
  "tituloClase": "Título descriptivo que resume el tema de la clase",
  "duracionEstimada": "Duración estimada en minutos",
  "temasAbordados": [
    "Tema 1 explicado en la clase",
    "Tema 2 explicado en la clase"
  ],
  "puntosClaveEstudio": [
    "Punto clave 1 para el examen",
    "Punto clave 2 para el examen",
    "Punto clave 3 para el examen",
    "Punto clave 4 para el examen",
    "Punto clave 5 para el examen"
  ],
  "preguntasRepaso": [
    "Pregunta 1 para autoevaluarse sobre esta clase",
    "Pregunta 2",
    "Pregunta 3"
  ],
  "conceptosDificiles": [
    "Concepto que podría generar dudas y necesita repaso adicional"
  ],
  "resumenEjecutivo": "Resumen de 2-3 oraciones de toda la clase"
}
`.trim();

  const audioPart = {
    inlineData: {
      data: audioBuffer.toString('base64'),
      mimeType
    }
  };

  const respuestaTexto = await chatMultimodal(systemPrompt, [audioPart]);

  try {
    return JSON.parse(respuestaTexto);
  } catch {
    const jsonMatch = respuestaTexto.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        // Fallback
      }
    }

    return {
      tituloClase: materia,
      resumenEjecutivo: respuestaTexto,
      puntosClaveEstudio: [],
      preguntasRepaso: [],
      conceptosDificiles: []
    };
  }
}

module.exports = {
  procesarAudioDuda,
  procesarAudioClase
};
