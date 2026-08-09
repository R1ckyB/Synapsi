// ============================================================
// diagnostico.js — Examen Diagnóstico por Materia
// Synapse - Frontend
// ============================================================

let currentDiagnosticoQuiz = null;
let diagnosticoRespuestas = [];
let currentDiagnosticoIndex = 0;
let materiaDiagnostico = 'Matemáticas';

/** Abre el modal de examen diagnóstico */
function abrirModalDiagnostico() {
  const modal = document.getElementById('modal-diagnostico');
  if (!modal) return;

  renderSeleccionMateriaDiagnostico();
  modal.style.display = 'flex';
}

/** Cierra el modal */
function cerrarModalDiagnostico() {
  const modal = document.getElementById('modal-diagnostico');
  if (modal) modal.style.display = 'none';
}

/** Paso 1: Selección de materia para diagnóstico */
function renderSeleccionMateriaDiagnostico() {
  const container = document.getElementById('diagnostico-content');
  if (!container) return;

  const materias = [
    { id: 'Matemáticas', name: '📐 Matemáticas' },
    { id: 'Física',      name: '⚛️ Física' },
    { id: 'Química',     name: '🧪 Química' },
    { id: 'Biología',    name: '🧬 Biología' },
    { id: 'Historia',    name: '📜 Historia' },
    { id: 'Español',     name: '📚 Lengua Española' },
  ];

  const html = `
    <p style="color:var(--clr-text-muted);font-size:0.9rem;margin-bottom:var(--sp-lg)">
      Realiza una evaluación diagnóstica rápida de 5 preguntas generadas por Gemini para ajustar la dificultad del tutor a tu nivel real.
    </p>

    <div class="input-group" style="margin-bottom:var(--sp-lg)">
      <label class="input-label">Selecciona la materia a evaluar:</label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-sm);margin-top:8px">
        ${materias.map(m => `
          <button class="btn btn-ghost" style="justify-content:flex-start;text-align:left;padding:12px;border:1px solid var(--clr-border)"
            onclick="iniciarExamenDiagnostico('${m.id}')">
            ${m.name}
          </button>
        `).join('')}
      </div>
    </div>
  `;

  container.innerHTML = html;
}

/** Paso 2: Generar y comenzar examen con Gemini */
async function iniciarExamenDiagnostico(materia) {
  materiaDiagnostico = materia;
  const container = document.getElementById('diagnostico-content');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align:center;padding:var(--sp-xl)">
      <div class="spinner" style="margin:0 auto var(--sp-md)"></div>
      <div style="font-weight:700;font-size:1.1rem">Generando diagnóstico de ${materia}...</div>
      <div style="color:var(--clr-text-muted);font-size:0.85rem;margin-top:4px">Gemini 2.0 Flash está adaptando las preguntas a tu grado</div>
    </div>
  `;

  try {
    const user = loadLocal('user') || {};
    const nivelEducativo = user.nivelEducativo || 'secundaria';

    const data = await apiPost('/quizzes/diagnostico', { materia, nivelEducativo });

    if (!data.exito || !data.quiz) throw new Error('No se pudo generar el diagnóstico');

    currentDiagnosticoQuiz = data.quiz;
    diagnosticoRespuestas = [];
    currentDiagnosticoIndex = 0;

    renderPreguntaDiagnostico();
  } catch (err) {
    showToast('Error al generar diagnóstico: ' + err.message, 'error');
    renderSeleccionMateriaDiagnostico();
  }
}

/** Renderiza la pregunta actual del diagnóstico */
function renderPreguntaDiagnostico() {
  const container = document.getElementById('diagnostico-content');
  const q = currentDiagnosticoQuiz.preguntas[currentDiagnosticoIndex];
  const total = currentDiagnosticoQuiz.preguntas.length;

  if (!q) return;

  const html = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--sp-md)">
      <span class="badge badge-primary">Pregunta ${currentDiagnosticoIndex + 1} de ${total}</span>
      <span style="font-size:0.8rem;color:var(--clr-text-muted)">Materia: ${materiaDiagnostico}</span>
    </div>

    <div style="font-weight:700;font-size:1.05rem;margin-bottom:var(--sp-lg);line-height:1.4">
      ${escapeHtml(q.pregunta)}
    </div>

    <div style="display:flex;flex-direction:column;gap:var(--sp-sm);margin-bottom:var(--sp-xl)">
      ${q.opciones.map((op, idx) => `
        <button class="btn btn-ghost" style="justify-content:flex-start;text-align:left;padding:12px 16px;border:1px solid var(--clr-border);border-radius:var(--r-md)"
          onclick="responderDiagnostico(${idx})">
          <span style="font-weight:700;margin-right:8px;color:var(--clr-primary-l)">${String.fromCharCode(65 + idx)})</span>
          ${escapeHtml(op)}
        </button>
      `).join('')}
    </div>

    <div class="progress-track" style="height:6px">
      <div class="progress-fill" style="width:${((currentDiagnosticoIndex + 1) / total) * 100}%"></div>
    </div>
  `;

  container.innerHTML = html;
}

/** Guarda la respuesta elegida y avanza a la siguiente o evalúa */
function responderDiagnostico(opcionIndex) {
  diagnosticoRespuestas.push(opcionIndex);
  currentDiagnosticoIndex++;

  if (currentDiagnosticoIndex < currentDiagnosticoQuiz.preguntas.length) {
    renderPreguntaDiagnostico();
  } else {
    finalizarExamenDiagnostico();
  }
}

/** Paso 3: Calcular resultado y actualizar nivel por materia */
async function finalizarExamenDiagnostico() {
  const container = document.getElementById('diagnostico-content');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align:center;padding:var(--sp-xl)">
      <div class="spinner" style="margin:0 auto var(--sp-md)"></div>
      <div style="font-weight:700">Calculando tu nivel de dominio...</div>
    </div>
  `;

  try {
    const res = await fetch('/api/quizzes/evaluar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quiz: currentDiagnosticoQuiz, respuestas: diagnosticoRespuestas })
    });
    const data = await res.json();
    const resultado = data.resultado;

    // Determinar nivel asignado
    let nivelAsignado = 'Básico';
    if (resultado.porcentaje >= 80) nivelAsignado = 'Avanzado';
    else if (resultado.porcentaje >= 50) nivelAsignado = 'Intermedio';

    // Guardar en el perfil del usuario local
    const user = loadLocal('user') || {};
    if (!user.nivelPorMateria) user.nivelPorMateria = {};
    user.nivelPorMateria[materiaDiagnostico] = nivelAsignado;
    user.diagnosticoHecho = true;
    saveLocal('user', user);

    const html = `
      <div style="text-align:center;padding:var(--sp-md)">
        <div style="font-size:3rem;margin-bottom:var(--sp-xs)">🏆</div>
        <h3 style="font-weight:800;font-size:1.3rem;margin-bottom:4px">¡Diagnóstico Completado!</h3>
        <p style="color:var(--clr-text-muted);font-size:0.9rem;margin-bottom:var(--sp-lg)">
          Puntuación: <b>${resultado.correctas} de ${resultado.totalPreguntas} (${resultado.porcentaje}%)</b>
        </p>

        <div style="background:var(--clr-bg-2);border:2px solid var(--clr-primary);border-radius:var(--r-xl);padding:var(--sp-lg);margin-bottom:var(--sp-lg)">
          <div style="font-size:0.8rem;text-transform:uppercase;letter-spacing:1px;color:var(--clr-text-muted)">Tu nivel asignado en ${materiaDiagnostico}</div>
          <div style="font-size:2rem;font-weight:900;color:var(--clr-primary-l);margin-top:4px">${nivelAsignado}</div>
        </div>

        <p style="font-size:0.85rem;color:var(--clr-text-muted);margin-bottom:var(--sp-lg)">
          El tutor socrático ahora adaptará automáticamente la dificultad de las explicaciones a tu nivel de <b>${nivelAsignado}</b> en ${materiaDiagnostico}.
        </p>

        <button class="btn btn-primary" style="width:100%" onclick="cerrarModalDiagnostico()">
          🚀 Continuar a mi Estudio
        </button>
      </div>
    `;

    container.innerHTML = html;
    showToast(`Diagnóstico en ${materiaDiagnostico}: ${nivelAsignado} 🎉`, 'success', 4000);
  } catch (err) {
    showToast('Diagnóstico completado localmente 🎉', 'success');
    cerrarModalDiagnostico();
  }
}

/** Carga los anuncios del profesor en el dashboard del estudiante */
async function cargarAnunciosEstudiante() {
  const container = document.getElementById('anuncios-estudiante-wrap');
  if (!container) return;

  const user = loadLocal('user') || {};
  const grupoId = user.grupoId || 'general';

  try {
    const res = await fetch(`/api/profesores/anuncios/${grupoId}`);
    const data = await res.json();

    if (data.exito && data.anuncios && data.anuncios.length > 0) {
      const a = data.anuncios[0];
      container.innerHTML = `
        <div style="background:var(--clr-bg-2);border:1px solid var(--clr-primary);border-radius:var(--r-lg);padding:var(--sp-md);display:flex;align-items:center;gap:var(--sp-md)">
          <span style="font-size:1.5rem">📢</span>
          <div style="flex:1">
            <div style="font-weight:700;font-size:0.9rem">${escapeHtml(a.titulo || 'Anuncio del Profesor')}</div>
            <div style="font-size:0.83rem;color:var(--clr-text-muted)">${escapeHtml(a.contenido)}</div>
          </div>
        </div>
      `;
    }
  } catch (err) { /* ignore */ }
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(cargarAnunciosEstudiante, 1000);
});
