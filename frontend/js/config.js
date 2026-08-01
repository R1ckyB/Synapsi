// ============================================================
// config.js — Synapse Frontend Configuration
// ============================================================

const SYNAPSE_CONFIG = {
  API_BASE: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api'
    : '/api',  // En producción, misma base

  VERSION: '2.0.0',

  MATERIAS: [
    { id: 'Matemáticas', emoji: '📐', color: '#6c63ff' },
    { id: 'Física',       emoji: '⚛️', color: '#00d9b1' },
    { id: 'Química',      emoji: '🧪', color: '#ff6b6b' },
    { id: 'Historia',     emoji: '📜', color: '#ffd166' },
    { id: 'Biología',     emoji: '🧬', color: '#06d6a0' },
    { id: 'Español',      emoji: '✍️', color: '#a0a8c8' },
    { id: 'Inglés',       emoji: '🌎', color: '#4cc9f0' },
    { id: 'General',      emoji: '🔍', color: '#8b85ff' },
  ],

  NIVELES: ['primaria', 'secundaria', 'preparatoria', 'universidad'],

  PREGUNTAS_DIA: [
    '¿Cuál es la diferencia entre una variable dependiente e independiente en un experimento?',
    '¿Por qué el agua tiene mayor punto de ebullición que el metano siendo ambas moléculas pequeñas?',
    '¿Qué es la Ley de Conservación de la Energía y cómo aplica en tu vida diaria?',
    '¿En qué se diferencia un sistema de ecuaciones consistente de uno inconsistente?',
    '¿Por qué la Revolución Industrial tuvo más impacto social que la Revolución Francesa?',
    '¿Cuál es la función del ARN mensajero en la síntesis de proteínas?',
    '¿Cómo se relacionan la aceleración, la velocidad y el tiempo en el movimiento uniformemente acelerado?',
  ]
};

// Estado global de la sesión
window.SynapseState = {
  user: null,
  materiaActual: 'Matemáticas',
  historial: [],        // historial del chat actual
  chatPreguntasHoy: 0,
  quizCorrects: 0,
  quizTotal: 0,
  racha: 7,
  currentQuiz: null,
  currentQuizIndex: 0,
  mediaRecorder: null,
  audioChunks: [],
  isRecording: false,
  recordTimer: null,
  recordSeconds: 0,
  pendingImageFile: null,
};
