// ============================================
// Tests Unitarios: Agentes de Synapse
// Synapse - Backend
// Usa el módulo nativo 'assert' de Node.js (sin dependencias externas)
// Ejecutar con: node backend/tests/agentes.test.js
// ============================================

const assert = require('assert');

// ── Resultados del test runner ──
let passed = 0;
let failed = 0;
const failures = [];

/**
 * Ejecuta un test individual y registra el resultado.
 */
async function test(nombre, fn) {
  try {
    await fn();
    console.log(`  ✅ ${nombre}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ ${nombre}`);
    console.log(`     → ${err.message}`);
    failed++;
    failures.push({ nombre, error: err.message });
  }
}

// ════════════════════════════════════════════════════════
// SUITE 1: Tutor Socrático — detectarEstadoEmocional
// ════════════════════════════════════════════════════════
async function testTutorSocratico() {
  console.log('\n📋 Suite 1: Tutor Socrático — detectarEstadoEmocional');

  const { detectarEstadoEmocional } = require('./agents/tutorSocratico');

  await test('Detecta frustración con "no entiendo"', () => {
    assert.strictEqual(detectarEstadoEmocional('no entiendo nada de esto'), 'frustrado');
  });

  await test('Detecta frustración con "me rindo"', () => {
    assert.strictEqual(detectarEstadoEmocional('ya me rendí, es imposible'), 'frustrado');
  });

  await test('Detecta confusión con "me perdí"', () => {
    assert.strictEqual(detectarEstadoEmocional('me perdí, no sé por dónde empezar'), 'confundido');
  });

  await test('Detecta curiosidad con "para qué sirve"', () => {
    assert.strictEqual(detectarEstadoEmocional('para qué sirve esto en la vida real'), 'curioso');
  });

  await test('Detecta dominio con "ponme algo más difícil"', () => {
    assert.strictEqual(detectarEstadoEmocional('ya le entendí, ponme algo más difícil'), 'dominando');
  });

  await test('Retorna neutral para mensajes ordinarios', () => {
    assert.strictEqual(detectarEstadoEmocional('¿Cómo se calcula el área de un triángulo?'), 'neutral');
  });

  await test('Maneja mensajes vacíos sin crash', () => {
    assert.strictEqual(detectarEstadoEmocional(''), 'neutral');
  });
}

// ════════════════════════════════════════════════════════
// SUITE 2: Quiz Generator — evaluarQuiz
// ════════════════════════════════════════════════════════
async function testQuizGenerator() {
  console.log('\n📋 Suite 2: Quiz Generator — evaluarQuiz');

  const { evaluarQuiz } = require('./agents/quizGenerator');

  const quizMock = {
    preguntas: [
      { id: 1, pregunta: 'Pregunta 1', opciones: ['A', 'B', 'C', 'D'], respuestaCorrectaIndex: 0, explicacion: 'La A es correcta.', conceptoEvaluado: 'Concepto A' },
      { id: 2, pregunta: 'Pregunta 2', opciones: ['A', 'B', 'C', 'D'], respuestaCorrectaIndex: 2, explicacion: 'La C es correcta.', conceptoEvaluado: 'Concepto B' },
      { id: 3, pregunta: 'Pregunta 3', opciones: ['A', 'B', 'C', 'D'], respuestaCorrectaIndex: 1, explicacion: 'La B es correcta.', conceptoEvaluado: 'Concepto C' },
    ]
  };

  await test('100% de aciertos da porcentaje 100', () => {
    const resultado = evaluarQuiz(quizMock, [0, 2, 1]);
    assert.strictEqual(resultado.porcentaje, 100);
    assert.strictEqual(resultado.correctas, 3);
  });

  await test('0% de aciertos da porcentaje 0', () => {
    const resultado = evaluarQuiz(quizMock, [1, 0, 0]);
    assert.strictEqual(resultado.porcentaje, 0);
    assert.strictEqual(resultado.correctas, 0);
  });

  await test('1 de 3 correctas da ~33%', () => {
    const resultado = evaluarQuiz(quizMock, [0, 0, 0]);
    assert.strictEqual(resultado.correctas, 1);
    assert.strictEqual(resultado.porcentaje, 33);
  });

  await test('Identifica conceptos a reforzar en errores', () => {
    const resultado = evaluarQuiz(quizMock, [0, 0, 0]); // Solo la 1 correcta
    assert.ok(resultado.conceptosReforzar.includes('Concepto B'), 'Debe incluir Concepto B');
    assert.ok(resultado.conceptosReforzar.includes('Concepto C'), 'Debe incluir Concepto C');
  });

  await test('Nivel siguiente es "avanzado" con >= 80%', () => {
    const resultado = evaluarQuiz(quizMock, [0, 2, 1]);
    assert.strictEqual(resultado.nivelSiguiente, 'avanzado');
  });

  await test('Nivel siguiente es "basico" con < 50%', () => {
    const resultado = evaluarQuiz(quizMock, [1, 0, 0]);
    assert.strictEqual(resultado.nivelSiguiente, 'basico');
  });

  await test('Quiz vacío no genera crash', () => {
    const resultado = evaluarQuiz({ preguntas: [] }, []);
    assert.strictEqual(resultado.porcentaje, 0);
    assert.strictEqual(resultado.correctas, 0);
  });
}

// ════════════════════════════════════════════════════════
// SUITE 3: Rate Limiter — lógica de contadores
// ════════════════════════════════════════════════════════
async function testRateLimiter() {
  console.log('\n📋 Suite 3: Rate Limiter — lógica de contadores');

  const { crearRateLimiter } = require('./middleware/rateLimiter');

  await test('Permite peticiones dentro del límite', async () => {
    const limiter = crearRateLimiter({ max: 3, ventanaMs: 5000 });
    const ip = '10.0.0.1';
    let rechazado = false;

    for (let i = 0; i < 3; i++) {
      const req = { ip, headers: {} };
      const res = {
        setHeader: () => {},
        status: (code) => ({ json: () => { rechazado = true; } })
      };
      limiter(req, res, () => {});
    }

    assert.strictEqual(rechazado, false, 'No debería rechazar dentro del límite');
  });

  await test('Rechaza petición #(max+1)', async () => {
    const limiter = crearRateLimiter({ max: 2, ventanaMs: 5000 });
    const ip = '10.0.0.2';
    let rechazado = false;
    let codigoHTTP = 0;

    for (let i = 0; i < 3; i++) {
      const req = { ip, headers: {} };
      const res = {
        setHeader: () => {},
        status: (code) => {
          codigoHTTP = code;
          return { json: () => { rechazado = true; } };
        }
      };
      limiter(req, res, () => {});
    }

    assert.strictEqual(rechazado, true, 'Debería rechazar la petición extra');
    assert.strictEqual(codigoHTTP, 429, 'Debe responder con HTTP 429');
  });
}

// ════════════════════════════════════════════════════════
// SUITE 4: Perfil WhatsApp — procesarComandoPerfil
// ════════════════════════════════════════════════════════
async function testPerfilWhatsapp() {
  console.log('\n📋 Suite 4: Perfil WhatsApp — procesarComandoPerfil (mock Firestore)');

  // Parchear getDb para que devuelva null (modo mock)
  const firebase = require('./config/firebase');
  const getDbOriginal = firebase.getDb;
  firebase.getDb = () => null;

  const { procesarComandoPerfil } = require('./services/perfilWhatsappService');

  await test('Detecta comando "nivel secundaria"', async () => {
    const resultado = await procesarComandoPerfil('nivel secundaria', 'whatsapp:+521111111111');
    assert.strictEqual(resultado.esComando, true, 'Debe ser un comando');
    assert.ok(resultado.respuesta.includes('secundaria'), 'Respuesta debe mencionar el nivel');
  });

  await test('Detecta comando "nivel preparatoria" (sin acento)', async () => {
    const resultado = await procesarComandoPerfil('nivel preparatoria', 'whatsapp:+522222222222');
    assert.strictEqual(resultado.esComando, true);
  });

  await test('Detecta nivel inválido y sugiere opciones', async () => {
    const resultado = await procesarComandoPerfil('nivel masters', 'whatsapp:+523333333333');
    assert.strictEqual(resultado.esComando, true);
    assert.ok(resultado.respuesta.includes('No reconocí'), 'Debe indicar nivel inválido');
  });

  await test('Detecta comando "materia Física"', async () => {
    const resultado = await procesarComandoPerfil('materia Física', 'whatsapp:+524444444444');
    assert.strictEqual(resultado.esComando, true);
    assert.ok(resultado.respuesta.includes('Física'), 'Debe confirmar la materia');
  });

  await test('No detecta comandos en mensajes ordinarios', async () => {
    const resultado = await procesarComandoPerfil('¿Cómo se hace una integral?', 'whatsapp:+525555555555');
    assert.strictEqual(resultado.esComando, false);
  });

  // Restaurar getDb original
  firebase.getDb = getDbOriginal;
}

// ════════════════════════════════════════════════════════
// RUNNER PRINCIPAL
// ════════════════════════════════════════════════════════
async function run() {
  console.log('');
  console.log('🧠 ═══════════════════════════════════════════════');
  console.log('🧠  Synapse — Test Suite (Node assert nativo)');
  console.log('🧠 ═══════════════════════════════════════════════');

  await testTutorSocratico();
  await testQuizGenerator();
  await testRateLimiter();
  await testPerfilWhatsapp();

  // ── Resumen final ──
  console.log('\n' + '─'.repeat(50));
  console.log(`✅ Pasados:  ${passed}`);
  console.log(`❌ Fallados: ${failed}`);
  console.log(`📊 Total:    ${passed + failed}`);

  if (failures.length > 0) {
    console.log('\n⚠️  Tests fallidos:');
    failures.forEach(f => console.log(`   • ${f.nombre}: ${f.error}`));
  }

  console.log('─'.repeat(50) + '\n');

  // Salir con código de error si hay fallos (útil para CI)
  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('\n💥 Error fatal en el test runner:', err);
  process.exit(1);
});
