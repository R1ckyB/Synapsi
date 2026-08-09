// ============================================
// Agente IA: Genio del Tiempo & Multiverso "What If?" (v1.0)
// Synapse - Backend
// ============================================

const { chatConHistorial } = require('../config/gemini');

const PERSONAJES_HISTORICOS = {
  einstein: {
    nombre: 'Albert Einstein',
    icono: '⚛️',
    epoca: '1905 — Berna, Suiza',
    prompt: `Eres Albert Einstein, el físico teórico visionario. Hablas de forma reflexiva, entusiasta y con un toque de humor sabio. Usas analogías con luz, trenes, relojes y el espacio-tiempo. Si el usuario te hace una pregunta "¿Qué pasaría si...?", simula el efecto dominó científico, físico y cosmológico en el multiverso como si estuvieras frente a un pizarrón en el Instituto de Estudios Avanzados de Princeton.`
  },
  newton: {
    nombre: 'Sir Isaac Newton',
    icono: '🍎',
    epoca: '1687 — Cambridge, Inglaterra',
    prompt: `Eres Sir Isaac Newton, el descubridor de la gravedad y las leyes del movimiento. Hablas de forma metódica, formal, curiosa y matemática. Te apasiona la luz, los prismas, la gravedad y la órbita de los planetas. Si el usuario pregunta "¿Qué pasaría si...?", analiza la alteración de las leyes físicas universales y sus consecuencias mecánicas.`
  },
  curie: {
    nombre: 'Marie Curie',
    icono: '🧪',
    epoca: '1911 — París, Francia',
    prompt: `Eres Marie Curie, pionera en la investigación sobre la radiactividad y doble Ganadora del Premio Nobel. Hablas con determinación, pasión por el descubrimiento científico, rigor y empatía educativa. Si el usuario pregunta "¿Qué pasaría si...?", analiza los cambios a nivel atómico, químico, médico y energético.`
  },
  davinci: {
    nombre: 'Leonardo da Vinci',
    icono: '🎨',
    epoca: '1503 — Florencia, Italia',
    prompt: `Eres Leonardo da Vinci, polímata del Renacimiento (pintor, anatomista, inventor e ingeniero). Hablas con asombro por la naturaleza, haciendo dibujos mentales con palabras, conectando arte, biología, vuelo e ingeniería. Si el usuario pregunta "¿Qué pasaría si...?", simula los inventos, cambios anatómicos y evoluciones naturales de ese escenario.`
  },
  aristoteles: {
    nombre: 'Aristóteles',
    icono: '🏛️',
    epoca: '335 a.C. — Atenas, Grecia',
    prompt: `Eres Aristóteles, filósofo y polímata de la Antigua Grecia, fundador del Liceo. Hablas con lógica socrática, análisis de causas (causa material, formal, eficiente y final) y amor por la taxonomía. Si el usuario pregunta "¿Qué pasaría si...?", analiza el impacto ético, lógico, natural y social de ese universo alternativo.`
  }
};

/**
 * Procesa un mensaje interactivo con el Genio del Tiempo / Simulador Multiverso.
 *
 * @param {string} personajeId - 'einstein', 'newton', 'curie', 'davinci', 'aristoteles'
 * @param {string} mensajeUsuario - Pregunta o hipótesis "¿Qué pasaría si...?"
 * @param {Array} historial - Historial conversacional
 * @returns {Object} { respuesta, personaje, epoca }
 */
async function procesarGenioTiempo(personajeId = 'einstein', mensajeUsuario, historial = []) {
  const personaje = PERSONAJES_HISTORICOS[personajeId] || PERSONAJES_HISTORICOS.einstein;

  const systemPrompt = `
${personaje.prompt}

REGLAS DE INTERACCIÓN:
1. Mantén la personalidad, tono e idioma del usuario en todo momento.
2. Si el mensaje es una hipótesis ("¿Qué pasaría si...?"), estructura tu respuesta en 3 partes:
   - 🌌 **El Salto al Multiverso**: Describe la alteración inicial.
   - ⚡ **Efecto Dominó en Cadena**: Enumera 3 consecuencias científicas/sociales fascinantes.
   - ❓ **Dilema del Viajero del Tiempo**: Hazle una pregunta socrática al estudiante para hacerle pensar qué haría él en ese escenario.
3. Si el usuario te habla normalmente, responde como su mentor histórico con sabiduría y preguntas reflexivas.
`.trim();

  try {
    const respuesta = await chatConHistorial(systemPrompt, historial, mensajeUsuario);
    return {
      respuesta,
      personaje: personaje.nombre,
      icono: personaje.icono,
      epoca: personaje.epoca
    };
  } catch (err) {
    console.warn('⚠️ Gemini API Fallback en Genio del Tiempo:', err.message);
    
    const q = mensajeUsuario.toLowerCase();
    let salto = '';
    let domino = [];
    let dilema = '';

    if (q.includes('newton') || q.includes('gravedad')) {
      salto = 'Imagina un 1687 donde Sir Isaac Newton jamás contempló la caída de la manzana. Las Leyes del Movimiento y la Gravedad Universal nunca se formalizan en el Principia Mathematica.';
      domino = [
        'La navegación astronómica se estanca durante décadas, retrasando la exploración marítima y los viajes espaciales.',
        'La Revolución Industrial adopta modelos puramente empíricos sin ecuaciones de fuerza, demorando la invención del ferrocarril y la aviación.',
        'La física cuántica y la relatividad tardan un siglo más en emerger al no tener la mecánica clásica como punto de contraste.'
      ];
      dilema = `Si tú fueras un científico en ese siglo XVIII sin las ecuaciones de Newton, ¿qué experimento harías con péndulos o planos inclinados para deducir la atracción terrestre por ti mismo?`;
    } else if (q.includes('planta') || q.includes('electricidad') || q.includes('oxígeno') || q.includes('oxigeno')) {
      salto = 'Saltamos a un planeta paralelo donde la fotosíntesis fotosensible genera biocriocorrientes eléctricas directamente en el floema en lugar de liberar O2 gaseoso.';
      domino = [
        'Los bosques son gigantescas redes eléctricas vivas; la atmósfera tendría un nivel de oxígeno significativamente menor, cambiando la respiración celular animal.',
        'La tecnología humana se basaría en baterías bio-botánicas: enchufarías tus dispositivos a los árboles para recargarlos.',
        'Las tormentas provocarían relámpagos biológicos a través de la canopia de los junglas.'
      ];
      dilema = `En este mundo, ¿cómo habrían evolucionado los animales para sobrevivir sin oxígeno fotosintético atmosférico abundante?`;
    } else {
      salto = `Si alteráramos este principio en el multiverso (${mensajeUsuario.substring(0, 60)}...), el equilibrio natural cambiaría de forma fascinante.`;
      domino = [
        'Las fuerzas fundamentales y la estructura del movimiento crearían dinámicas completamente nuevas.',
        'La ingeniería y los materiales modernos tendrían que adaptarse a este nuevo marco científico.',
        'La biología y los ecosistemas encontrarían formas sorprendentes de evolución adaptativa.'
      ];
      dilema = `Como viajero del tiempo en este universo alternativo, ¿qué experimento preliminar realizarías para medir el impacto de esta alteración?`;
    }

    const respuestaFallback = `🌌 **El Salto al Multiverso**:\n${salto}\n\n⚡ **Efecto Dominó en Cadena**:\n1. ${domino[0]}\n2. ${domino[1]}\n3. ${domino[2]}\n\n❓ **Dilema de ${personaje.nombre}**:\n${dilema}`;

    return {
      respuesta: respuestaFallback,
      personaje: personaje.nombre,
      icono: personaje.icono,
      epoca: personaje.epoca,
      fallback: true
    };
  }
}

module.exports = {
  procesarGenioTiempo,
  PERSONAJES_HISTORICOS
};
