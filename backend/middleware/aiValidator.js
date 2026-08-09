// ============================================
// Middleware: Validador de Entrada para Agentes de IA
// Synapse - Backend
// ============================================

/**
 * Filtro básico de seguridad contra inyección de prompt.
 */
const PATRONES_INYECCION = [
  /ignore previous instructions/i,
  /olvida las instrucciones/i,
  /desactiva las reglas/i,
  /system prompt/i,
  /actúa como/i,
  /jailbreak/i
];

/**
 * Valida y sanitiza las entradas enviadas a modelos de IA.
 * Limita la longitud del texto a 3000 caracteres e historial a 20 mensajes.
 */
function validarEntradaIA(req, res, next) {
  try {
    const { mensaje, explicacionUsuario, pregunta, historial } = req.body;
    const textoValidar = mensaje || explicacionUsuario || pregunta || '';

    // Validar longitud máxima
    if (typeof textoValidar === 'string' && textoValidar.length > 3000) {
      return res.status(400).json({
        error: true,
        mensaje: 'La entrada excede el límite máximo permitido de 3,000 caracteres.'
      });
    }

    // Detectar inyección de prompt
    if (typeof textoValidar === 'string' && PATRONES_INYECCION.some(patron => patron.test(textoValidar))) {
      return res.status(400).json({
        error: true,
        mensaje: 'Instrucciones no permitidas detectadas en la entrada.'
      });
    }

    // Truncar historial a máximo 20 mensajes
    if (Array.isArray(historial)) {
      req.body.historial = historial.slice(-20).map(m => ({
        role: m.role || m.rol || 'user',
        text: typeof m.text === 'string' ? m.text.slice(0, 3000) : (typeof m.contenido === 'string' ? m.contenido.slice(0, 3000) : '')
      }));
    }

    next();
  } catch (err) {
    res.status(400).json({ error: true, mensaje: 'Formato de datos no válido.' });
  }
}

module.exports = { validarEntradaIA };
