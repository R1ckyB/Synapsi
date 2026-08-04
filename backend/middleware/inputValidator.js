// ============================================
// Middleware: Sanitización y Validación de Input
// Synapse - Backend
// Protege los agentes de IA contra inyección de prompts y payloads maliciosos
// ============================================

// Patrones de prompt injection más comunes en español e inglés
const PATRONES_INJECTION = [
  /ignore\s+(previous|all|above|prior)\s+instructions?/i,
  /forget\s+(everything|all|previous)/i,
  /you\s+are\s+now\s+(a|an)/i,
  /act\s+as\s+(a|an)\s+(?!tutor|assistant)/i,
  /pretend\s+(to\s+be|you\s+are)/i,
  /jailbreak/i,
  /system\s*prompt/i,
  /ignora\s+(todas?\s+las?\s+)?instrucciones/i,
  /olvida\s+(todo|las\s+instrucciones)/i,
  /ahora\s+eres\s+(un|una)/i,
  /actúa\s+como\s+(un|una)\s+(?!tutor)/i,
  /<\s*script\s*>/i,
  /javascript:/i,
  /on\w+\s*=/i,            // onclick=, onerror=, etc.
];

/**
 * Limpia un string de caracteres peligrosos preservando el contenido educativo.
 * No bloquea el mensaje, solo lo sanitiza.
 *
 * @param {string} texto - Texto a sanitizar
 * @param {number} maxLength - Longitud máxima (default: 2000 chars)
 * @returns {string} Texto limpio y truncado
 */
function sanitizarTexto(texto, maxLength = 2000) {
  if (typeof texto !== 'string') return '';

  return texto
    .trim()
    .substring(0, maxLength)                          // Limitar longitud
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // XSS básico
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');                      // Event handlers inline
}

/**
 * Detecta intentos de prompt injection en el mensaje del usuario.
 *
 * @param {string} texto - Texto a analizar
 * @returns {{ tieneInjection: boolean, patron: string | null }}
 */
function detectarPromptInjection(texto) {
  for (const patron of PATRONES_INJECTION) {
    if (patron.test(texto)) {
      return { tieneInjection: true, patron: patron.toString() };
    }
  }
  return { tieneInjection: false, patron: null };
}

/**
 * Middleware de validación para el endpoint de tutoría (/api/tutoria/mensaje).
 * Valida, sanitiza y protege contra prompt injection.
 */
function validarMensajeTutoria(req, res, next) {
  const { mensaje, estudiante, historial } = req.body;

  // ── Validación de existencia ──
  if (!mensaje || typeof mensaje !== 'string') {
    return res.status(400).json({
      error: true,
      codigo: 'MENSAJE_REQUERIDO',
      mensaje: 'El campo "mensaje" es obligatorio y debe ser texto.'
    });
  }

  // ── Sanitizar mensaje ──
  const mensajeSanitizado = sanitizarTexto(mensaje, 2000);
  if (mensajeSanitizado.length === 0) {
    return res.status(400).json({
      error: true,
      codigo: 'MENSAJE_VACIO',
      mensaje: 'El mensaje no puede estar vacío.'
    });
  }

  // ── Detectar prompt injection ──
  const { tieneInjection, patron } = detectarPromptInjection(mensajeSanitizado);
  if (tieneInjection) {
    console.warn(`🚨 Prompt injection detectado | Usuario: ${req.usuario?.uid} | Patrón: ${patron}`);
    return res.status(400).json({
      error: true,
      codigo: 'CONTENIDO_NO_PERMITIDO',
      mensaje: 'Tu mensaje contiene instrucciones no permitidas. Por favor, escribe tu duda educativa directamente.'
    });
  }

  // ── Validar y sanitizar historial ──
  let historialLimpio = [];
  if (Array.isArray(historial)) {
    historialLimpio = historial
      .filter(h => h && typeof h.text === 'string' && ['user', 'model'].includes(h.role))
      .slice(-20)  // Máximo 20 mensajes de historial
      .map(h => ({
        role: h.role,
        text: sanitizarTexto(h.text, 3000)
      }));
  }

  // ── Sanitizar datos del estudiante ──
  const estudianteLimpio = {
    uid:            sanitizarTexto(estudiante?.uid || '', 100),
    nombre:         sanitizarTexto(estudiante?.nombre || 'Estudiante', 100),
    nivelEducativo: ['primaria', 'secundaria', 'preparatoria', 'universidad']
                      .includes(estudiante?.nivelEducativo) ? estudiante.nivelEducativo : 'secundaria',
    materiaActual:  sanitizarTexto(estudiante?.materiaActual || 'General', 100),
    grupoId:        sanitizarTexto(estudiante?.grupoId || 'general', 100)
  };

  // ── Pasar valores limpios al controlador ──
  req.body.mensaje    = mensajeSanitizado;
  req.body.historial  = historialLimpio;
  req.body.estudiante = estudianteLimpio;

  next();
}

/**
 * Middleware de validación para generación de quizzes.
 */
function validarGenerarQuiz(req, res, next) {
  const { tema, nivelEducativo, numPreguntas, dificultad } = req.body;

  if (!tema || typeof tema !== 'string') {
    return res.status(400).json({
      error: true,
      codigo: 'TEMA_REQUERIDO',
      mensaje: 'El campo "tema" es obligatorio.'
    });
  }

  const nivelesValidos    = ['primaria', 'secundaria', 'preparatoria', 'universidad'];
  const dificultadesValidas = ['basico', 'intermedio', 'avanzado'];

  req.body.tema          = sanitizarTexto(tema, 200);
  req.body.nivelEducativo = nivelesValidos.includes(nivelEducativo) ? nivelEducativo : 'secundaria';
  req.body.numPreguntas   = Math.min(Math.max(parseInt(numPreguntas) || 5, 3), 10); // Entre 3 y 10
  req.body.dificultad     = dificultadesValidas.includes(dificultad) ? dificultad : 'intermedio';

  next();
}

module.exports = {
  sanitizarTexto,
  detectarPromptInjection,
  validarMensajeTutoria,
  validarGenerarQuiz
};
