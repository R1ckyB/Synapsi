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

// Inicializar Firebase de forma segura
try {
  initFirebase();
} catch (e) {
  console.warn('⚠️ Firebase init warning:', e.message);
}

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares globales ──

// CORS permisivo para API pública y Cloud Run
app.use(cors());

// FIX #5 — Límite global pequeño para endpoints de texto (protección DoS)
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Servir estáticos del frontend si existen
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ── Rutas amigables (Clean URLs) ──
app.get(['/app', '/dashboard', '/tutor'], (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'dashboard.html'));
});

app.get(['/profesor', '/docente'], (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'profesor.html'));
});

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

// Iniciar servidor (escuchando en 0.0.0.0 para contenedores Docker / Cloud Run)
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Synapse Backend Server v2.1.0 activo en http://0.0.0.0:${PORT}`, {
    modelo: 'gemini-2.0-flash',
    auth: 'Firebase ID Token',
    rateLimiting: 'activo',
    historialWA: 'Firestore'
  });
});

module.exports = app;

