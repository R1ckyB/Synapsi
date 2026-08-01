// ============================================
// Agente IA: Generador de Quizzes Adaptativos (v2.0)
// Synapse - Backend
// Pilar Diferenciador #5: Quizzes Adaptativos
// ============================================

const { chatJSON } = require('../config/gemini');
const { obtenerVaciosEstudiante } = require('./vaciosService');

/**
 * Genera un quiz adaptativo en formato JSON determinístico.
 * Puede enfocarse en los vacíos de conocimiento detectados del estudiante.
 *
 * @param {string} tema - Tema principal del quiz
 * @param {string} nivelEducativo - Nivel educativo ('primaria', 'secundaria', 'preparatoria', 'universidad')
 * @param {number} numPreguntas - Cantidad de preguntas (3-10)
 * @param {string} dificultad - Dificultad inicial ('basico', 'intermedio', 'avanzado')
 * @param {Array} vaciosDetectados - Lista de conceptos con vacío para enfocar el quiz
 * @returns {Object} Quiz en formato JSON estructurado
 */
async function generarQuizAdaptativo(tema, nivelEducativo = 'secundaria', numPreguntas = 3, dificultad = 'intermedio', vaciosDetectados = []) {
  const enfoquePorVacios = vaciosDetectados.length > 0
    ? `\nENFOQUE ESPECIAL: El estudiante tiene dificultades con estos conceptos específicos, incluye al menos ${Math.min(vaciosDetectados.length, numPreguntas - 1)} preguntas enfocadas en ellos:\n${vaciosDetectados.map((v, i) => `  ${i + 1}. ${v.concepto || v}`).join('\n')}`
    : '';

  const systemPrompt = `
Eres el módulo de evaluación adaptativa de Synapse.
Tu tarea es generar un cuestionario dinámico de ${numPreguntas} preguntas sobre el tema: "${tema}".
Nivel educativo objetivo: ${nivelEducativo}.
Dificultad inicial: ${dificultad}.
${enfoquePorVacios}

REGLAS DE GENERACIÓN:
1. Las preguntas deben tener dificultad PROGRESIVA: las primeras son más fáciles, las últimas más difíciles.
2. Cada pregunta incluye un campo "dificultad" que puede ser: "basico", "intermedio" o "avanzado".
3. Las explicaciones deben ser PEDAGÓGICAS, no solo decir la respuesta correcta sino explicar POR QUÉ es correcta y POR QUÉ las otras son incorrectas.
4. Los distractores (opciones incorrectas) deben ser PLAUSIBLES, basados en errores comunes que cometen los estudiantes.
5. Incluye un "pistaPrevia" que el estudiante pueda ver ANTES de responder si lo necesita.

DEBES DEVOLVER ÚNICAMENTE UN OBJETO JSON CON LA SIGUIENTE ESTRUCTURA ESTRICTA:
{
  "tema": "${tema}",
  "nivel": "${nivelEducativo}",
  "totalPreguntas": ${numPreguntas},
  "preguntas": [
    {
      "id": 1,
      "pregunta": "Texto claro de la pregunta...",
      "opciones": ["Opción A", "Opción B", "Opción C", "Opción D"],
      "respuestaCorrectaIndex": 0,
      "dificultad": "basico",
      "explicacion": "Explicación pedagógica detallada de por qué esta es la respuesta correcta y por qué las demás son incorrectas.",
      "pistaPrevia": "Una pista que ayude al estudiante a razonar antes de elegir.",
      "conceptoEvaluado": "Nombre del concepto específico que evalúa esta pregunta"
    }
  ],
  "recomendacion": "Texto breve recomendando qué estudiar después según el resultado del quiz"
}
`.trim();

  const userMessage = `Genera el quiz de ${numPreguntas} preguntas para "${tema}" con dificultad progresiva desde ${dificultad}.`;

  const quizJSON = await chatJSON(systemPrompt, userMessage);
  return quizJSON;
}

/**
 * Genera un quiz personalizado basado en los vacíos de conocimiento
 * detectados automáticamente para un estudiante específico.
 *
 * @param {string} estudianteId - UID del estudiante
 * @param {string} nivelEducativo - Nivel educativo
 * @param {number} numPreguntas - Cantidad de preguntas
 * @returns {Object} Quiz enfocado en los vacíos del estudiante
 */
async function generarQuizPorVacios(estudianteId, nivelEducativo = 'secundaria', numPreguntas = 5) {
  const vacios = await obtenerVaciosEstudiante(estudianteId);

  if (vacios.length === 0) {
    // Si no hay vacíos detectados, generar un quiz general
    return generarQuizAdaptativo('Repaso General', nivelEducativo, numPreguntas, 'intermedio');
  }

  // Usar el vacío más frecuente como tema principal
  const temaPrincipal = vacios[0].concepto;
  const materia = vacios[0].materia;

  return generarQuizAdaptativo(
    `${materia} — ${temaPrincipal}`,
    nivelEducativo,
    numPreguntas,
    'basico', // Empezar en básico porque son áreas de dificultad
    vacios.slice(0, 5) // Enviar hasta 5 vacíos como enfoque
  );
}

/**
 * Evalúa las respuestas de un quiz completado y retorna retroalimentación.
 *
 * @param {Object} quiz - Quiz original con preguntas
 * @param {Array} respuestas - Array de índices de respuestas del estudiante [0, 2, 1, 3, ...]
 * @returns {Object} Resultado con puntuación, retroalimentación y recomendaciones
 */
function evaluarQuiz(quiz, respuestas = []) {
  const preguntas = quiz.preguntas || [];
  let correctas = 0;
  const detalles = [];

  preguntas.forEach((pregunta, i) => {
    const respuestaEstudiante = respuestas[i];
    const esCorrecta = respuestaEstudiante === pregunta.respuestaCorrectaIndex;

    if (esCorrecta) correctas++;

    detalles.push({
      preguntaId: pregunta.id,
      correcta: esCorrecta,
      respuestaEstudiante,
      respuestaCorrecta: pregunta.respuestaCorrectaIndex,
      explicacion: pregunta.explicacion,
      conceptoEvaluado: pregunta.conceptoEvaluado || null
    });
  });

  const porcentaje = preguntas.length > 0 ? Math.round((correctas / preguntas.length) * 100) : 0;

  // Identificar conceptos que necesitan refuerzo
  const conceptosReforzar = detalles
    .filter(d => !d.correcta && d.conceptoEvaluado)
    .map(d => d.conceptoEvaluado);

  let nivelSiguiente;
  if (porcentaje >= 80) nivelSiguiente = 'avanzado';
  else if (porcentaje >= 50) nivelSiguiente = 'intermedio';
  else nivelSiguiente = 'basico';

  return {
    correctas,
    totalPreguntas: preguntas.length,
    porcentaje,
    detalles,
    conceptosReforzar,
    nivelSiguiente,
    mensaje: porcentaje >= 80
      ? '¡Excelente! Dominas bien este tema. ¿Listo para un reto mayor? 🏆'
      : porcentaje >= 50
        ? '¡Buen intento! Hay algunos conceptos que reforzar. Repasemos juntos 💪'
        : 'No te preocupes, vamos a repasar estos conceptos paso a paso. ¡Tú puedes! 🌟'
  };
}

module.exports = {
  generarQuizAdaptativo,
  generarQuizPorVacios,
  evaluarQuiz
};
