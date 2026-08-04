// ============================================================
// dashboard.js — Dashboard Init & View Router
// ============================================================

/* ── VIEW ROUTER ─────────────────────────────────────────── */
const VIEW_META = {
  chat:     { title: 'Chat con Tutor',    breadcrumb: 'Método socrático · Gemini 2.0 Flash' },
  quizzes:  { title: 'Mis Quizzes',       breadcrumb: 'Genera y practica con IA' },
  audio:    { title: 'Notas de Voz',      breadcrumb: 'Transcripción y resumen automático' },
  imagen:   { title: 'Analizar Imagen',   breadcrumb: 'Sube fotos de tu cuaderno' },
  progreso: { title: 'Mi Progreso',       breadcrumb: 'Estadísticas y avances' },
  materias: { title: 'Mis Materias',      breadcrumb: 'Gestiona tus cursos' },
};

function showView(viewId) {
  // Hide all views
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  // Remove active from all nav items
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.remove('active');
    n.removeAttribute('aria-current');
  });

  // Show target view
  const view = document.getElementById(`view-${viewId}`);
  if (view) view.classList.add('active');

  // Activate nav item
  const navItem = document.getElementById(`nav-${viewId}`);
  if (navItem) {
    navItem.classList.add('active');
    navItem.setAttribute('aria-current', 'page');
  }

  // Update topbar
  const meta = VIEW_META[viewId] || { title: viewId, breadcrumb: '' };
  const titleEl = document.getElementById('topbar-title');
  const breadEl = document.getElementById('topbar-breadcrumb');
  if (titleEl) titleEl.textContent = meta.title;
  if (breadEl) breadEl.textContent = meta.breadcrumb;

  // Close mobile sidebar
  closeSidebar();

  // View-specific init
  if (viewId === 'progreso') renderProgressView();
  if (viewId === 'materias') renderMateriasView();
}

/* ── INIT DASHBOARD ──────────────────────────────────────── */
function initDashboard() {
  const user = loadLocal('user');
  if (!user) {
    window.location.href = 'index.html';
    return;
  }

  // Populate user info
  window.SynapseState.user = user;

  const initials = getInitials(user.nombre || 'U');
  const sidebarAv = document.getElementById('sidebar-avatar');
  const topbarAv  = document.getElementById('topbar-avatar');
  if (sidebarAv) sidebarAv.textContent = initials;
  if (topbarAv)  topbarAv.textContent  = initials;

  const nameEl  = document.getElementById('sidebar-user-name');
  const nivelEl = document.getElementById('sidebar-user-nivel');
  if (nameEl)  nameEl.textContent  = user.nombre || 'Estudiante';
  if (nivelEl) nivelEl.textContent = nivelLabel(user.nivelEducativo);

  // Restore state from localStorage
  const savedHistorial = loadLocal('historial');
  if (savedHistorial?.length) {
    window.SynapseState.historial = savedHistorial;
    // Replay last few messages visually
    const toShow = savedHistorial.slice(-6);
    toShow.forEach(h => appendMessage(h.role === 'user' ? 'user' : 'tutor', h.text));
  }

  // Update stat: nivel and materia
  const statNivel = document.getElementById('stat-nivel');
  if (statNivel) statNivel.textContent = nivelLabel(user.nivelEducativo);

  // Load daily question
  const q = SYNAPSE_CONFIG.PREGUNTAS_DIA[new Date().getDay() % SYNAPSE_CONFIG.PREGUNTAS_DIA.length];
  const pregEl = document.getElementById('pregunta-dia');
  if (pregEl) pregEl.textContent = q;

  // Racha — primero desde API, fallback a localStorage
  const rachaLocal = user.racha ?? 0;
  window.SynapseState.racha = rachaLocal;
  const rachaEl  = document.getElementById('stat-racha');
  const streakEl = document.getElementById('streak-count');
  if (rachaEl)  rachaEl.textContent  = rachaLocal;
  if (streakEl) streakEl.textContent = rachaLocal;

  // Cargar datos reales del perfil desde la API
  cargarDatosPerfil(user);

  console.log('🧠 Synapse Dashboard v2.1 — Usuario:', user.nombre);
}

/* ── PROGRESS VIEW ───────────────────────────────────────── */
/* ── CARGA DATOS REALES DESDE API ──────────────────────────── */
async function cargarDatosPerfil(user) {
  if (!user?.uid) return;

  try {
    // Sincronizar materia selector
    const sel = document.getElementById('materia-selector');
    if (sel && user.materiaActual) sel.value = user.materiaActual;
    if (user.materiaActual) window.SynapseState.materiaActual = user.materiaActual;

    // Mensaje de bienvenida
    const savedHistorial = loadLocal('historial');
    if (!savedHistorial?.length) {
      const welcomeMsg = document.querySelector('#welcome-msg .msg-bubble');
      if (welcomeMsg) {
        welcomeMsg.innerHTML = `¡Hola <strong>${user.nombre?.split(' ')[0] || 'Estudiante'}</strong>! Soy <strong>Synapse</strong>, tu tutor personal con IA 🎓<br><br>
        Estoy aquí para ayudarte a aprender usando el método socrático: te guiaré con preguntas para que llegues a las respuestas tú mismo.<br><br>
        ¿Sobre qué tema de <strong>${user.materiaActual || 'tus materias'}</strong> tienes dudas hoy? ¡Escribe, graba un audio o sube una imagen! 🚀`;
      }
    }

    // Cargar vacíos de conocimiento reales desde la API
    const token = loadLocal('idToken');
    if (token) {
      const respuesta = await fetch(
        `${SYNAPSE_CONFIG.API_BASE}/profesores/vacios/estudiante/${user.uid}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (respuesta.ok) {
        const datos = await respuesta.json();
        const vacios = datos.vacios || [];

        // Actualizar racha real si viene del backend
        if (datos.racha !== undefined) {
          window.SynapseState.racha = datos.racha;
          const rachaEl  = document.getElementById('stat-racha');
          const streakEl = document.getElementById('streak-count');
          if (rachaEl)  rachaEl.textContent = datos.racha;
          if (streakEl) streakEl.textContent = datos.racha;
          // Persistir para próxima sesión
          const userActual = loadLocal('user') || {};
          saveLocal('user', { ...userActual, racha: datos.racha });
        }

        // Actualizar materias con progreso real
        if (vacios.length > 0) {
          window.SynapseState.vaciosReales = vacios;
        }

        // Actualizar sesiones de hoy
        if (datos.totalSesiones !== undefined) {
          window.SynapseState.chatPreguntasHoy = datos.totalSesiones;
          const totalQEl = document.getElementById('prog-total-q');
          if (totalQEl) totalQEl.textContent = datos.totalSesiones;
        }
      }
    }
  } catch (err) {
    console.warn('No se pudieron cargar datos del perfil desde la API:', err.message);
    // Silencioso: los datos locales siguen funcionando como fallback
  }
}

function renderProgressView() {
  const state = window.SynapseState;

  const totalQEl = document.getElementById('prog-total-q');
  if (totalQEl) totalQEl.textContent = state.chatPreguntasHoy;

  const precEl = document.getElementById('prog-precision');
  if (precEl) {
    if (state.quizTotal > 0) {
      precEl.textContent = Math.round((state.quizCorrects / state.quizTotal) * 100) + '%';
    } else {
      precEl.textContent = '—';
    }
  }

  // Usar vacíos reales si están disponibles, si no usar placeholder
  const vaciosReales = state.vaciosReales || [];
  const list = document.getElementById('prog-materias-list');
  if (!list) return;

  if (vaciosReales.length > 0) {
    // Datos reales desde Firestore via API
    const emojis = { 'Matemáticas': '📐', 'Física': '⛛️', 'Historia': '📜',
                     'Química': '🧪', 'Biología': '🧬', 'Español': '✍️', 'General': '📚' };

    const materiasPct = {};
    vaciosReales.forEach(v => {
      const m = v.materia || 'General';
      if (!materiasPct[m]) materiasPct[m] = { total: 0, dominio: 0 };
      materiasPct[m].total++;
      if (!v.esVacio) materiasPct[m].dominio++;
    });

    list.innerHTML = Object.entries(materiasPct).map(([name, data]) => {
      const pct = data.total > 0 ? Math.round((data.dominio / data.total) * 100) : 50;
      const emoji = emojis[name] || '📚';
      return `
        <div style="display:flex;align-items:center;gap:var(--sp-md)">
          <span style="font-size:1.2rem;width:28px;text-align:center">${emoji}</span>
          <div style="flex:1">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
              <span style="font-size:0.88rem;font-weight:600">${name}</span>
              <span style="font-size:0.82rem;font-weight:700;color:var(--clr-primary-l)">${pct}%</span>
            </div>
            <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
          </div>
        </div>`;
    }).join('');
  } else {
    // Sin datos reales aún: mostrar mensaje motivador
    list.innerHTML = `<div style="text-align:center;padding:var(--sp-lg);color:var(--clr-text-3);font-size:0.9rem">
      💬 ¡Empieza a chatear con el tutor para ver tu progreso real aquí!
    </div>`;
  }
}

/* ── MATERIAS VIEW ───────────────────────────────────────── */
function renderMateriasView() {
  const grid = document.getElementById('materias-grid');
  if (!grid) return;

  const materias = [
    { name: 'Matemáticas', emoji: '📐', pct: 65, temas: ['Álgebra', 'Geometría', 'Trigonometría'], color: '#6c63ff' },
    { name: 'Física',       emoji: '⚛️', pct: 40, temas: ['Mecánica', 'Termodinámica', 'Ondas'], color: '#00d9b1' },
    { name: 'Historia',     emoji: '📜', pct: 80, temas: ['México', 'Mundo Antiguo', 'Contemporánea'], color: '#ffd166' },
    { name: 'Química',      emoji: '🧪', pct: 25, temas: ['Tabla Periódica', 'Reacciones', 'Estequiometría'], color: '#ff6b6b' },
    { name: 'Biología',     emoji: '🧬', pct: 55, temas: ['Célula', 'Genética', 'Ecosistemas'], color: '#06d6a0' },
    { name: 'Español',      emoji: '✍️', pct: 70, temas: ['Redacción', 'Literatura', 'Gramática'], color: '#a0a8c8' },
  ];

  grid.innerHTML = materias.map(m => `
    <div class="vacio-card" onclick="cambiarMateria('${m.name}');showView('chat')" style="cursor:pointer">
      <div style="display:flex;align-items:center;gap:var(--sp-sm);margin-bottom:var(--sp-md)">
        <span style="font-size:1.8rem">${m.emoji}</span>
        <div>
          <div class="vacio-topic">${m.name}</div>
          <div style="font-size:0.75rem;color:var(--clr-text-3)">${m.temas.join(' · ')}</div>
        </div>
        <span class="materia-pct" style="margin-left:auto">${m.pct}%</span>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${m.pct}%;background:linear-gradient(90deg,${m.color},var(--clr-accent))"></div></div>
      <div style="margin-top:var(--sp-md)">
        <button class="btn btn-ghost btn-sm" style="width:100%;font-size:0.8rem">💬 Estudiar ahora →</button>
      </div>
    </div>`
  ).join('');
}

/* ── HELPERS ─────────────────────────────────────────────── */
function nivelLabel(nivel) {
  const map = {
    primaria:    '🏫 Primaria',
    secundaria:  '📘 Secundaria',
    preparatoria:'📗 Preparatoria',
    universidad: '🎓 Universidad',
  };
  return map[nivel] || '🎓 Estudiante';
}

/* ── INIT ON LOAD ────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('view-chat')) {
    initDashboard();
  }
});
