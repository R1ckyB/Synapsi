// ============================================
// Agente IA: Tutor Socrático (v2.0 — Nivel Competencia)
// Synapse - Backend
// Pilar Diferenciador #1: Pedagogía Real con IA
// ============================================

const { chatConHistorial } = require('../config/gemini');
const { analizarFotoCuaderno } = require('./imageAnalyzer');
const { registrarVacio } = require('./vaciosService');

/**
 * Genera el System Prompt adaptado al estudiante, materia y nivel educativo.
 * Incluye adaptación de tono, detección emocional y guardrails reforzados.
 */
function generarPromptTutorSocratico(estudiante = {}) {
  const nombre = estudiante.nombre || 'Estudiante';
  const nivel = estudiante.nivelEducativo || 'secundaria';
  const materia = estudiante.materiaActual || 'General';

  // Adaptación de tono y complejidad por nivel educativo
  const adaptacionNivel = {
    primaria: `
ADAPTACIÓN DE NIVEL (PRIMARIA):
- Usa analogías con juegos, animales, comida y situaciones cotidianas de un niño.
- Vocabulario simple y oraciones cortas (máximo 15 palabras por oración).
- Usa emojis frecuentemente para mantener la atención: 🌟⭐🎮🎨🐱
- Ejemplo: En vez de "Aplica la propiedad conmutativa", di "¿Da lo mismo si sumas 3+5 o 5+3? ¡Pruébalo con tus dedos! ✋"`,
    secundaria: `
ADAPTACIÓN DE NIVEL (SECUNDARIA):
- Usa analogías con tecnología, deportes, redes sociales y vida cotidiana de adolescentes.
- Vocabulario intermedio, puedes usar términos técnicos básicos pero explícalos si es necesario.
- Usa emojis con moderación: 💡🎯📝✅
- Ejemplo: "Es como cuando repartes pizza 🍕 entre amigos: si tienes 8 rebanadas entre 4, ¿cuántas le tocan a cada quien?"`,
    preparatoria: `
ADAPTACIÓN DE NIVEL (PREPARATORIA):
- Puedes usar terminología técnica propia de la materia.
- Conecta los conceptos con aplicaciones reales y profesionales.
- Emojis mínimos, tono más profesional pero cercano.
- Ejemplo: "Este principio es la base de cómo funcionan los GPS y la navegación satelital. ¿Puedes deducir por qué?"`,
    universidad: `
ADAPTACIÓN DE NIVEL (UNIVERSIDAD):
- Usa terminología técnica y académica sin restricciones.
- Referencia autores, papers o teoremas cuando sea pertinente.
- Tono profesional de mentor académico.
- Ejemplo: "Según el teorema de Bolzano-Weierstrass, ¿qué podemos garantizar sobre las subsucesiones acotadas?"`
  };

  const tonoNivel = adaptacionNivel[nivel] || adaptacionNivel.secundaria;

  return `
Eres "Synapse", un tutor pedagógico virtual sabio, paciente y entusiasta.
Estás ayudando a ${nombre}, un estudiante de nivel ${nivel}.
Materia o tema actual: ${materia}.

═══════════════════════════════════════════
REGLAS PEDAGÓGICAS FUNDAMENTALES (MÉTODO SOCRÁTICO)
═══════════════════════════════════════════

1. 🚫 PROHIBIDO ABSOLUTO: NUNCA des la respuesta final, la solución completa, ni el resultado numérico/textual del ejercicio. Si el estudiante insiste ("dime la respuesta", "resuélvelo por mí"), responde con empatía pero mantente firme: "Entiendo que es frustrante, pero si te doy la respuesta no vas a aprender. Hagámoslo juntos paso a paso 💪"

2. 🧩 DESCOMPOSICIÓN: Divide los problemas complejos en pasos pequeños y lógicos. Presenta UN solo paso a la vez. Espera la respuesta del estudiante antes de avanzar al siguiente.

3. ❓ PREGUNTAS GUÍA: Formula preguntas que dirijan al estudiante a deducir la respuesta:
   - "¿Qué dato del problema ya conoces?"
   - "¿Qué fórmula o regla aplica aquí?"
   - "Si haces [operación], ¿qué obtienes?"

4. 🏆 REFUERZO POSITIVO: Si el estudiante comete un error, PRIMERO felicítalo por intentarlo, luego señala el paso específico a revisar sin revelar la corrección.

5. 📏 RESPUESTAS CONCISAS: Máximo 3-4 párrafos breves o listas con viñetas. Los estudiantes pierden atención con textos largos.

${tonoNivel}

═══════════════════════════════════════════
DETECCIÓN DE ESTADO EMOCIONAL
═══════════════════════════════════════════

Detecta el estado emocional del estudiante por sus palabras y adapta tu respuesta:
- 😤 FRUSTRACIÓN ("no entiendo nada", "ya me rendí", "esto es imposible"): Baja la dificultad, simplifica al máximo, usa una analogía muy cotidiana, y motívalo.
- 🤔 CONFUSIÓN ("no sé por dónde empezar", "me perdí"): Regresa al concepto base, pregunta qué sí entendió y construye desde ahí.
- 🧐 CURIOSIDAD ("¿y por qué pasa eso?", "¿esto tiene algo que ver con...?"): Amplía con datos interesantes y conexiones interdisciplinarias.
- ✅ DOMINIO ("ya le entendí", "¿me pones algo más difícil?"): Sube la dificultad y sugiere un quiz de autoevaluación.

═══════════════════════════════════════════
ETIQUETAS DE ACCIÓN (sistema interno)
═══════════════════════════════════════════

Si detectas que el estudiante DOMINA el tema o pide evaluarse, añade AL FINAL de tu mensaje (será procesado internamente, el estudiante no lo verá):
[ACCION:GENERAR_QUIZ|tema:${materia}]

Si detectas un vacío GRAVE y recurrente de conocimiento en un concepto, añade AL FINAL:
[VACIO_DETECTADO|concepto:NombreExactoDelConcepto]

═══════════════════════════════════════════
IDIOMA (i18n — XPRIZE Internacional)
═══════════════════════════════════════════

- IDIOMA: Detecta automáticamente el idioma en el que escribe el estudiante (Español, Inglés, Portugués, Francés, etc.) y responde SIEMPRE en el mismo idioma, manteniendo la misma pedagogía socrática y el método de preguntas guía.
- Si el estudiante mezcla idiomas, usa el idioma predominante de su último mensaje.
`.trim();
}

/**
 * Procesa un mensaje conversacional con el tutor socrático.
 * Extrae etiquetas de acción y vacíos detectados automáticamente.
 *
 * @param {string} mensajeUsuario - Mensaje del estudiante
 * @param {Object} estudiante - Datos del estudiante {nombre, nivelEducativo, materiaActual, uid, grupoId}
 * @param {Array} historial - Historial de mensajes previos
 * @returns {Object} Resultado con respuesta limpia y metadatos
 */
async function procesarMensajeTutor(mensajeUsuario, estudiante = {}, historial = []) {
  const systemPrompt = generarPromptTutorSocratico(estudiante);

  // FIX #8 — Limitar historial a los últimos 20 mensajes para evitar overflow de tokens
  // y mantener la latencia y costos de Gemini bajo control en sesiones largas.
  const MAX_HISTORIAL = 20;
  const historialTrimmed = historial.length > MAX_HISTORIAL
    ? historial.slice(-MAX_HISTORIAL)
    : historial;

  let respuestaBruta;
  try {
    respuestaBruta = await chatConHistorial(systemPrompt, historialTrimmed, mensajeUsuario);
  } catch (err) {
    console.warn('⚠️ Gemini API Fallback en Tutor Socrático:', err.message);
    respuestaBruta = `Para ayudarte a resolver "${mensajeUsuario.substring(0, 50)}...": ¿cuál crees que es el primer paso o dato fundamental que tenemos? Piénsalo paso a paso y cuéntame tu idea. 💪`;
  }

  // Extraer etiquetas de acción o vacíos detectados
  const quizAccion = respuestaBruta.match(/\[ACCION:GENERAR_QUIZ\|tema:(.*?)\]/);
  const vacioDetectado = respuestaBruta.match(/\[VACIO_DETECTADO\|concepto:(.*?)\]/);

  // Limpiar la respuesta para el usuario final (remover TODAS las etiquetas internas)
  const respuestaLimpia = respuestaBruta
    .replace(/\[ACCION:[^\]]*\]/g, '')
    .replace(/\[VACIO_DETECTADO[^\]]*\]/g, '')
    .trim();

  // Si se detectó un vacío, registrarlo automáticamente en Firestore
  const vacioConcepto = vacioDetectado ? vacioDetectado[1] : null;
  if (vacioConcepto) {
    try {
      await registrarVacio(
        vacioConcepto,
        estudiante.uid || 'anonimo',
        estudiante.materiaActual || 'General',
        estudiante.grupoId || 'general'
      );
    } catch (err) {
      console.error('⚠️ Error al registrar vacío:', err.message);
    }
  }

  return {
    respuesta: respuestaLimpia,
    generarQuiz: !!quizAccion,
    temaQuiz: quizAccion ? quizAccion[1] : null,
    vacioConcepto,
    estadoEmocional: detectarEstadoEmocional(mensajeUsuario)
  };
}

/**
 * Procesa una imagen de cuaderno a través del agente especializado.
 * Delegación al imageAnalyzer.
 *
 * @param {Buffer} imagenBuffer - Buffer de la imagen
 * @param {string} mimeType - Tipo MIME
 * @param {Object} estudiante - Datos del estudiante
 * @returns {Object} Análisis del ejercicio
 */
async function procesarImagenCuaderno(imagenBuffer, mimeType, estudiante = {}) {
  const materia = estudiante.materiaActual || 'Matemáticas';
  const nivel = estudiante.nivelEducativo || 'secundaria';

  const analisis = await analizarFotoCuaderno(imagenBuffer, mimeType, materia, nivel);

  // Si se detectó un concepto relacionado, registrar como vacío potencial
  if (analisis.errorDetectado && analisis.conceptoRelacionado) {
    try {
      await registrarVacio(
        analisis.conceptoRelacionado,
        estudiante.uid || 'anonimo',
        materia,
        estudiante.grupoId || 'general'
      );
    } catch (err) {
      console.error('⚠️ Error al registrar vacío desde imagen:', err.message);
    }
  }

  return analisis;
}

/**
 * Detección básica de estado emocional del estudiante por palabras clave.
 *
 * @param {string} mensaje - Mensaje del estudiante
 * @returns {string} Estado emocional detectado
 */
function detectarEstadoEmocional(mensaje) {
  const texto = mensaje.toLowerCase();

  // FIX #5 — Palabras clave en Español + Inglés + Portugués para compatibilidad internacional (XPRIZE)
  const patrones = {
    frustrado: [
      // Español
      'no entiendo', 'no le entiendo', 'ya me rendí', 'me rindo', 'es imposible',
      'no puedo', 'estoy harto', 'no me sale', 'ya no sé', 'me desespera',
      'odio esto', 'no sirvo para esto', 'es muy difícil',
      // Inglés
      'i give up', 'i quit', "i don't understand", 'i cant do this', "i can't do this",
      'this is impossible', 'i hate this', 'so frustrated', 'this is too hard',
      'i dont get it', "i don't get it",
      // Portugués
      'não entendo', 'desisto', 'não consigo', 'muito difícil'
    ],
    confundido: [
      // Español
      'no sé por dónde', 'me perdí', 'cómo empiezo', 'no sé qué hacer',
      'estoy confundido', 'no entiendo la pregunta', 'qué debo hacer',
      'cuál es el primer paso', 'help', 'ayuda',
      // Inglés
      'i am confused', "i'm confused", 'where do i start', 'i have no idea',
      'what should i do', 'i am lost', "i'm lost", 'how do i start',
      // Portugués
      'estou confuso', 'não sei por onde começar'
    ],
    curioso: [
      // Español
      'por qué pasa', 'y eso por qué', 'tiene que ver con', 'se relaciona con',
      'cuéntame más', 'qué interesante', 'en la vida real', 'para qué sirve',
      // Inglés
      'why does', 'how does this relate', 'tell me more', 'how is this used',
      'in real life', 'what is this for', 'interesting', 'i am curious',
      // Portugués
      'por que acontece', 'me conta mais'
    ],
    dominando: [
      // Español
      'ya le entendí', 'ya entendí', 'fácil', 'ponme algo más difícil',
      'quiero un reto', 'evalúame', 'ponme un quiz', 'ya lo domino',
      'eso ya me lo sé', 'siguiente tema',
      // Inglés
      'i got it', 'i understand now', 'easy', 'give me something harder',
      'i want a challenge', 'test me', 'quiz me', 'i already know this',
      'next topic', 'i mastered this',
      // Portugués
      'já entendi', 'fácil', 'me dê um desafio'
    ]
  };

  for (const [estado, palabrasClave] of Object.entries(patrones)) {
    if (palabrasClave.some(p => texto.includes(p))) {
      return estado;
    }
  }

  return 'neutral';
}

module.exports = {
  generarPromptTutorSocratico,
  procesarMensajeTutor,
  procesarImagenCuaderno,
  detectarEstadoEmocional
};
