// ============================================
// Configuración de Firebase Admin SDK
// Synapse - Backend
// Soporta: archivo JSON o Application Default Credentials (gcloud ADC)
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
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'project-7b7f1c13-3404-4ad7-b7d';

  try {
    if (!admin.apps.length) {
      if (fs.existsSync(fullPath)) {
        // Opción 1: Archivo JSON de cuenta de servicio
        const serviceAccount = require(fullPath);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        console.log('🔥 Firebase Admin SDK inicializado con archivo de credenciales');
      } else {
        // Opción 2: Application Default Credentials (gcloud ADC)
        console.log('🔥 Usando Application Default Credentials (gcloud ADC)...');
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId: projectId
        });
        console.log(`🔥 Firebase Admin SDK inicializado con ADC — proyecto: ${projectId}`);
      }
    }

    db = admin.firestore();
    auth = admin.auth();
    console.log('✅ Firestore conectado correctamente');
  } catch (error) {
    console.warn('⚠️ Error al inicializar Firebase Admin:', error.message);
    console.warn('⚠️ Firestore y Auth no disponibles. El backend funcionará con mock data.');
    db = null;
    auth = null;
  }

  return { db, auth };
}

module.exports = { initFirebase, getDb: () => db, getAuth: () => auth };
