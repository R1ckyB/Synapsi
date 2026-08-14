// ============================================================
// auth.js — Login / Register Logic (Sin Firebase SDK — vía API)
// ============================================================

/* ── STATE ─────────────────────────────────────────────── */
let selectedRole  = 'estudiante';
let selectedNivel = 'secundaria';

/* ── TAB SWITCH ─────────────────────────────────────────── */
function switchTab(tab) {
  const isLogin = tab === 'login';

  document.getElementById('tab-login').classList.toggle('active', isLogin);
  document.getElementById('tab-register').classList.toggle('active', !isLogin);
  document.getElementById('form-login').classList.toggle('hidden', !isLogin);
  document.getElementById('form-register').classList.toggle('hidden', isLogin);

  const sub = document.getElementById('auth-sub-text');
  const h2  = document.querySelector('.auth-title');
  if (isLogin) {
    sub.textContent = 'Inicia sesión para continuar tu aprendizaje';
    h2.textContent  = 'Bienvenido de vuelta 👋';
  } else {
    sub.textContent = 'Crea tu cuenta gratuita en segundos';
    h2.textContent  = 'Únete a Synapse 🚀';
  }
}

/* ── ROLE SELECTOR ───────────────────────────────────────────── */
function selectRole(role) {
  selectedRole = role;
  document.getElementById('role-estudiante').classList.toggle('selected', role === 'estudiante');
  document.getElementById('role-profesor').classList.toggle('selected', role === 'profesor');

  // Ocultar nivel educativo y código de clase para profesores
  const nivelGrp = document.getElementById('nivel-group');
  const codigoGrp = document.getElementById('codigo-grupo-group');
  if (nivelGrp)  nivelGrp.style.display  = role === 'profesor' ? 'none' : 'flex';
  if (codigoGrp) codigoGrp.style.display = role === 'profesor' ? 'none' : 'flex';
}

/* ── NIVEL SELECTOR ─────────────────────────────────────── */
function selectNivel(btn) {
  document.querySelectorAll('.nivel-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  selectedNivel = btn.dataset.nivel;
}

/* ── TOGGLE PASSWORD ──────────────────────────────────────── */
function togglePwd(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isText = input.type === 'text';
  input.type = isText ? 'password' : 'text';
  btn.textContent = isText ? '👁️' : '🙈';
}

/* ── HELPER: gestionar estado del botón de login ───────────────── */
function setLoginBtn(loading) {
  const btn = document.getElementById('btn-login');
  const txt = document.getElementById('btn-login-text');
  const spn = document.getElementById('btn-login-spinner');
  if (!btn) return;
  btn.disabled = loading;
  if (txt) txt.textContent = loading ? 'Iniciando sesión...' : 'Iniciar sesión';
  if (spn) spn.classList.toggle('hidden', !loading);
}

/* ── HELPER: consultar perfil desde backend (compartido por email y Google) ─ */
async function consultarPerfilBackend(uid, idToken) {
  try {
    const res = await fetch(`${SYNAPSE_CONFIG.API_BASE}/auth/perfil/${uid}`, {
      headers: { 'Authorization': `Bearer ${idToken}` }
    });
    if (res.ok) return await res.json();
  } catch (_) { /* backend offline */ }
  return loadLocal('user') || {};
}

/* ── LOGIN ───────────────────────────────────────────────── */
async function handleLogin(event) {
  event.preventDefault();
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) { showToast('Completa todos los campos', 'error'); return; }

  // Firebase no disponible → modo demo directamente
  if (typeof auth === 'undefined') {
    handleDemoLogin(email);
    return;
  }

  setLoginBtn(true);

  try {
    const result      = await auth.signInWithEmailAndPassword(email, password);
    const firebaseUser = result.user;
    const idToken     = await firebaseUser.getIdToken().catch(() => '');

    // Consultar perfil completo (rol, nivelPorMateria, diagnosticoHecho, grupoId)
    const perfil = await consultarPerfilBackend(firebaseUser.uid, idToken);

    const user = {
      uid:              firebaseUser.uid,
      nombre:           firebaseUser.displayName || email.split('@')[0],
      email:            firebaseUser.email,
      foto:             firebaseUser.photoURL,
      rol:              perfil.rol              || 'estudiante',
      nivelEducativo:   perfil.nivelEducativo   || 'secundaria',
      nivelPorMateria:  perfil.nivelPorMateria  || null,
      diagnosticoHecho: perfil.diagnosticoHecho || false,
      grupoId:          perfil.grupoId          || null,
      grupoNombre:      perfil.grupoNombre       || null
    };

    saveLocal('user', user);
    if (idToken) {
      saveLocal('token',   idToken);
      saveLocal('idToken', idToken);
    }

    showToast(`¡Bienvenido, ${user.nombre}! 🎉`, 'success');
    setTimeout(() => {
      window.location.href = user.rol === 'profesor' ? 'profesor.html' : 'dashboard.html';
    }, 600);

  } catch (err) {
    // FIX: mostrar error claro, nunca caer a modo demo
    const errorMessages = {
      'auth/wrong-password':         'Contraseña incorrecta',
      'auth/invalid-credential':     'Credenciales inválidas. Verifica correo y contraseña.',
      'auth/user-not-found':         'Usuario no encontrado. Revisa tu correo o créate una cuenta.',
      'auth/invalid-email':          'Correo electrónico inválido.',
      'auth/user-disabled':          'Esta cuenta ha sido deshabilitada.',
      'auth/too-many-requests':      'Demasiados intentos fallidos. Intenta más tarde.',
      'auth/network-request-failed': 'Sin conexión. Verifica tu internet.'
    };
    const msg = errorMessages[err.code] || err.message || 'Error al iniciar sesión';
    showToast(msg, 'error');
  } finally {
    // FIX: siempre rehabilitar el botón, tanto en éxito como en error
    setLoginBtn(false);
  }
}

/* ── DEMO LOGIN (sin backend) ────────────────────────────── */
function handleDemoLogin(email = 'demo@synapse.edu') {
  const demoUser = {
    uid: 'demo-' + Date.now(),
    nombre: email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1),
    email,
    rol: email.includes('prof') ? 'profesor' : 'estudiante',
    nivelEducativo: 'secundaria',
    grupoId: 'DEMO12',
    materiaActual: 'Matemáticas',
    racha: 7,
    demo: true
  };
  saveLocal('user', demoUser);
  saveLocal('token', 'demo-token');
  saveLocal('idToken', 'demo-token');
  showToast('🎭 Modo demo — sesión iniciada', 'info', 2000);
  setTimeout(() => {
    window.location.href = demoUser.rol === 'profesor' ? 'profesor.html' : 'dashboard.html';
  }, 800);
}

/* ── REGISTER ────────────────────────────────────────────── */
async function handleRegister(event) {
  event.preventDefault();
  const nombre   = document.getElementById('reg-name').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;

  if (!nombre || !email || !password) { showToast('Completa todos los campos', 'error'); return; }
  if (password.length < 8) {
    document.getElementById('reg-pwd-err').classList.add('show');
    document.getElementById('reg-password').classList.add('error');
    return;
  }
  document.getElementById('reg-pwd-err').classList.remove('show');
  document.getElementById('reg-password').classList.remove('error');

  const btn = document.getElementById('btn-register');
  const txt = document.getElementById('btn-reg-text');
  const spn = document.getElementById('btn-reg-spinner');
  btn.disabled = true;
  txt.textContent = 'Creando cuenta...';
  spn.classList.remove('hidden');

  try {
    // Crear cuenta con Firebase Auth
    const result = await auth.createUserWithEmailAndPassword(email, password);
    const firebaseUser = result.user;

    // Actualizar displayName
    await firebaseUser.updateProfile({ displayName: nombre });

    const idToken = await firebaseUser.getIdToken();

    const user = {
      uid:            firebaseUser.uid,
      nombre,
      email,
      rol:            selectedRole,
      nivelEducativo: selectedRole === 'estudiante' ? selectedNivel : null,
    };

    // Guardar perfil en backend (opcional)
    try {
      await apiPost('/auth/registro', { ...user, uid: firebaseUser.uid });
    } catch (e) { /* ignore if backend offline */ }

    saveLocal('user', user);
    // FIX: guardar en AMBAS claves que usa el authGuard
    saveLocal('token',   idToken);
    saveLocal('idToken', idToken);

    // Si el estudiante ingresó un código de clase, unirse al grupo automáticamente
    const codigoGrupoInput = document.getElementById('reg-codigo-grupo');
    const codigoGrupo = codigoGrupoInput ? codigoGrupoInput.value.trim().toUpperCase() : '';
    if (selectedRole === 'estudiante' && codigoGrupo.length === 6) {
      try {
        const joinData = await apiPost('/profesores/grupos/unirse', { codigo: codigoGrupo });
        if (joinData.exito) {
          // Actualizar localStorage con grupoId
          user.grupoId = joinData.grupoId;
          user.grupoNombre = joinData.grupoNombre;
          saveLocal('user', user);
          showToast(`Te uniste al grupo "${joinData.grupoNombre}" 🎓`, 'success', 3000);
        }
      } catch (e) { /* no bloquear registro si falla el grupo */ }
    }

    showToast('¡Cuenta creada! Bienvenido a Synapse 🎉', 'success');
    setTimeout(() => {
      window.location.href = selectedRole === 'profesor' ? 'profesor.html' : 'dashboard.html';
    }, 800);

  } catch (err) {
    const msg = {
      'auth/email-already-in-use': 'Ya existe una cuenta con ese correo. Inicia sesión.',
      'auth/weak-password':        'La contraseña es muy débil (mínimo 6 caracteres)',
      'auth/invalid-email':        'Correo electrónico inválido',
    }[err.code] || err.message || 'Error al crear cuenta';
    showToast(msg, 'error');
  } finally {
    btn.disabled = false;
    txt.textContent = 'Crear mi cuenta';
    spn.classList.add('hidden');
  }
}

/* ── GOOGLE LOGIN ────────────────────────────────────────── */
let isAuthProcessing = false;

async function handleGoogleLogin() {
  if (typeof auth === 'undefined') {
    handleDemoLogin('google-user@synapse.edu');
    return;
  }

  try {
    showToast('Iniciando sesión con Google...', 'info', 2000);
    
    // 1. Intentar con Popup (funciona en la gran mayoría de móviles iOS/Android sin romper ITP cookies)
    const result = await auth.signInWithPopup(googleProvider);
    if (result && result.user) {
      await processGoogleUser(result.user);
    }
  } catch (err) {
    if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
      return;
    }
    console.warn('Google Popup no disponible, intentando Redirect:', err.message || err);
    // 2. Fallback a Redirect si el navegador bloqueó la ventana emergente
    try {
      await auth.signInWithRedirect(googleProvider);
    } catch (redirectErr) {
      console.error('Google Redirect error:', redirectErr);
      showToast('Error al conectar con Google. Intenta ingresar con correo y contraseña.', 'error');
    }
  }
}

// Procesar usuario resultante de Google (popup o redirect)
async function processGoogleUser(firebaseUser) {
  if (!firebaseUser || isAuthProcessing) return;
  isAuthProcessing = true;

  try {
    const idToken = await firebaseUser.getIdToken().catch(() => '');

    // Consultar perfil guardado en backend
    const perfil = await consultarPerfilBackend(firebaseUser.uid, idToken);

    const email = firebaseUser.email || '';
    const user = {
      uid:              firebaseUser.uid,
      nombre:           firebaseUser.displayName || (email ? email.split('@')[0] : 'Estudiante'),
      email:            email,
      foto:             firebaseUser.photoURL || '',
      rol:              perfil.rol              || 'estudiante',
      nivelEducativo:   perfil.nivelEducativo   || 'secundaria',
      nivelPorMateria:  perfil.nivelPorMateria  || null,
      diagnosticoHecho: perfil.diagnosticoHecho || false,
      grupoId:          perfil.grupoId          || null,
      grupoNombre:      perfil.grupoNombre       || null,
      googleAuth:       true
    };

    saveLocal('user', user);
    if (idToken) {
      saveLocal('token',   idToken);
      saveLocal('idToken', idToken);
    }

    showToast(`¡Bienvenido, ${user.nombre}! 🎉`, 'success');
    setTimeout(() => {
      window.location.href = user.rol === 'profesor' ? 'profesor.html' : 'dashboard.html';
    }, 600);
  } catch (err) {
    console.error('Error procesando usuario Google:', err);
    showToast('Error completando inicio de sesión', 'error');
  } finally {
    isAuthProcessing = false;
  }
}

// Listener para capturar resultado de Redirect en celulares (solo si el usuario explícitamente hizo redirect)
if (typeof auth !== 'undefined') {
  auth.getRedirectResult().then(result => {
    if (result && result.user) {
      processGoogleUser(result.user);
    }
  }).catch(err => {
    if (err.code && err.code !== 'auth/null-user') {
      console.warn('Redirect auth result error:', err);
    }
  });
}

/* ── LOGOUT ──────────────────────────────────────────────── */
async function handleLogout() {
  clearLocal('user');
  clearLocal('token');
  clearLocal('idToken');
  clearLocal('historial');
  if (typeof auth !== 'undefined') {
    try {
      await auth.signOut();
    } catch (e) {
      console.warn('Error al cerrar sesión de Firebase:', e);
    }
  }
  window.location.href = 'index.html';
}

/* ── GUARD: redirect if already logged in ─────────────────── */
(function authGuard() {
  if (!document.getElementById('form-login')) return;
  const user = loadLocal('user');
  const token = loadLocal('token') || loadLocal('idToken');
  if (user && user.uid && token) {
    window.location.href = user.rol === 'profesor' ? 'profesor.html' : 'dashboard.html';
  } else if (user && !token) {
    clearLocal('user');
  }
})();

