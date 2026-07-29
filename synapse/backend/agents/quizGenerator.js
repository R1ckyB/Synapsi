// ============================================
// Agente IA: Generador de Quizzes Adaptativos
// EduMentor - Backend
// ============================================

const { chatJSON } = require('../config/gemini');

/**
 * Genera un quiz adaptativo en formato JSON determinístico.
 */
async function generarQuizAdaptativo(tema, nivelEducativo = 'secundaria', numPreguntas = 3) {
  const systemPrompt = `
Eres el módulo de evaluación de EduMentor.
Tu tarea es generar un cuestionario dinámico y adaptativo de ${numPreguntas} preguntas sobre el tema: "${tema}".
Nivel educativo objetivo: ${nivelEducativo}.

DEBES DEVOLVER ÚNICAMENTE UN OBJETO JSON CON LA SIGUIENTE ESTRUCTURA ESTRICTA:
{
  "tema": "${tema}",
  "nivel": "${nivelEducativo}",
  "preguntas": [
    {
      "id": 1,
      "pregunta": "Texto claro de la pregunta...",
      "opciones": ["Opción A", "Opción B", "Opción C", "Opción D"],
      "respuestaCorrectaIndex": 0,
      "explicacion": "Explicación pedagógica de por qué esta es la respuesta correcta."
    }
  ]
}
`.trim();

  const userMessage = `Por favor genera el quiz de ${numPreguntas} preguntas para el tema "${tema}".`;

  const quizJSON = await chatJSON(systemPrompt, userMessage);
  return quizJSON;
}

module.exports = {
  generarQuizAdaptativo
};
