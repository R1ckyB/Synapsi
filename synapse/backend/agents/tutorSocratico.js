// ============================================
// Agente IA: Tutor Socrático
// EduMentor - Backend
// ============================================

const { chatConHistorial } = require('../config/gemini');

/**
 * Genera el System Prompt adaptado al estudiante y materia.
 */
function generarPromptTutorSocratico(estudiante = {}) {
  const nombre = estudiante.nombre || 'Estudiante';
  const nivel = estudiante.nivelEducativo || 'secundaria/preparatoria';
  const materia = estudiante.materiaActual || 'General';

  return `
Eres "EduMentor", un tutor pedagógico virtual sabio, paciente y entusiasta.
Estás ayudando a ${nombre}, un estudiante de nivel ${nivel}.
Materia o tema actual: ${materia}.

REGLAS PEDAGÓGICAS FUNDAMENTALES (MÉTODO SOCRÁTICO):
1. NUNCA des la respuesta final o la solución completa del ejercicio directamente.
2. Descompón los problemas complejos en pequeños pasos lógicos.
3. Haz preguntas guía para que el estudiante piense y deduzca la solución por sí mismo.
4. Si el estudiante comete un error, felicítalo por intentarlo y pídele que revise el paso específico donde se equivocó.
5. Usa un lenguaje motivador, claro y empático en español mexicano.
6. Mantén las respuestas CORTAS y concisas (máximo 3-4 párrafos breves o listas con viñetas).

FORMATO DE ACCIÓN:
Si detectas que el estudiante domina el tema o pide evaluarse, añade al final de tu mensaje:
[ACCION:GENERAR_QUIZ|tema:${materia}]

Si detectas un vacío grave de conocimiento recurrente en un concepto, añade al final:
[VACIO_DETECTADO|concepto:NombreDelConcepto]
`.trim();
}

/**
 * Procesa un mensaje conversacional con el tutor.
 */
async function procesarMensajeTutor(mensajeUsuario, estudiante = {}, historial = []) {
  const systemPrompt = generarPromptTutorSocratico(estudiante);

  const respuestaBruta = await chatConHistorial(systemPrompt, historial, mensajeUsuario);

  // Extraer etiquetas de acción o vacíos detectados
  const quizAccion = respuestaBruta.match(/\[ACCION:GENERAR_QUIZ\|tema:(.*?)\]/);
  const vacioDetectado = respuestaBruta.match(/\[VACIO_DETECTADO\|concepto:(.*?)\]/);

  // Limpiar la respuesta para el usuario final
  const respuestaLimpia = respuestaBruta
    .replace(/\[ACCION:.*\]/g, '')
    .replace(/\[VACIO_DETECTADO:.*\]/g, '')
    .trim();

  return {
    respuesta: respuestaLimpia,
    generarQuiz: !!quizAccion,
    temaQuiz: quizAccion ? quizAccion[1] : null,
    vacioConcepto: vacioDetectado ? vacioDetectado[1] : null
  };
}

module.exports = {
  generarPromptTutorSocratico,
  procesarMensajeTutor
};
