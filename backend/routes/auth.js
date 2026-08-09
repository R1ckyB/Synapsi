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
    let finalRol = 'estudiante';

    if (db) {
      const userRef = db.collection('usuarios').doc(uid);
      const docSnap = await userRef.get();
      if (docSnap.exists && docSnap.data().rol) {
        // Preservar rol existente para prevenir escalación arbitraria de privilegios
        finalRol = docSnap.data().rol;
      } else if (rol === 'profesor' || rol === 'estudiante') {
        finalRol = rol;
      }

      const userData = {
        uid,
        nombre: nombre || req.usuario.nombre || 'Usuario',
        email: email || req.usuario.email || '',
        rol: finalRol,
        nivelEducativo: nivelEducativo || 'secundaria',
        fechaRegistro: docSnap.exists ? docSnap.data().fechaRegistro : new Date().toISOString()
      };

      await userRef.set(userData, { merge: true });
      return res.json({ exito: true, mensaje: 'Usuario registrado correctamente', usuario: userData });
    }

    res.json({
      exito: true,
      mensaje: 'Usuario registrado correctamente (modo sin DB)',
      usuario: { uid, nombre, email, rol: rol || 'estudiante', nivelEducativo }
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: true, mensaje: error.message });
  }
});

/**
 * GET /api/auth/perfil/:uid
 * Obtiene el perfil del usuario autenticado o de un estudiante (si es profesor).
 */
router.get('/perfil/:uid', verificarToken, async (req, res) => {
  try {
    const { uid } = req.params;
    const solicitanteUid = req.usuario?.uid;
    const solicitanteRol = req.usuario?.rol;

    // Solo el propio usuario o un profesor/admin puede consultar este perfil
    if (solicitanteUid !== uid && solicitanteRol !== 'profesor' && solicitanteRol !== 'admin') {
      return res.status(403).json({ error: true, mensaje: 'No tienes permiso para consultar el perfil de otro usuario.' });
    }

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
