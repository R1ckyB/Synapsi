// ============================================
// Rutas API: Autenticación y Registro
// Synapse - Backend
// ============================================

const express = require('express');
const router = express.Router();
const { getDb } = require('../config/firebase');

const { verificarToken } = require('../middleware/authMiddleware');

/**
 * POST /api/auth/registro
 * Registra o actualiza el perfil de un usuario en Firestore.
 */
router.post('/registro', verificarToken, async (req, res) => {
  try {
    const uid = req.usuario.uid; // Usar el UID verificado del token
    const { nombre, email, rol, nivelEducativo } = req.body;

    const db = getDb();
    const userRef = db ? db.collection('usuarios').doc(uid) : null;

    const userData = {
      uid,
      nombre: nombre || req.usuario.nombre || 'Usuario',
      email: email || req.usuario.email || '',
      rol: rol || req.usuario.rol || 'estudiante',
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
router.get('/perfil/:uid', verificarToken, async (req, res) => {
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

    const userDoc = await db.collection('usuarios').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: true, mensaje: 'Usuario no encontrado' });
    }

    res.json(userDoc.data());
  } catch (error) {
    res.status(500).json({ error: true, mensaje: error.message });
  }
});

module.exports = router;
