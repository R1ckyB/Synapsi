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

/* ── TOGGLE PASSWORD ─────────────────────────────────────── */
function togglePwd(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isText = input.type === 'text';
  input.type = isText ? 'password' : 'text';
  btn.textContent = isText ? '👁️' : '🙈';
}

/* ── LOGIN ───────────────────────────────────────────────── */
async function handleLogin(event) {
  event.preventDefault();
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) { showToast('Completa todos los campos', 'error'); return; }

  const btn = document.getElementById('btn-login');
  const txt = document.getElementById('btn-login-text');
  const spn = document.getElementById('btn-login-spinner');
  btn.disabled = true;
  txt.textContent = 'Iniciando sesión...';
  spn.classList.remove('hidden');

  try {
    // Intentar con Firebase Auth para email/contraseña
    if (typeof auth !== 'undefined') {
      const result = await auth.signInWithEmailAndPassword(email, password);
      const firebaseUser = result.user;
      const idToken = await firebaseUser.getIdToken().catch(() => '');

      // Consultar perfil guardado en backend para conservar rol del docente
      let userRol = 'estudiante';
      try {
        const perfilRes = await fetch(`${SYNAPSE_CONFIG.API_BASE}/auth/perfil/${firebaseUser.uid}`, {
          headers: { 'Authorization': `Bearer ${idToken}` }
        });
        if (perfilRes.ok) {
          const perfilData = await perfilRes.json();
          if (perfilData.rol) userRol = perfilData.rol;
        }
      } catch (e) {
        userRol = loadLocal('user')?.rol || 'estudiante';
      }

      const user = {
        uid:            firebaseUser.uid,
        nombre:         firebaseUser.displayName || email.split('@')[0],
        email:          firebaseUser.email,
        foto:           firebaseUser.photoURL,
        rol:            userRol,
        nivelEducativo: 'secundaria',
      };

      saveLocal('user', user);
      if (idToken) {
        saveLocal('token', idToken);
        saveLocal('idToken', idToken);
      }

      showToast(`¡Bienvenido, ${user.nombre}! 🎉`, 'success');
      setTimeout(() => {
        window.location.href = user.rol === 'profesor' ? 'profesor.html' : 'dashboard.html';
      }, 600);
      return;
    }
  } catch (err) {
    if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
      showToast('Contraseña incorrecta', 'error');
      btn.disabled = false;
      txt.textContent = 'Iniciar sesión';
      spn.classList.add('hidden');
      return;
    }
  }
  handleDemoLogin(email);
}

/* ── DEMO LOGIN (sin backend) ────────────────────────────── */
function handleDemoLogin(email = 'demo@synapse.edu') {
  const demoUser = {
    uid: 'demo-' + Date.now(),
    nombre: email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1),
    email,
    rol: email.includes('prof') ? 'profesor' : 'estudiante',
    nivelEducativo: 'secundaria',
    grupoId: 'grupo-demo',
    materiaActual: 'Matemáticas',
    racha: 7,
    demo: true
  };
  saveLocal('user', demoUser);
  showToast('🎭 Modo demo — sin backend', 'info', 2000);
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
    saveLocal('token', idToken);

    // Si el estudiante ingresó un código de clase, unirse al grupo automáticamente
    const codigoGrupoInput = document.getElementById('reg-codigo-grupo');
    const codigoGrupo = codigoGrupoInput ? codigoGrupoInput.value.trim().toUpperCase() : '';
    if (selectedRole === 'estudiante' && codigoGrupo.length === 6) {
      try {
        const joinRes = await fetch('/api/profesores/grupos/unirse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ codigo: codigoGrupo })
        });
        const joinData = await joinRes.json();
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
async function handleGoogleLogin() {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  try {
    showToast('Iniciando sesión con Google...', 'info', 2000);
    
    if (isMobile) {
      // En celulares, usar Redirect para evitar bloqueos de Popups en Android/iOS
      await auth.signInWithRedirect(googleProvider);
    } else {
      // En computadoras, usar Popup
      const result = await auth.signInWithPopup(googleProvider);
      await processGoogleUser(result.user);
    }
  } catch (err) {
    if (err.code === 'auth/popup-closed-by-user') return;
    if (err.code === 'auth/popup-blocked' || isMobile) {
      // Fallback a Redirect si el popup fue bloqueado
      try {
        await auth.signInWithRedirect(googleProvider);
        return;
      } catch (redirectErr) {
        console.error('Redirect error:', redirectErr);
      }
    }
    console.error('Google login error:', err);
    showToast('Error al conectar con Google. Intenta con correo.', 'error');
  }
}

// Procesar usuario resultante de Google (popup o redirect)
async function processGoogleUser(firebaseUser) {
  if (!firebaseUser) return;
  
  const idToken = await firebaseUser.getIdToken().catch(() => '');

  const user = {
    uid:             firebaseUser.uid,
    nombre:          firebaseUser.displayName || firebaseUser.email.split('@')[0],
    email:           firebaseUser.email,
    foto:            firebaseUser.photoURL,
    rol:             'estudiante',
    nivelEducativo:  'secundaria',
    googleAuth:      true
  };

  saveLocal('user', user);
  if (idToken) saveLocal('token', idToken);

  showToast(`¡Bienvenido, ${user.nombre}! 🎉`, 'success');
  setTimeout(() => {
    window.location.href = user.rol === 'profesor' ? 'profesor.html' : 'dashboard.html';
  }, 600);
}

// Listener para capturar resultado de Redirect (en celulares)
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
function handleLogout() {
  clearLocal('user');
  clearLocal('token');
  clearLocal('historial');
  if (typeof auth !== 'undefined') {
    auth.signOut().catch(() => {});
  }
  window.location.href = 'index.html';
}

/* ── GUARD: redirect if already logged in ─────────────────── */
(function authGuard() {
  if (!document.getElementById('form-login')) return;
  const user = loadLocal('user');
  if (user && user.uid) {
    window.location.href = user.rol === 'profesor' ? 'profesor.html' : 'dashboard.html';
  }
})();

