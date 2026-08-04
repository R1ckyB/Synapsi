// ============================================
// Servicio: Perfiles de Estudiantes WhatsApp
// Synapse - Backend
// Guarda nivel educativo y materia actual por número de WhatsApp en Firestore
// ============================================

const { getDb } = require('../config/firebase');

const COLLECTION_PERFILES_WA = 'perfiles_whatsapp';
const NIVELES_VALIDOS = ['primaria', 'secundaria', 'preparatoria', 'universidad'];

/** Caché en memoria para el proceso actual */
const cachPerfiles = new Map();

/**
 * Obtiene el perfil de un estudiante de WhatsApp.
 * Si no existe, retorna un perfil default (sin nivel configurado).
 *
 * @param {string} remitente - Número de WhatsApp (ej: whatsapp:+521234567890)
 * @param {string} nombre    - Nombre de perfil de WhatsApp
 * @returns {Object} Perfil del estudiante
 */
async function obtenerPerfil(remitente, nombre = 'Estudiante') {
  // 1. Caché en memoria
  if (cachPerfiles.has(remitente)) {
    return cachPerfiles.get(remitente);
  }

  const db = getDb();
  if (db) {
    try {
      const docId = remitente.replace(/[^a-zA-Z0-9]/g, '_');
      const doc = await db.collection(COLLECTION_PERFILES_WA).doc(docId).get();

      if (doc.exists) {
        const perfil = doc.data();
        cachPerfiles.set(remitente, perfil);
        return perfil;
      }
    } catch (err) {
      console.warn('⚠️ No se pudo cargar perfil de Firestore:', err.message);
    }
  }

  // 2. Perfil default (nuevo usuario)
  const perfilDefault = {
    remitente,
    nombre,
    nivelEducativo: null,     // null indica que aún no configuró su nivel
    materiaActual: 'General',
    grupoId: 'whatsapp',
    configurado: false,
    fechaRegistro: new Date().toISOString()
  };

  cachPerfiles.set(remitente, perfilDefault);
  return perfilDefault;
}

/**
 * Actualiza uno o más campos del perfil de un estudiante de WhatsApp.
 *
 * @param {string} remitente - Número de WhatsApp
 * @param {Object} cambios   - Campos a actualizar (ej: { nivelEducativo: 'preparatoria' })
 * @returns {Object} Perfil actualizado
 */
async function actualizarPerfil(remitente, cambios = {}) {
  const perfilActual = await obtenerPerfil(remitente);
  const perfilActualizado = {
    ...perfilActual,
    ...cambios,
    ultimaActualizacion: new Date().toISOString()
  };

  // Marcar como configurado si ya tiene nivel
  if (perfilActualizado.nivelEducativo) {
    perfilActualizado.configurado = true;
  }

  // Actualizar caché
  cachPerfiles.set(remitente, perfilActualizado);

  // Persistir en Firestore
  const db = getDb();
  if (db) {
    const docId = remitente.replace(/[^a-zA-Z0-9]/g, '_');
    db.collection(COLLECTION_PERFILES_WA).doc(docId).set(perfilActualizado, { merge: true })
      .catch(err => console.warn('⚠️ No se pudo guardar perfil:', err.message));
  }

  return perfilActualizado;
}

/**
 * Detecta si el mensaje del usuario es un comando de configuración de perfil.
 * Comandos soportados:
 *   - "nivel primaria" / "nivel secundaria" / "nivel preparatoria" / "nivel universidad"
 *   - "materia matematicas" / "materia fisica" / etc.
 *
 * @param {string} texto   - Mensaje del usuario (en minúsculas)
 * @param {string} remitente
 * @returns {{ esComando: boolean, respuesta?: string }}
 */
async function procesarComandoPerfil(texto, remitente) {
  // ── Detectar "nivel <valor>" ──
  const matchNivel = texto.match(/^nivel\s+(.+)$/i);
  if (matchNivel) {
    const nivelSolicitado = matchNivel[1].trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // eliminar acentos

    const nivelMapeado = NIVELES_VALIDOS.find(n =>
      n.startsWith(nivelSolicitado.substring(0, 4))
    );

    if (nivelMapeado) {
      await actualizarPerfil(remitente, { nivelEducativo: nivelMapeado });
      return {
        esComando: true,
        respuesta: `✅ ¡Perfecto! Configuré tu nivel como *${nivelMapeado}*.\n\n📚 Ahora puedo adaptar mi lenguaje y dificultad exactamente para ti.\n\n¿Sobre qué tema quieres estudiar hoy? También puedes escribir *"materia [nombre]"* para indicarme la materia.`
      };
    } else {
      return {
        esComando: true,
        respuesta: `❓ No reconocí ese nivel. Los niveles válidos son:\n\n• *primaria*\n• *secundaria*\n• *preparatoria*\n• *universidad*\n\nEjemplo: escribe *"nivel preparatoria"*`
      };
    }
  }

  // ── Detectar "materia <nombre>" ──
  const matchMateria = texto.match(/^materia\s+(.+)$/i);
  if (matchMateria) {
    const materiaSolicitada = matchMateria[1].trim();
    // Capitalizar primera letra
    const materiaFinal = materiaSolicitada.charAt(0).toUpperCase() + materiaSolicitada.slice(1);
    await actualizarPerfil(remitente, { materiaActual: materiaFinal });
    return {
      esComando: true,
      respuesta: `✅ Entendido, ahora trabajaremos en *${materiaFinal}*.\n\n🧠 ¡Cuéntame tu duda y empezamos!`
    };
  }

  return { esComando: false };
}

/**
 * Genera el mensaje de bienvenida / onboarding para un usuario nuevo.
 *
 * @param {string} nombre - Nombre de perfil de WhatsApp
 * @returns {string} Mensaje de bienvenida
 */
function mensajeBienvenida(nombre) {
  return `🧠 *¡Hola, ${nombre}! Soy Synapse, tu tutor IA.*\n\nAntes de empezar, necesito saber tu nivel educativo para adaptar mis explicaciones.\n\n📚 Escribe uno de estos:\n• *nivel primaria*\n• *nivel secundaria*\n• *nivel preparatoria*\n• *nivel universidad*\n\n_(También puedes ignorar esto y preguntarme directamente, usaré el nivel secundaria por defecto)_`;
}

module.exports = {
  obtenerPerfil,
  actualizarPerfil,
  procesarComandoPerfil,
  mensajeBienvenida,
  NIVELES_VALIDOS
};
