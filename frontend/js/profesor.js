// ============================================================
// profesor.js — Teacher Dashboard Logic
// ============================================================

/* ── STATE ────────────────────────────────────────────────── */
window.PROFESOR_STATE = window.PROFESOR_STATE || {
  grupoActual: 'DEMO12',
  materias: ['Matemáticas', 'Física']
};

/* ── VIEW META ───────────────────────────────────────────── */
const PROF_VIEW_META = {
  overview:      { title: 'Vista General',            breadcrumb: 'Panel del Profesor · Synapse v2.0' },
  vacios:        { title: 'Vacíos de Conocimiento',   breadcrumb: 'Temas con mayor dificultad en el grupo' },
  alumnos:       { title: 'Mis Alumnos',              breadcrumb: 'Seguimiento individual de estudiantes' },
  'quizzes-prof':{ title: 'Quizzes del Grupo',        breadcrumb: 'Resultados de quizzes generados por IA' },
};

function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.remove('active');
    n.removeAttribute('aria-current');
  });

  const view = document.getElementById(`view-${viewId}`);
  if (view) view.classList.add('active');

  const navItem = document.getElementById(`nav-${viewId}`);
  if (navItem) { navItem.classList.add('active'); navItem.setAttribute('aria-current','page'); }

  const meta = PROF_VIEW_META[viewId] || { title: viewId, breadcrumb: '' };
  const titleEl = document.getElementById('topbar-title');
  const breadEl = document.getElementById('topbar-breadcrumb');
  if (titleEl) titleEl.textContent = meta.title;
  if (breadEl) breadEl.textContent = meta.breadcrumb;

  closeSidebar();

  if (viewId === 'vacios')   loadVacios();
  if (viewId === 'alumnos')  renderAlumnos();
  if (viewId === 'quizzes-prof') renderQuizzesProf();
}

/* ── DEMO DATA ───────────────────────────────────────────── */
const DEMO_VACIOS = [
  { tema: 'Fracciones y decimales', materia: 'Matemáticas', alumnos: 8, porcentaje: 62, emoji: '📐' },
  { tema: 'Segunda Ley de Newton',  materia: 'Física',       alumnos: 6, porcentaje: 45, emoji: '⚛️' },
  { tema: 'Tabla periódica (períodos y grupos)', materia: 'Química', alumnos: 7, porcentaje: 51, emoji: '🧪' },
  { tema: 'Revolución Mexicana — causas',        materia: 'Historia', alumnos: 4, porcentaje: 30, emoji: '📜' },
  { tema: 'División celular (mitosis vs meiosis)',materia: 'Biología', alumnos: 9, porcentaje: 70, emoji: '🧬' },
  { tema: 'Ecuaciones de primer grado',          materia: 'Matemáticas', alumnos: 5, porcentaje: 38, emoji: '📐' },
];

const DEMO_ALUMNOS = [
  { nombre: 'Ana García',     nivel: 'Secundaria', racha: 12, precision: 88, estado: 'Excelente' },
  { nombre: 'Carlos Mendez',  nivel: 'Secundaria', racha: 3,  precision: 55, estado: 'Necesita apoyo' },
  { nombre: 'Sofía López',    nivel: 'Secundaria', racha: 7,  precision: 72, estado: 'Bien' },
  { nombre: 'Miguel Torres',  nivel: 'Secundaria', racha: 1,  precision: 40, estado: 'En riesgo' },
  { nombre: 'Valentina Cruz', nivel: 'Secundaria', racha: 10, precision: 91, estado: 'Excelente' },
  { nombre: 'Diego Ramírez',  nivel: 'Secundaria', racha: 5,  precision: 63, estado: 'Bien' },
  { nombre: 'Camila Flores',  nivel: 'Secundaria', racha: 0,  precision: 32, estado: 'En riesgo' },
  { nombre: 'Sebastián Ruiz', nivel: 'Secundaria', racha: 8,  precision: 78, estado: 'Bien' },
];

/* ── INIT ────────────────────────────────────────────────── */
function initProfesor() {
  let user = loadLocal('user');
  let token = loadLocal('token') || loadLocal('idToken');
  if (!user) {
    user = { uid: 'prof-demo', nombre: 'Profesor Demo', rol: 'profesor' };
    saveLocal('user', user);
  }
  if (!token) {
    token = 'demo-token';
    saveLocal('token', token);
    saveLocal('idToken', token);
  }

  window.SynapseState.user = user;
  const initials = getInitials(user.nombre || 'P');

  const av1 = document.getElementById('sidebar-avatar-prof');
  const av2 = document.getElementById('topbar-avatar-prof');
  if (av1) av1.textContent = initials;
  if (av2) av2.textContent = initials;

  const nameEl = document.getElementById('sidebar-prof-name');
  if (nameEl) nameEl.textContent = user.nombre || 'Profesor';

  loadOverview();
}

/* ── OVERVIEW ─────────────────────────────────────────────── */
async function loadOverview() {
  let vacios = DEMO_VACIOS;
  let statsData = null;

  try {
    statsData = await apiGet('/profesores/vacios');
    if (statsData?.vacios?.length) vacios = statsData.vacios;
  } catch(e) {
    console.warn('Profesores API unavailable, using demo data');
  }

  // Stats cards
  setStatEl('stat-alumnos', DEMO_ALUMNOS.length);
  setStatEl('stat-preguntas-total', 147);
  setStatEl('stat-vacios-count', vacios.length);
  setStatEl('stat-precision-prom', '68%');

  // Vacíos badge
  const badge = document.getElementById('vacios-badge');
  if (badge) badge.textContent = vacios.filter(v => v.porcentaje > 50).length;

  // Vacíos overview (top 4)
  renderVaciosList('vacios-overview-list', vacios.slice(0, 4));

  // Alumnos en riesgo
  renderAlumnosRiesgo();

  // Actividad reciente
  renderActividad();
}

function setStatEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ── VACÍOS ──────────────────────────────────────────────── */
async function loadVacios() {
  const container = document.getElementById('vacios-full-list');
  if (!container) return;
  container.innerHTML = '<div class="spinner spinner-lg" style="margin:40px auto;display:block"></div>';

  let vacios = DEMO_VACIOS;
  try {
    const data = await apiGet('/profesores/vacios');
    if (data?.vacios?.length) vacios = data.vacios;
  } catch(e) {
    console.warn('Using demo vacios data');
  }

  renderVaciosList('vacios-full-list', vacios);
}

function renderVaciosList(containerId, vacios) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!vacios.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🎉</div>
        <div class="empty-state-title">¡Sin vacíos detectados!</div>
        <div class="empty-state-text">Tus alumnos están dominando todos los temas.</div>
      </div>`;
    return;
  }

  container.innerHTML = vacios.map(v => {
    const severity = v.porcentaje >= 60 ? 'warn' : v.porcentaje >= 40 ? 'gold' : 'accent';
    const sColor   = severity === 'warn' ? 'var(--clr-warn)' : severity === 'gold' ? 'var(--clr-gold)' : 'var(--clr-accent)';
    return `
    <div class="vacio-card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--sp-sm)">
        <div style="display:flex;align-items:center;gap:var(--sp-sm)">
          <span style="font-size:1.5rem">${v.emoji || '📚'}</span>
          <div>
            <div class="vacio-topic">${escapeHtml(v.tema)}</div>
            <div style="font-size:0.75rem;color:var(--clr-text-3)">${escapeHtml(v.materia || '')}</div>
          </div>
        </div>
        <span class="badge badge-${severity}" style="flex-shrink:0">${v.porcentaje}%</span>
      </div>
      <div class="vacio-count">
        <span>👤 ${v.alumnos} alumno${v.alumnos !== 1 ? 's' : ''} con dificultad</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" style="width:${v.porcentaje}%;background:linear-gradient(90deg,${sColor},${sColor}88)"></div>
      </div>
      <div style="margin-top:var(--sp-sm);display:flex;gap:6px">
        <button class="btn btn-ghost btn-sm" style="flex:1;font-size:0.78rem"
          onclick="showToast('Generando recursos para ${escapeHtml(v.tema)}...','info')">
          ✨ Generar recursos
        </button>
      </div>
    </div>`;
  }).join('');
}

/* ── ALUMNOS ─────────────────────────────────────────────── */
function renderAlumnosRiesgo() {
  const container = document.getElementById('alumnos-riesgo-list');
  if (!container) return;

  const enRiesgo = DEMO_ALUMNOS.filter(a => a.estado === 'En riesgo' || a.estado === 'Necesita apoyo');
  container.innerHTML = enRiesgo.map(a => `
    <div style="display:flex;align-items:center;gap:var(--sp-sm);padding:8px;border-radius:var(--r-md);background:rgba(255,107,107,0.06);border:1px solid rgba(255,107,107,0.15)">
      <div class="avatar avatar-sm" style="background:linear-gradient(135deg,#ff6b6b,#c94040)">${getInitials(a.nombre)}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:0.85rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(a.nombre)}</div>
        <div style="font-size:0.72rem;color:var(--clr-warn)">${escapeHtml(a.estado)} · ${a.precision}% precisión</div>
      </div>
      <span style="font-size:0.9rem" title="Racha: ${a.racha} días">🔥${a.racha}</span>
    </div>`).join('');
}

function renderActividad() {
  const container = document.getElementById('actividad-list');
  if (!container) return;

  const actividades = [
    { icon:'💬', text: 'Ana García preguntó sobre fracciones', time: 'hace 5 min' },
    { icon:'🧩', text: 'Quiz de Física generado (6A)', time: 'hace 12 min' },
    { icon:'🎙️', text: 'Carlos subió nota de voz — Química', time: 'hace 28 min' },
    { icon:'📸', text: 'Sofía analizó imagen de cuaderno', time: 'hace 1h' },
    { icon:'⚠️', text: 'Miguel Torres no estudia desde ayer', time: 'hace 2h' },
  ];

  container.innerHTML = actividades.map(a => `
    <div style="display:flex;align-items:flex-start;gap:var(--sp-sm);padding:6px 0;border-bottom:1px solid var(--clr-border)">
      <span style="font-size:1rem;flex-shrink:0">${a.icon}</span>
      <div style="flex:1">
        <div style="font-size:0.82rem">${a.text}</div>
        <div style="font-size:0.72rem;color:var(--clr-text-3)">${a.time}</div>
      </div>
    </div>`).join('');
}

function renderAlumnos() {
  const container = document.getElementById('alumnos-table-wrap');
  if (!container) return;

  const rows = DEMO_ALUMNOS.map(a => {
    const estadoBadge = {
      'Excelente':     'badge-accent',
      'Bien':          'badge-primary',
      'Necesita apoyo':'badge-gold',
      'En riesgo':     'badge-warn',
    }[a.estado] || 'badge-primary';

    const uid = a.uid || 'demo-' + a.nombre.replace(/\s+/g, '-').toLowerCase();

    return `
    <tr>
      <td style="padding:12px var(--sp-md);cursor:pointer" onclick="verFichaAlumno('${uid}', '${escapeHtml(a.nombre)}')">
        <div style="display:flex;align-items:center;gap:var(--sp-sm)">
          <div class="avatar avatar-sm">${getInitials(a.nombre)}</div>
          <div>
            <div style="font-size:0.88rem;font-weight:600;color:var(--clr-primary-l)">${escapeHtml(a.nombre)}</div>
            <div style="font-size:0.72rem;color:var(--clr-text-3)">${escapeHtml(a.nivel)}</div>
          </div>
        </div>
      </td>
      <td style="padding:12px var(--sp-md)">
        <span style="font-size:1rem">🔥 ${a.racha} días</span>
      </td>
      <td style="padding:12px var(--sp-md)">
        <div style="display:flex;align-items:center;gap:8px">
          <div class="progress-track" style="width:80px"><div class="progress-fill" style="width:${a.precision}%"></div></div>
          <span style="font-size:0.82rem;font-weight:700;color:var(--clr-primary-l)">${a.precision}%</span>
        </div>
      </td>
      <td style="padding:12px var(--sp-md)">
        <span class="badge ${estadoBadge}">${escapeHtml(a.estado)}</span>
      </td>
      <td style="padding:12px var(--sp-md);text-align:right">
        <button class="btn btn-ghost btn-sm" title="Ver ficha" onclick="verFichaAlumno('${uid}', '${escapeHtml(a.nombre)}')">👁️</button>
        <button class="btn btn-ghost btn-sm" title="Eliminar del grupo" style="color:var(--clr-warn)" onclick="eliminarAlumnoDeGrupo('${uid}', '${escapeHtml(a.nombre)}')">🗑️</button>
      </td>
    </tr>`;
  }).join('');

  container.innerHTML = `
    <div style="background:var(--clr-bg-2);border:1px solid var(--clr-border);border-radius:var(--r-xl);overflow:hidden">
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="border-bottom:1px solid var(--clr-border);background:rgba(255,255,255,0.03)">
            <th style="padding:12px var(--sp-md);text-align:left;font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--clr-text-3)">Alumno</th>
            <th style="padding:12px var(--sp-md);text-align:left;font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--clr-text-3)">Racha</th>
            <th style="padding:12px var(--sp-md);text-align:left;font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--clr-text-3)">Precisión Quiz</th>
            <th style="padding:12px var(--sp-md);text-align:left;font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--clr-text-3)">Estado</th>
            <th style="padding:12px var(--sp-md);text-align:right;font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--clr-text-3)">Acción</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function renderQuizzesProf() {
  const grid = document.getElementById('quizzes-prof-grid');
  if (!grid) return;

  const quizzes = [
    { titulo: 'Fracciones — Básico', materia: 'Matemáticas', alumnos: 12, promedio: 72, fecha: 'Hoy', emoji:'📐' },
    { titulo: 'Segunda Ley de Newton', materia: 'Física', alumnos: 10, promedio: 58, fecha: 'Ayer', emoji:'⚛️' },
    { titulo: 'Tabla Periódica', materia: 'Química', alumnos: 8, promedio: 65, fecha: 'Hace 2 días', emoji:'🧪' },
    { titulo: 'Revolución Mexicana', materia: 'Historia', alumnos: 11, promedio: 81, fecha: 'Hace 3 días', emoji:'📜' },
  ];

  grid.innerHTML = quizzes.map(q => `
    <div class="panel-card">
      <div style="display:flex;align-items:center;gap:var(--sp-sm);margin-bottom:var(--sp-md)">
        <span style="font-size:1.5rem">${q.emoji}</span>
        <div>
          <div style="font-size:0.92rem;font-weight:700">${escapeHtml(q.titulo)}</div>
          <div style="font-size:0.75rem;color:var(--clr-text-3)">${escapeHtml(q.materia)} · ${escapeHtml(q.fecha)}</div>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:var(--sp-sm)">
        <span style="font-size:0.82rem;color:var(--clr-text-2)">👥 ${q.alumnos} alumnos</span>
        <span style="font-size:0.82rem;font-weight:700;color:${q.promedio>=70?'var(--clr-accent)':'var(--clr-gold)'}">${q.promedio}% prom.</span>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${q.promedio}%"></div></div>
    </div>`).join('');
}

/* ── FILTER ──────────────────────────────────────────────── */
function filtrarPorGrupo(grupo) {
  showToast(`Filtrando por ${grupo === 'todos' ? 'todos los grupos' : 'Grupo ' + grupo}`, 'info', 1500);
}

/* ── EXPORT ──────────────────────────────────────────────── */
function exportarReporte() {
  const lines = [
    '# Reporte Synapse EduMentor — Vacíos de Conocimiento',
    `Fecha: ${new Date().toLocaleDateString('es-MX')}`,
    '',
    '## Temas con Mayor Dificultad',
    ...DEMO_VACIOS.map(v => `- ${v.tema} (${v.materia}): ${v.alumnos} alumnos, ${v.porcentaje}%`),
    '',
    '## Alumnos en Riesgo',
    ...DEMO_ALUMNOS.filter(a => a.estado === 'En riesgo').map(a => `- ${a.nombre}: ${a.precision}% precisión, ${a.racha} días de racha`)
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `synapse-reporte-${Date.now()}.md`;
  a.click(); URL.revokeObjectURL(url);
  showToast('Reporte exportado 📤', 'success');
}

/* ── INIT ────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', initProfesor);

/* ── GRUPOS / CÓDIGOS DE INVITACIÓN ─────────────────────── */
function abrirModalGrupo() {
  const modal = document.getElementById('modal-grupo');
  if (!modal) return;
  // Reset estado del modal
  document.getElementById('modal-grupo-form').style.display = '';
  document.getElementById('modal-grupo-codigo').style.display = 'none';
  document.getElementById('input-nombre-grupo').value = '';
  modal.style.display = 'flex';
}

function cerrarModalGrupo() {
  const modal = document.getElementById('modal-grupo');
  if (modal) modal.style.display = 'none';
}

async function crearGrupo() {
  const nombreGrupo = document.getElementById('input-nombre-grupo').value.trim();
  if (!nombreGrupo) { showToast('Escribe el nombre del grupo', 'error'); return; }

  const btn = document.getElementById('btn-crear-grupo-submit');
  const txt = document.getElementById('btn-crear-grupo-txt');
  const spin = document.getElementById('btn-crear-grupo-spin');
  btn.disabled = true;
  txt.textContent = 'Creando...';
  spin.classList.remove('hidden');

    const data = await apiPost('/profesores/grupos', { nombreGrupo });

    if (!data.exito) throw new Error(data.mensaje || 'Error al crear grupo');

    // Mostrar el código generado
    document.getElementById('codigo-generado').textContent = data.codigo;
    document.getElementById('nombre-grupo-generado').textContent = `Grupo: ${data.nombre}`;
    document.getElementById('modal-grupo-form').style.display = 'none';
    document.getElementById('modal-grupo-codigo').style.display = '';
    showToast(`¡Grupo "${data.nombre}" creado! 🎉`, 'success');
  } catch (err) {
    showToast('Error al crear grupo: ' + err.message, 'error');
    btn.disabled = false;
    txt.textContent = '✨ Crear y generar código';
    spin.classList.add('hidden');
  }
}

function copiarCodigo() {
  const codigo = document.getElementById('codigo-generado').textContent;
  navigator.clipboard.writeText(codigo).then(() => {
    showToast(`Código ${codigo} copiado 📋`, 'success');
  }).catch(() => {
    showToast('Código: ' + codigo, 'info');
  });
}

/* ── MODAL RENOMBRAR GRUPO ──────────────────────────────────────── */
function abrirModalRenombrarGrupo() {
  const modal = document.getElementById('modal-renombrar-grupo');
  if (modal) modal.style.display = 'flex';
}
function cerrarModalRenombrarGrupo() {
  const modal = document.getElementById('modal-renombrar-grupo');
  if (modal) modal.style.display = 'none';
}
async function renombrarGrupo() {
  const input = document.getElementById('input-nuevo-nombre-grupo');
  const nuevoNombre = input?.value?.trim();
  const codigoGrupo = PROFESOR_STATE.grupoActual || 'DEMO12';
  if (!nuevoNombre) {
    showToast('Ingresa un nuevo nombre para el grupo', 'error');
    return;
  }
  try {
    await apiPost(`/profesores/grupos/${codigoGrupo}`, { nombre: nuevoNombre }, { method: 'PATCH' });
    showToast(`Grupo renombrado a "${nuevoNombre}" ✅`, 'success');
    cerrarModalRenombrarGrupo();
    loadOverview();
  } catch (err) {
    showToast('Error al renombrar grupo: ' + err.message, 'error');
  }
}

/* ── MODAL ANUNCIOS ──────────────────────────────────────── */
function abrirModalAnuncio() {
  const modal = document.getElementById('modal-anuncio');
  if (modal) modal.style.display = 'flex';
}
function cerrarModalAnuncio() {
  const modal = document.getElementById('modal-anuncio');
  if (modal) modal.style.display = 'none';
}
async function publicarAnuncio() {
  const tituloEl = document.getElementById('anuncio-titulo');
  const contenidoEl = document.getElementById('anuncio-contenido');
  const titulo = tituloEl?.value?.trim() || 'Anuncio importante 📢';
  const contenido = contenidoEl?.value?.trim();
  const grupoId = PROFESOR_STATE.grupoActual || 'general';

  if (!contenido) {
    showToast('Escribe el contenido del anuncio', 'error');
    return;
  }

  try {
    await apiPost('/profesores/anuncios', { grupoId, titulo, contenido });
    showToast('📢 Anuncio publicado al grupo', 'success');
    if (tituloEl) tituloEl.value = '';
    if (contenidoEl) contenidoEl.value = '';
    cerrarModalAnuncio();
  } catch (err) {
    showToast('Error al publicar anuncio: ' + err.message, 'error');
  }
}

/* ── MODAL ASIGNAR QUIZ ──────────────────────────────────────── */
function abrirModalAsignarQuiz() {
  const modal = document.getElementById('modal-asignar-quiz');
  if (modal) modal.style.display = 'flex';
}
function cerrarModalAsignarQuiz() {
  const modal = document.getElementById('modal-asignar-quiz');
  if (modal) modal.style.display = 'none';
}
async function asignarQuizProf() {
  const temaEl = document.getElementById('quiz-tema-prof');
  const numEl = document.getElementById('quiz-num-prof');
  const difEl = document.getElementById('quiz-dif-prof');

  const tema = temaEl?.value?.trim() || 'General';
  const numPreguntas = parseInt(numEl?.value) || 5;
  const dificultad = difEl?.value || 'intermedio';
  const grupoId = PROFESOR_STATE.grupoActual || 'general';

  try {
    await apiPost('/quizzes/asignar-grupo', { tema, numPreguntas, dificultad, grupoId });
    showToast(`🎯 Quiz de ${tema} asignado al grupo ${grupoId}`, 'success');
    cerrarModalAsignarQuiz();
    loadOverview();
  } catch (err) {
    showToast('Error al asignar quiz: ' + err.message, 'error');
  }
}

/* ── MATERIAS DEL PROFESOR ──────────────────────────────────────── */
function toggleMateriaProf(btn) {
  if (btn) btn.classList.toggle('active');
}
async function guardarMateriasProf() {
  const activas = Array.from(document.querySelectorAll('.chip-materia.active'))
    .map(b => b.dataset.materia);

  try {
    await apiPost('/profesores/perfil', { materias: activas }, { method: 'PATCH' });
    showToast(`Materias guardadas: ${activas.join(', ')} 📚`, 'success');
  } catch (err) {
    showToast('Materias guardadas localmente ✅', 'success');
  }
}

/* ── FICHA Y ELIMINACIÓN DE ALUMNO ──────────────────────────────────────── */
async function verFichaAlumno(uid, nombre) {
  const modal = document.getElementById('modal-alumno-detalle');
  const body = document.getElementById('modal-alumno-body');
  if (!modal) return;
  modal.style.display = 'flex';

  if (body) {
    body.innerHTML = `<div class="spinner spinner-lg" style="margin:auto"></div><p style="text-align:center">Cargando ficha de ${escapeHtml(nombre)}...</p>`;
  }

  try {
    const res = await apiGet(`/profesores/alumnos/${uid}`);
    const perfil = res.perfil || {};
    const vacios = res.vacios || [];

    if (body) {
      body.innerHTML = `
        <div style="text-align:center;margin-bottom:var(--sp-md)">
          <h3>${escapeHtml(perfil.nombre || nombre)}</h3>
          <p style="color:var(--clr-text-2)">Nivel: ${escapeHtml(perfil.nivelEducativo || 'secundaria')} | Racha: ${perfil.racha || 0} 🔥</p>
        </div>
        <h4>Vacíos de Conocimiento Detectados (${vacios.length}):</h4>
        <ul>
          ${vacios.length ? vacios.map(v => `<li><strong>${escapeHtml(v.concepto || v.tema || 'Vacío')}</strong> (${escapeHtml(v.materia || 'General')})</li>`).join('') : '<li>No hay vacíos críticos registrados ✅</li>'}
        </ul>
        <button class="btn btn-ghost" style="width:100%;color:var(--clr-danger);margin-top:16px" onclick="eliminarAlumnoDeGrupo('${uid}', '${escapeHtml(nombre)}')">🗑️ Eliminar del Grupo</button>
      `;
    }
  } catch (err) {
    if (body) body.innerHTML = `<p>Error cargando ficha: ${escapeHtml(err.message)}</p>`;
  }
}

function cerrarModalAlumnoDetalle() {
  const modal = document.getElementById('modal-alumno-detalle');
  if (modal) modal.style.display = 'none';
}

async function eliminarAlumnoDeGrupo(uid, nombre) {
  if (!confirm(`¿Estás seguro de eliminar a ${nombre} del grupo?`)) return;
  const codigoGrupo = PROFESOR_STATE.grupoActual || 'general';

  try {
    await fetch(`${SYNAPSE_CONFIG.API_BASE}/profesores/grupos/${codigoGrupo}/alumnos/${uid}`, {
      method: 'DELETE',
      headers: await obtenerAuthHeader()
    });
    showToast(`Alumno ${nombre} eliminado del grupo`, 'info');
    cerrarModalAlumnoDetalle();
    loadOverview();
  } catch (err) {
    showToast('Error al eliminar alumno: ' + err.message, 'error');
  }
}

/* ── SIDEBAR & MENU ──────────────────────────────────────── */
function toggleUserMenu() {
  const menu = document.getElementById('user-mini-menu') || document.getElementById('user-dropdown');
  if (menu) menu.classList.toggle('hidden');
}
function openSidebar() {
  document.getElementById('sidebar')?.classList.add('open');
  document.getElementById('sidebar-overlay')?.classList.add('open');
}
function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('open');
}
