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

  PREGUNTAS_DIA: {
    'Matemáticas': [
      '¿En qué se diferencia un sistema de ecuaciones consistente de uno inconsistente?',
      '¿Cómo se calcula la pendiente de una recta dada su ecuación?',
      '¿Cuál es la diferencia entre una ecuación cuadrática y una lineal?'
    ],
    'Física': [
      '¿Cómo se relacionan la aceleración, la velocidad y el tiempo en el movimiento uniforme?',
      '¿Qué es la Ley de Conservación de la Energía y cómo aplica en tu vida diaria?',
      '¿Por qué los objetos caen a la misma velocidad en el vacío independientemente de su masa?'
    ],
    'Química': [
      '¿Por qué el agua tiene mayor punto de ebullición que el metano siendo ambas moléculas pequeñas?',
      '¿Cuál es la diferencia entre un enlace iónico y uno covalente?',
      '¿Cómo afecta la temperatura a la velocidad de una reacción química?'
    ],
    'Historia': [
      '¿Por qué la Revolución Industrial tuvo más impacto social que la Revolución Francesa?',
      '¿Cuáles fueron las causas principales de la Primera Guerra Mundial?',
      '¿Cómo influyó la imprenta de Gutenberg en la difusión del conocimiento en Europa?'
    ],
    'Biología': [
      '¿Cuál es la función del ARN mensajero en la síntesis de proteínas?',
      '¿En qué se diferencian las células procariotas de las eucariotas?',
      '¿Cómo funciona la fotosíntesis en las plantas?'
    ],
    'Español': [
      '¿Cuál es la diferencia entre un texto argumentativo y uno expositivo?',
      '¿Cómo se identifican la idea principal y las secundarias en un párrafo?',
      '¿Qué son las metáforas y las analogías en un texto literario?'
    ],
    'Inglés': [
      'When should you use Present Perfect instead of Simple Past in English?',
      'What is the difference between defining and non-defining relative clauses?',
      'How do modal verbs change the tone of a sentence?'
    ],
    'General': [
      '¿Cuál es la diferencia entre una variable dependiente e independiente en un experimento?',
      '¿Cómo estructurar un método de estudio efectivo para exámenes?',
      '¿En qué consiste el método científico y cuáles son sus pasos principales?'
    ]
  }
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
