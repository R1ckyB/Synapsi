// ============================================
// Agente IA: Analizador de Imágenes de Cuaderno
// Synapse - Backend
// Pilar Diferenciador #2: Multimodalidad Real
// ============================================

const { chatMultimodal, chatJSON } = require('../config/gemini');

/**
 * Analiza una foto de cuaderno/ejercicio y detecta errores paso a paso.
 * Usa el método socrático: señala la línea del error sin dar la respuesta.
 *
 * @param {Buffer} imagenBuffer - Buffer de la imagen (foto de libreta)
 * @param {string} mimeType - Tipo MIME ('image/jpeg', 'image/png', etc.)
 * @param {string} materia - Materia o tema del ejercicio
 * @param {string} nivelEducativo - Nivel del estudiante
 * @returns {Object} Análisis estructurado con errores detectados
 */
async function analizarFotoCuaderno(imagenBuffer, mimeType = 'image/jpeg', materia = 'Matemáticas', nivelEducativo = 'secundaria') {
  const systemPrompt = `
Eres Synapse, un tutor pedagógico virtual experto en analizar ejercicios escritos a mano por estudiantes.
Materia: ${materia}
Nivel educativo del estudiante: ${nivelEducativo}

Se te proporciona una FOTO de la libreta del estudiante donde intentó resolver un ejercicio.

TU TAREA:
1. Identifica el ejercicio o problema que el estudiante está intentando resolver.
2. Revisa CADA PASO o línea de la solución escrita.
3. Si hay un error, indica EN QUÉ PASO EXACTO se cometió (ej: "En el paso 3..." o "En la línea donde escribiste...").
4. NO corrijas el error directamente. Usa el MÉTODO SOCRÁTICO:
   - Haz una pregunta que guíe al estudiante a encontrar su propio error.
   - Ejemplo: "Revisa el paso 3: cuando pasas un término restando al otro lado, ¿qué le pasa al signo?"
5. Si todo está correcto, felicita al estudiante y sugiere un ejercicio de refuerzo.

REGLAS ESTRICTAS:
- NUNCA reveles la respuesta final completa.
- Sé específico sobre la ubicación del error (paso, línea, operación).
- Usa lenguaje motivador y empático en español.
- Si la imagen no es legible, pide amablemente que tome una foto más clara.

DEBES RESPONDER ÚNICAMENTE EN FORMATO JSON CON ESTA ESTRUCTURA:
{
  "ejercicioIdentificado": "Descripción breve del ejercicio detectado en la foto",
  "pasosTotales": 5,
  "errorDetectado": true,
  "pasoConError": 3,
  "descripcionError": "En el paso 3, hay un error al cambiar de signo al pasar el término",
  "preguntaSocratica": "Cuando mueves un número sumando al otro lado de la ecuación, ¿qué operación inversa debes aplicar?",
  "pistaAdicional": "Recuerda: lo que está sumando pasa restando, y lo que está multiplicando pasa dividiendo",
  "nivelConfianza": "alto",
  "mensajeMotivador": "¡Vas muy bien! Solo revisa ese detalle y lo tendrás resuelto 💪",
  "conceptoRelacionado": "Transposición de términos en ecuaciones lineales"
}

Si la imagen no es legible:
{
  "ejercicioIdentificado": null,
  "errorDetectado": null,
  "mensajeMotivador": "No alcancé a leer bien tu ejercicio. ¿Podrías tomarle una foto con mejor iluminación? 📸",
  "nivelConfianza": "bajo"
}
`.trim();

  const imagenPart = {
    inlineData: {
      data: imagenBuffer.toString('base64'),
      mimeType
    }
  };

  const respuestaTexto = await chatMultimodal(systemPrompt, [imagenPart]);

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
        // Si no se puede parsear, retornar como texto estructurado
      }
    }

    return {
      ejercicioIdentificado: null,
      errorDetectado: null,
      respuestaLibre: respuestaTexto,
      nivelConfianza: 'bajo',
      mensajeMotivador: 'Analicé tu ejercicio, aquí va mi retroalimentación:'
    };
  }
}

/**
 * Analiza una imagen genérica con contenido educativo (diagrama, gráfica, etc.)
 * y genera una explicación socrática.
 *
 * @param {Buffer} imagenBuffer - Buffer de la imagen
 * @param {string} mimeType - Tipo MIME
 * @param {string} preguntaEstudiante - Pregunta del estudiante sobre la imagen
 * @param {string} materia - Materia o contexto
 * @returns {string} Explicación socrática sobre la imagen
 */
async function explicarImagenEducativa(imagenBuffer, mimeType = 'image/jpeg', preguntaEstudiante = '', materia = 'General') {
  const systemPrompt = `
Eres Synapse, un tutor pedagógico virtual.
El estudiante te comparte una imagen educativa (diagrama, gráfica, tabla, mapa conceptual, etc.)
y tiene una pregunta al respecto.
Materia: ${materia}

Pregunta del estudiante: "${preguntaEstudiante || '¿Me puedes explicar esto?'}"

INSTRUCCIONES:
1. Describe brevemente lo que ves en la imagen.
2. Responde la pregunta del estudiante usando el MÉTODO SOCRÁTICO.
3. No des toda la información digerida. Haz preguntas que lo hagan pensar.
4. Usa un lenguaje claro, motivador y con analogías cotidianas.
5. Máximo 3-4 párrafos cortos.
`.trim();

  const imagenPart = {
    inlineData: {
      data: imagenBuffer.toString('base64'),
      mimeType
    }
  };

  const respuesta = await chatMultimodal(systemPrompt, [imagenPart]);
  return respuesta;
}

module.exports = {
  analizarFotoCuaderno,
  explicarImagenEducativa
};
