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
const { validarMensajeTutoria, validarGenerarQuiz } = require('./middleware/inputValidator');
const logger = require('./utils/logger');

// Inicializar Firebase
initFirebase();

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares globales ──

// FIX #1 — CORS restringido con soporte para Cloud Run y desarrollo local
const origenesPermitidos = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://synapse-backend-316597665743.us-central1.run.app'
];
app.use(cors({
  origin: function (origin, callback) {
    // Permite requests sin origin (misma origen, Postman, apps móviles, curl)
    if (!origin) return callback(null, true);
    if (origenesPermitidos.includes(origin) || origin.endsWith('.run.app')) {
      return callback(null, true);
    }
    return callback(new Error(`CORS bloqueado: origen no permitido → ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// FIX #5 — Límite global pequeño para endpoints de texto (protección DoS)
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Servir estáticos del frontend si existen
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Logger HTTP estructurado (reemplaza console.log genérico)
app.use(logger.requestLogger);

// ── Rutas de la API ──
const authRouter     = require('./routes/auth');
const tutoriaRouter  = require('./routes/tutoria');
const quizzesRouter  = require('./routes/quizzes');
const audioRouter    = require('./routes/audio');
const imagenRouter   = require('./routes/imagen');
const profesoresRouter = require('./routes/profesores');
const webhookRouter  = require('./routes/webhook');

// Rutas públicas (sin auth)
app.use('/api/auth',    express.json({ limit: '50kb' }),  limiterAuth, authRouter);
app.use('/api/webhook', express.urlencoded({ extended: true, limit: '50kb' }), webhookRouter);

// Rutas protegidas (Firebase ID Token + rate limiting + validación de input)
// FIX #5 — Las rutas de audio/imagen mantienen límite alto (base64 de archivos)
app.use('/api/audio',      express.json({ limit: '10mb' }),  limiterIA, verificarToken, audioRouter);
app.use('/api/imagen',     express.json({ limit: '10mb' }),  limiterIA, verificarToken, imagenRouter);
// El resto con límite estricto de texto
app.use('/api/tutoria',    express.json({ limit: '50kb' }),  limiterIA,       verificarToken,    validarMensajeTutoria, tutoriaRouter);
app.use('/api/quizzes',    express.json({ limit: '50kb' }),  limiterQuiz,     verificarToken,    validarGenerarQuiz,    quizzesRouter);
app.use('/api/profesores', express.json({ limit: '50kb' }),  limiterProfesor, verificarProfesor, profesoresRouter);

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
  logger.error('Error no controlado', { error: err.message, ruta: req.path, uid: req.usuario?.uid });
  res.status(err.status || 500).json({
    error: true,
    mensaje: process.env.NODE_ENV === 'development' ? err.message : 'Error interno del servidor'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  logger.info(`Synapse Backend Server v2.1.0 activo en http://localhost:${PORT}`, {
    modelo: 'gemini-2.0-flash',
    auth: 'Firebase ID Token',
    rateLimiting: 'activo',
    historialWA: 'Firestore'
  });
});

module.exports = app;

