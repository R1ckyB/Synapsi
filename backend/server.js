// ============================================
// Synapse Backend Server (v2.1 — Producción Ready)
// Express + Firebase + Gemini API (gemini-2.0-flash)
// ============================================

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initFirebase } = require('./config/firebase');
const { verificarToken, verificarProfesor } = require('./middleware/authMiddleware');
const { limiterIA, limiterQuiz, limiterAuth, limiterProfesor } = require('./middleware/rateLimiter');

// Inicializar Firebase
initFirebase();

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares globales ──
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir estáticos del frontend si existen
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Logger de peticiones HTTP
app.use((req, res, next) => {
  const timestamp = new Date().toLocaleTimeString('es-MX');
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ── Rutas de la API ──
const authRouter     = require('./routes/auth');
const tutoriaRouter  = require('./routes/tutoria');
const quizzesRouter  = require('./routes/quizzes');
const audioRouter    = require('./routes/audio');
const imagenRouter   = require('./routes/imagen');
const profesoresRouter = require('./routes/profesores');
const webhookRouter  = require('./routes/webhook');

// Rutas públicas (sin auth)
app.use('/api/auth',    limiterAuth, authRouter);
app.use('/api/webhook', webhookRouter); // Twilio no envía token de Firebase

// Rutas protegidas (requieren Firebase ID Token + rate limiting)
app.use('/api/tutoria',    limiterIA,       verificarToken,    tutoriaRouter);
app.use('/api/quizzes',    limiterQuiz,     verificarToken,    quizzesRouter);
app.use('/api/audio',      limiterIA,       verificarToken,    audioRouter);
app.use('/api/imagen',     limiterIA,       verificarToken,    imagenRouter);
app.use('/api/profesores', limiterProfesor, verificarProfesor, profesoresRouter);

// Endpoint de verificación de salud
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    servicio: 'Synapse API Backend',
    version: '2.1.0',
    modeloIA: 'gemini-2.0-flash',
    seguridad: {
      autenticacion: 'Firebase ID Token (Bearer)',
      rateLimiting: 'Activo — límites por ruta e IP',
      historialWhatsApp: 'Firestore (persistente)'
    },
    agentes: [
      'Tutor Socrático v2 (adaptación por nivel + detección emocional)',
      'Analizador de Imágenes de Cuaderno (multimodal)',
      'Generador de Quizzes Adaptativos (dificultad progresiva)',
      'Procesador de Audio/Voz (JSON estructurado)',
      'Servicio de Vacíos de Conocimiento (analytics para profesores)'
    ],
    endpoints: {
      tutoria:    'POST /api/tutoria/mensaje         [auth + 20 req/min]',
      quizzes:    'POST /api/quizzes/generar         [auth + 15 req/min]',
      imagen:     'POST /api/imagen/analizar         [auth + 20 req/min]',
      audio:      'POST /api/audio/procesar          [auth + 20 req/min]',
      profesores: 'GET  /api/profesores/vacios       [auth profesor + 30 req/min]',
      webhook:    'POST /api/webhook/whatsapp        [público — Twilio]'
    },
    timestamp: new Date().toISOString()
  });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('❌ Error no controlado:', err.message);
  res.status(err.status || 500).json({
    error: true,
    mensaje: process.env.NODE_ENV === 'development' ? err.message : 'Error interno del servidor'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log('');
  console.log('🧠 ═════════════════════════════════════════════');
  console.log('🧠  Synapse Backend Server v2.1.0');
  console.log(`🧠  Servidor activo en: http://localhost:${PORT}`);
  console.log('🧠  Modelo IA: Gemini 2.0 Flash');
  console.log('🧠  🔒 Auth: Firebase ID Token activo');
  console.log('🧠  🚦 Rate Limiting: Activo por ruta');
  console.log('🧠  💾 Historial WA: Firestore persistente');
  console.log('🧠  Agentes: Tutor Socrático | Quiz | Imagen | Audio | Vacíos');
  console.log('🧠 ═════════════════════════════════════════════');
  console.log('');
});

module.exports = app;

