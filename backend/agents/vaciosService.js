// ============================================
// Servicio: Vacíos de Conocimiento (Knowledge Gaps)
// Synapse - Backend
// Pilar Diferenciador #3: Dashboard del Profesor
// ============================================

const { getDb } = require('../config/firebase');
const admin = require('firebase-admin'); // FIX #8 — Para FieldValue.increment y arrayUnion

const COLLECTION_VACIOS = 'vacios_conocimiento';
const COLLECTION_SESIONES = 'sesiones_tutoria';

/**
 * Registra un vacío de conocimiento detectado por el tutor socrático.
 * Incrementa el contador si ya existe, o crea uno nuevo.
 *
 * @param {string} concepto - Nombre del concepto con vacío (ej: "Tercera Ley de Newton")
 * @param {string} estudianteId - UID del estudiante
 * @param {string} materia - Materia relacionada
 * @param {string} grupoId - ID del grupo o "general" por defecto
 */
async function registrarVacio(concepto, estudianteId = 'anonimo', materia = 'General', grupoId = 'general') {
  const db = getDb();

  if (!db) {
    console.log(`📊 [Mock] Vacío registrado: "${concepto}" para estudiante ${estudianteId}`);
    return { registrado: true, mock: true };
  }

  const vacioId = `${grupoId}_${concepto.toLowerCase().replace(/\s+/g, '_')}`;
  const vacioRef = db.collection(COLLECTION_VACIOS).doc(vacioId);

  // FIX #8 — Operación atómica: elimina la race condition de get() + update() manual.
  // FieldValue.increment y arrayUnion garantizan consistencia aunque múltiples
  // instancias escriban al mismo tiempo (ej: clase en vivo con muchos estudiantes).
  await vacioRef.set({
    concepto,
    materia,
    grupoId,
    consultasTotales: admin.firestore.FieldValue.increment(1),
    consultasSemana:  admin.firestore.FieldValue.increment(1),
    estudiantesAfectados: admin.firestore.FieldValue.arrayUnion(estudianteId),
    ultimaDeteccion: new Date().toISOString()
  }, { merge: true });

  console.log(`📊 Vacío atómico registrado: "${concepto}" | Estudiante: ${estudianteId} | Grupo: ${grupoId}`);
  return { registrado: true, concepto, vacioId };
}

/**
 * Obtiene las métricas de vacíos de conocimiento para el dashboard del profesor.
 * Calcula porcentaje de dificultad basado en estudiantes afectados vs total del grupo.
 *
 * @param {string} grupoId - ID del grupo (o "general")
 * @param {number} totalEstudiantes - Total de estudiantes en el grupo (para calcular %)
 * @returns {Array} Lista de vacíos ordenados por dificultad
 */
async function obtenerVaciosGrupo(grupoId = 'general', totalEstudiantes = 30) {
  const db = getDb();

  if (!db) {
    // Mock data realista para desarrollo
    return [
      {
        tema: 'Tercera Ley de Newton (Acción y Reacción)',
        concepto: 'Tercera Ley de Newton (Acción y Reacción)',
        materia: 'Física',
        porcentaje: 68,
        porcentajeDificultad: 68,
        consultasSemana: 24,
        alumnos: 20,
        estudiantesAfectados: 20,
        tendencia: 'subiendo'
      },
      {
        tema: 'Trinomio Cuadrado Perfecto',
        concepto: 'Trinomio Cuadrado Perfecto',
        materia: 'Matemáticas',
        porcentaje: 54,
        porcentajeDificultad: 54,
        consultasSemana: 18,
        alumnos: 16,
        estudiantesAfectados: 16,
        tendencia: 'estable'
      },
      {
        tema: 'Ciclo de Krebs',
        concepto: 'Ciclo de Krebs',
        materia: 'Biología',
        porcentaje: 42,
        porcentajeDificultad: 42,
        consultasSemana: 12,
        alumnos: 13,
        estudiantesAfectados: 13,
        tendencia: 'bajando'
      }
    ];
  }

  // Intentar query con orderBy (requiere índice compuesto en Firestore)
  // Si el índice no existe, hacer fallback con ordenamiento en JS
  let snapshot;
  try {
    snapshot = await db.collection(COLLECTION_VACIOS)
      .where('grupoId', '==', grupoId)
      .orderBy('consultasSemana', 'desc')
      .limit(20)
      .get();
  } catch (indexError) {
    console.warn('⚠️ Índice compuesto no disponible en Firestore. Usando fallback con ordenamiento local.');
    snapshot = await db.collection(COLLECTION_VACIOS)
      .where('grupoId', '==', grupoId)
      .get();
  }

  const vacios = snapshot.docs.map(doc => {
    const data = doc.data();
    const numAfectados = Array.isArray(data.estudiantesAfectados)
      ? data.estudiantesAfectados.length
      : (typeof data.estudiantesAfectados === 'number' ? data.estudiantesAfectados : 1);
    const porcentaje = Math.round((numAfectados / totalEstudiantes) * 100);

    return {
      id: doc.id,
      tema: data.concepto,
      concepto: data.concepto,
      materia: data.materia,
      porcentaje: porcentaje,
      porcentajeDificultad: porcentaje,
      consultasSemana: data.consultasSemana || 0,
      consultasTotales: data.consultasTotales || 0,
      alumnos: numAfectados,
      estudiantesAfectados: numAfectados,
      ultimaDeteccion: data.ultimaDeteccion,
      tendencia: calcularTendencia(data)
    };
  });

  // Ordenar en JS como fallback seguro y limitar
  vacios.sort((a, b) => b.consultasSemana - a.consultasSemana);
  return vacios.slice(0, 20);
}

/**
 * Obtiene los vacíos específicos de un estudiante para alimentar quizzes adaptativos.
 *
 * @param {string} estudianteId - UID del estudiante
 * @returns {Array} Lista de conceptos con vacío para ese estudiante
 */
async function obtenerVaciosEstudiante(estudianteId) {
  const db = getDb();

  if (!db) {
    return [
      { concepto: 'Despeje de ecuaciones lineales', materia: 'Matemáticas', consultasTotales: 5 },
      { concepto: 'Ley de signos', materia: 'Matemáticas', consultasTotales: 3 }
    ];
  }

  let snapshot;
  try {
    snapshot = await db.collection(COLLECTION_VACIOS)
      .where('estudiantesAfectados', 'array-contains', estudianteId)
      .orderBy('consultasTotales', 'desc')
      .get();
  } catch (indexError) {
    console.warn('⚠️ Índice compuesto no disponible. Usando fallback local.');
    snapshot = await db.collection(COLLECTION_VACIOS)
      .where('estudiantesAfectados', 'array-contains', estudianteId)
      .get();
  }

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      concepto: data.concepto,
      materia: data.materia,
      consultasTotales: data.consultasTotales
    };
  });
}

/**
 * Guarda una sesión de tutoría completa en Firestore.
 *
 * @param {string} estudianteId - UID del estudiante
 * @param {string} materia - Materia de la sesión
 * @param {Array} historial - Historial de mensajes de la sesión
 * @param {Object} metadata - Metadatos adicionales (vacíos detectados, quizzes generados, etc.)
 */
async function guardarSesionTutoria(estudianteId, materia, historial = [], metadata = {}) {
  const db = getDb();

  if (!db) {
    console.log(`📝 [Mock] Sesión guardada para ${estudianteId} | Materia: ${materia} | Mensajes: ${historial.length}`);
    return { guardada: true, mock: true };
  }

  const sesionRef = db.collection(COLLECTION_SESIONES).doc();
  await sesionRef.set({
    estudianteId,
    materia,
    historial,
    vaciosDetectados: metadata.vaciosDetectados || [],
    quizzesGenerados: metadata.quizzesGenerados || 0,
    duracionMinutos: metadata.duracionMinutos || 0,
    fecha: new Date().toISOString(),
    resumen: metadata.resumen || ''
  });

  console.log(`📝 Sesión guardada: ${sesionRef.id} | Estudiante: ${estudianteId}`);
  return { guardada: true, sesionId: sesionRef.id };
}

/**
 * Resetea los contadores semanales de vacíos (ejecutar con cron cada lunes).
 */
async function resetearContadoresSemanales() {
  const db = getDb();
  if (!db) return;

  const snapshot = await db.collection(COLLECTION_VACIOS).get();
  const batch = db.batch();

  snapshot.docs.forEach(doc => {
    batch.update(doc.ref, { consultasSemana: 0 });
  });

  await batch.commit();
  console.log(`🔄 Contadores semanales reseteados para ${snapshot.size} vacíos.`);
}

/**
 * Calcula la tendencia de un vacío basándose en las consultas.
 */
function calcularTendencia(data) {
  const consultasSemana = data.consultasSemana || 0;
  const consultasTotales = data.consultasTotales || 1;
  const promedio = consultasTotales / 4; // Asumiendo 4 semanas de datos

  if (consultasSemana > promedio * 1.3) return 'subiendo';
  if (consultasSemana < promedio * 0.7) return 'bajando';
  return 'estable';
}

module.exports = {
  registrarVacio,
  obtenerVaciosGrupo,
  obtenerVaciosEstudiante,
  guardarSesionTutoria,
  resetearContadoresSemanales
};
