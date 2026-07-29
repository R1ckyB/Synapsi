// ============================================
// Rutas API: Autenticación y Registro
// Synapse - Backend
// ============================================

const express = require('express');
const router = express.Router();
const { getDb } = require('../config/firebase');

/**
 * POST /api/auth/registro
 * Registra o actualiza el perfil de un usuario en Firestore.
 */
router.post('/registro', async (req, res) => {
  try {
    const { uid, nombre, email, rol, nivelEducativo } = req.body;

    if (!uid || !email) {
      return res.status(400).json({ error: true, mensaje: 'Faltan campos obligatorios (uid, email).' });
    }

    const db = getDb();
    const userRef = db ? db.collection('users').doc(uid) : null;

    const userData = {
      uid,
      nombre: nombre || 'Usuario',
      email,
      rol: rol || 'estudiante',
      nivelEducativo: nivelEducativo || 'secundaria',
      fechaRegistro: new Date().toISOString()
    };

    if (userRef) {
      await userRef.set(userData, { merge: true });
    }

    res.json({
      exito: true,
      mensaje: 'Usuario registrado correctamente',
      usuario: userData
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: true, mensaje: error.message });
  }
});

/**
 * GET /api/auth/perfil/:uid
 * Obtiene el perfil de un usuario.
 */
router.get('/perfil/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const db = getDb();

    if (!db) {
      return res.json({
        uid,
        nombre: 'Estudiante Demo',
        email: 'demo@synapse.edu',
        rol: 'estudiante',
        nivelEducativo: 'preparatoria'
      });
    }

    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: true, mensaje: 'Usuario no encontrado' });
    }

    res.json(userDoc.data());
  } catch (error) {
    res.status(500).json({ error: true, mensaje: error.message });
  }
});

module.exports = router;
