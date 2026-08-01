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

/* ── ROLE SELECTOR ──────────────────────────────────────── */
function selectRole(role) {
  selectedRole = role;
  document.getElementById('role-estudiante').classList.toggle('selected', role === 'estudiante');
  document.getElementById('role-profesor').classList.toggle('selected', role === 'profesor');

  // Hide nivel educativo for professors
  const nivelGrp = document.getElementById('nivel-group');
  if (nivelGrp) nivelGrp.style.display = role === 'profesor' ? 'none' : 'flex';
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
    const data = await apiPost('/auth/login', { email, password });

    if (data.exito || data.token || data.usuario) {
      const user = data.usuario || { email, nombre: email.split('@')[0], rol: 'estudiante', nivelEducativo: 'secundaria' };
      saveLocal('user', user);
      saveLocal('token', data.token || '');

      showToast(`¡Bienvenido, ${user.nombre || 'Estudiante'}! 🎉`, 'success');
      setTimeout(() => {
        const dest = user.rol === 'profesor' ? 'profesor.html' : 'dashboard.html';
        window.location.href = dest;
      }, 800);
    } else {
      throw new Error(data.mensaje || 'Credenciales incorrectas');
    }
  } catch (err) {
    // Demo mode: allows login without real backend
    if (err.message.includes('fetch') || err.message.includes('Failed') || err.message.includes('NetworkError')) {
      handleDemoLogin(email);
    } else {
      showToast(err.message || 'Error al iniciar sesión', 'error');
    }
  } finally {
    btn.disabled = false;
    txt.textContent = 'Iniciar sesión';
    spn.classList.add('hidden');
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
    const payload = {
      nombre, email, password,
      rol: selectedRole,
      nivelEducativo: selectedRole === 'estudiante' ? selectedNivel : null,
    };
    const data = await apiPost('/auth/register', payload);

    if (data.exito || data.usuario) {
      const user = data.usuario || { ...payload, uid: 'new-' + Date.now() };
      saveLocal('user', user);
      showToast('¡Cuenta creada! Bienvenido a Synapse 🎉', 'success');
      setTimeout(() => {
        window.location.href = selectedRole === 'profesor' ? 'profesor.html' : 'dashboard.html';
      }, 800);
    } else {
      throw new Error(data.mensaje || 'Error al crear cuenta');
    }
  } catch (err) {
    if (err.message.includes('fetch') || err.message.includes('Failed') || err.message.includes('NetworkError')) {
      // Demo: create account locally
      const demoUser = {
        uid: 'new-' + Date.now(),
        nombre, email, rol: selectedRole,
        nivelEducativo: selectedNivel,
        grupoId: 'grupo-demo', racha: 0, demo: true
      };
      saveLocal('user', demoUser);
      showToast('🎭 Cuenta demo creada (sin backend)', 'info', 2000);
      setTimeout(() => {
        window.location.href = selectedRole === 'profesor' ? 'profesor.html' : 'dashboard.html';
      }, 900);
    } else {
      showToast(err.message, 'error');
    }
  } finally {
    btn.disabled = false;
    txt.textContent = 'Crear mi cuenta';
    spn.classList.add('hidden');
  }
}

/* ── GOOGLE LOGIN ────────────────────────────────────────── */
async function handleGoogleLogin() {
  showToast('Google Auth próximamente (requiere Firebase SDK)', 'info');
  // TODO: implementar con Firebase Auth en el cliente
}

/* ── LOGOUT ──────────────────────────────────────────────── */
function handleLogout() {
  clearLocal('user');
  clearLocal('token');
  clearLocal('historial');
  window.location.href = 'index.html';
}

/* ── GUARD: redirect if already logged in ─────────────────── */
(function authGuard() {
  // Only on auth page
  if (!document.getElementById('form-login')) return;
  const user = loadLocal('user');
  if (user) {
    window.location.href = user.rol === 'profesor' ? 'profesor.html' : 'dashboard.html';
  }
})();
