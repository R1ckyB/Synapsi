// ============================================
// Servicio: Vacíos de Conocimiento (Knowledge Gaps)
// Synapse - Backend
// Pilar Diferenciador #3: Dashboard del Profesor
// ============================================

const { getDb } = require('../config/firebase');

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
  const vacioDoc = await vacioRef.get();

  if (vacioDoc.exists) {
    // Incrementar contador y agregar estudiante si no está ya
    const data = vacioDoc.data();
    const estudiantesSet = new Set(data.estudiantesAfectados || []);
    estudiantesSet.add(estudianteId);

    await vacioRef.update({
      consultasTotales: (data.consultasTotales || 0) + 1,
      consultasSemana: (data.consultasSemana || 0) + 1,
      estudiantesAfectados: Array.from(estudiantesSet),
      ultimaDeteccion: new Date().toISOString()
    });
  } else {
    // Crear nuevo registro de vacío
    await vacioRef.set({
      concepto,
      materia,
      grupoId,
      consultasTotales: 1,
      consultasSemana: 1,
      estudiantesAfectados: [estudianteId],
      porcentajeDificultad: 0, // Se calcula al consultar
      primeraDeteccion: new Date().toISOString(),
      ultimaDeteccion: new Date().toISOString()
    });
  }

  console.log(`📊 Vacío registrado: "${concepto}" | Estudiante: ${estudianteId} | Grupo: ${grupoId}`);
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
        concepto: 'Tercera Ley de Newton (Acción y Reacción)',
        materia: 'Física',
        porcentajeDificultad: 68,
        consultasSemana: 24,
        estudiantesAfectados: 20,
        tendencia: 'subiendo'
      },
      {
        concepto: 'Trinomio Cuadrado Perfecto',
        materia: 'Matemáticas',
        porcentajeDificultad: 54,
        consultasSemana: 18,
        estudiantesAfectados: 16,
        tendencia: 'estable'
      },
      {
        concepto: 'Ciclo de Krebs',
        materia: 'Biología',
        porcentajeDificultad: 42,
        consultasSemana: 12,
        estudiantesAfectados: 13,
        tendencia: 'bajando'
      }
    ];
  }

  const snapshot = await db.collection(COLLECTION_VACIOS)
    .where('grupoId', '==', grupoId)
    .orderBy('consultasSemana', 'desc')
    .limit(20)
    .get();

  const vacios = snapshot.docs.map(doc => {
    const data = doc.data();
    const numAfectados = (data.estudiantesAfectados || []).length;
    const porcentaje = Math.round((numAfectados / totalEstudiantes) * 100);

    return {
      id: doc.id,
      concepto: data.concepto,
      materia: data.materia,
      porcentajeDificultad: porcentaje,
      consultasSemana: data.consultasSemana || 0,
      consultasTotales: data.consultasTotales || 0,
      estudiantesAfectados: numAfectados,
      ultimaDeteccion: data.ultimaDeteccion,
      tendencia: calcularTendencia(data)
    };
  });

  return vacios;
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

  const snapshot = await db.collection(COLLECTION_VACIOS)
    .where('estudiantesAfectados', 'array-contains', estudianteId)
    .orderBy('consultasTotales', 'desc')
    .get();

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
