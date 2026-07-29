// ============================================
// Synapse Backend Server (v2.0 — Nivel Competencia XPRIZE)
// Express + Firebase + Gemini API (gemini-2.0-flash)
// ============================================

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initFirebase } = require('./config/firebase');

// Inicializar Firebase
initFirebase();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir estáticos del frontend si existen
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Logger de peticiones HTTP
app.use((req, res, next) => {
  const timestamp = new Date().toLocaleTimeString('es-MX');
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Rutas de la API
const authRouter = require('./routes/auth');
const tutoriaRouter = require('./routes/tutoria');
const quizzesRouter = require('./routes/quizzes');
const audioRouter = require('./routes/audio');
const imagenRouter = require('./routes/imagen');
const profesoresRouter = require('./routes/profesores');
const webhookRouter = require('./routes/webhook');

app.use('/api/auth', authRouter);
app.use('/api/tutoria', tutoriaRouter);
app.use('/api/quizzes', quizzesRouter);
app.use('/api/audio', audioRouter);
app.use('/api/imagen', imagenRouter);
app.use('/api/profesores', profesoresRouter);
app.use('/api/webhook', webhookRouter);

// Endpoint de verificación de salud
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    servicio: 'Synapse API Backend',
    version: '2.0.0',
    modeloIA: 'gemini-2.0-flash',
    agentes: [
      'Tutor Socrático v2 (adaptación por nivel + detección emocional)',
      'Analizador de Imágenes de Cuaderno (multimodal)',
      'Generador de Quizzes Adaptativos (dificultad progresiva)',
      'Procesador de Audio/Voz (JSON estructurado)',
      'Servicio de Vacíos de Conocimiento (analytics para profesores)'
    ],
    endpoints: {
      tutoria: 'POST /api/tutoria/mensaje',
      quizGenerar: 'POST /api/quizzes/generar',
      quizPersonalizado: 'POST /api/quizzes/personalizado',
      quizEvaluar: 'POST /api/quizzes/evaluar',
      imagenAnalizar: 'POST /api/imagen/analizar',
      imagenExplicar: 'POST /api/imagen/explicar',
      audioProcesar: 'POST /api/audio/procesar',
      profesoresVacios: 'GET /api/profesores/vacios',
      profesoresVaciosEstudiante: 'GET /api/profesores/vacios/estudiante/:uid',
      webhook: 'POST /api/webhook/whatsapp'
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
  console.log('🧠  Synapse Backend Server v2.0.0');
  console.log(`🧠  Servidor activo en: http://localhost:${PORT}`);
  console.log('🧠  Modelo IA: Gemini 2.0 Flash');
  console.log('🧠  Agentes: Tutor Socrático | Quiz Adaptativo | Imagen | Audio | Vacíos');
  console.log('🧠 ═════════════════════════════════════════════');
  console.log('');
});

module.exports = app;
