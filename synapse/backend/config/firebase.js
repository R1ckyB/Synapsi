// ============================================
// Configuración de Firebase Admin SDK
// EduMentor - Backend
// ============================================

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let db = null;
let auth = null;

function initFirebase() {
  if (db && auth) {
    return { db, auth };
  }

  const credentialsPath = process.env.FIREBASE_CREDENTIALS_PATH || './firebase-credentials.json';
  const fullPath = path.resolve(process.cwd(), credentialsPath);

  try {
    if (fs.existsSync(fullPath)) {
      const serviceAccount = require(fullPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('🔥 Firebase Admin SDK inicializado correctamente');
    } else {
      console.warn('⚠️ No se encontró firebase-credentials.json. Ejecutando en modo desarrollo local.');
      admin.initializeApp({
        projectId: 'edumentor-dev'
      });
    }
  } catch (error) {
    console.warn('⚠️ Error al inicializar Firebase Admin:', error.message);
  }

  db = admin.firestore();
  auth = admin.auth();

  return { db, auth };
}

module.exports = { initFirebase, getDb: () => db, getAuth: () => auth };
