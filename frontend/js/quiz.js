// ============================================================
// quiz.js — Quiz Generator & Player
// ============================================================

let _quiz = { preguntas: [], index: 0, correctas: 0 };

/* ── GENERATE QUIZ ───────────────────────────────────────── */
async function generateQuiz() {
  const tema    = document.getElementById('quiz-tema')?.value.trim();
  const cant    = parseInt(document.getElementById('quiz-cant')?.value || '5');
  const dif     = document.getElementById('quiz-dif')?.value || 'intermedio';
  const materia = document.getElementById('quiz-materia-sel')?.value ||
                  window.SynapseState?.materiaActual || 'General';

  if (!tema) { showToast('Escribe un tema para el quiz', 'error'); return; }

  // Hide previous results
  document.getElementById('quiz-active')?.classList.add('hidden');
  document.getElementById('quiz-result')?.classList.add('hidden');

  // Loading state
  const btn    = document.getElementById('btn-gen-quiz');
  const btnTxt = document.getElementById('btn-gen-quiz-text');
  const spin   = document.getElementById('btn-gen-quiz-spin');
  if (btn) btn.disabled = true;
  if (btnTxt) btnTxt.textContent = 'Generando con Gemini...';
  if (spin)   spin.classList.remove('hidden');

  try {
    const user = loadLocal('user') || {};
    const data = await apiPost('/quizzes/generar', {
      tema,
      materia,
      nivelEducativo: user.nivelEducativo || 'secundaria',
      numPreguntas: cant,
      dificultad: dif
    });

    const preguntas = data.preguntas || data.quiz?.preguntas || [];
    if (!preguntas.length) throw new Error('El quiz no tiene preguntas');

    startQuizPlayer(preguntas);
    showToast(`Quiz de ${preguntas.length} preguntas generado ✨`, 'success');

  } catch(err) {
    // Demo quiz
    const demoPreguntas = getDemoQuiz(tema, materia, cant);
    startQuizPlayer(demoPreguntas);
    showToast('🎭 Quiz demo (sin backend)', 'info', 2500);
  } finally {
    if (btn)    btn.disabled = false;
    if (btnTxt) btnTxt.textContent = '✨ Generar Quiz con Gemini';
    if (spin)   spin.classList.add('hidden');
  }
}

/* ── START QUIZ PLAYER ───────────────────────────────────── */
function startQuizPlayer(preguntas) {
  _quiz = { preguntas, index: 0, correctas: 0 };
  window.SynapseState.currentQuiz = _quiz;

  document.getElementById('quiz-active')?.classList.remove('hidden');
  document.getElementById('quiz-result')?.classList.add('hidden');

  renderQuestion();
}

/* ── RENDER QUESTION ─────────────────────────────────────── */
function renderQuestion() {
  const q     = _quiz.preguntas[_quiz.index];
  const total = _quiz.preguntas.length;
  const pct   = (_quiz.index / total) * 100;

  // Progress
  const progBadge = document.getElementById('quiz-prog-badge');
  const scoreBadge = document.getElementById('quiz-score-badge');
  const progBar    = document.getElementById('quiz-progress-bar');
  if (progBadge)  progBadge.textContent  = `Pregunta ${_quiz.index + 1} / ${total}`;
  if (scoreBadge) scoreBadge.textContent = `${_quiz.correctas} correcta${_quiz.correctas !== 1 ? 's' : ''}`;
  if (progBar)    progBar.style.width    = pct + '%';

  // Question text
  const qText = document.getElementById('quiz-question-text');
  if (qText) qText.textContent = q.pregunta || 'Sin pregunta';

  // Options
  const container = document.getElementById('quiz-options-container');
  if (!container) return;
  container.innerHTML = '';

  const opciones = q.opciones || [];
  opciones.forEach((op, i) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-option-btn';
    btn.id = `quiz-opt-${i}`;
    btn.onclick = () => selectQuizAnswer(i, q);
    btn.innerHTML = `
      <div class="quiz-option-letter">${String.fromCharCode(65 + i)}</div>
      <span>${escapeHtml(op)}</span>`;
    container.appendChild(btn);
  });

  // Hide feedback & next
  const fb  = document.getElementById('quiz-feedback');
  const nxt = document.getElementById('btn-quiz-next');
  if (fb)  { fb.className = 'quiz-feedback hidden'; fb.innerHTML = ''; }
  if (nxt) nxt.style.display = 'none';
}

/* ── SELECT ANSWER ───────────────────────────────────────── */
function selectQuizAnswer(chosenIdx, question) {
  const correctIdx = typeof question.respuestaCorrectaIndex === 'number'
    ? question.respuestaCorrectaIndex
    : (typeof question.respuestaCorrecta === 'number' ? question.respuestaCorrecta : 0);

  const isCorrect = chosenIdx === correctIdx;

  // Disable all options
  document.querySelectorAll('.quiz-option-btn').forEach((btn, i) => {
    btn.disabled = true;
    if (i === correctIdx)  btn.classList.add('correct');
    if (i === chosenIdx && !isCorrect) btn.classList.add('wrong');
  });

  // Show feedback
  const fb = document.getElementById('quiz-feedback');
  if (fb) {
    fb.className = `quiz-feedback ${isCorrect ? 'correct' : 'wrong'}`;
    fb.innerHTML = isCorrect
      ? `✅ <strong>¡Correcto!</strong> ${escapeHtml(question.explicacion || '¡Excelente!')}`
      : `❌ <strong>Incorrecto.</strong> La respuesta era <strong>${escapeHtml(question.opciones?.[correctIdx] || '')}</strong>. ${escapeHtml(question.explicacion || '')}`;
  }

  // Update score
  if (isCorrect) {
    _quiz.correctas++;
    window.SynapseState.quizCorrects++;
    showToast('¡Correcto! 🎉', 'success', 1500);
  }
  window.SynapseState.quizTotal++;

  // Show next button
  const nxt = document.getElementById('btn-quiz-next');
  if (nxt) {
    nxt.style.display = 'inline-flex';
    nxt.textContent   = _quiz.index < _quiz.preguntas.length - 1
      ? 'Siguiente →'
      : 'Ver Resultados 🏆';
  }

  // Update score badge
  const scoreBadge = document.getElementById('quiz-score-badge');
  if (scoreBadge) scoreBadge.textContent = `${_quiz.correctas} correcta${_quiz.correctas !== 1 ? 's' : ''}`;
}

/* ── NEXT QUESTION ───────────────────────────────────────── */
function nextQuestion() {
  _quiz.index++;
  if (_quiz.index >= _quiz.preguntas.length) {
    showQuizResult();
  } else {
    renderQuestion();
  }
}

/* ── SHOW RESULT ─────────────────────────────────────────── */
function showQuizResult() {
  document.getElementById('quiz-active')?.classList.add('hidden');
  const resultDiv = document.getElementById('quiz-result');
  if (!resultDiv) return;
  resultDiv.classList.remove('hidden');

  const total    = _quiz.preguntas.length;
  const correctas = _quiz.correctas;
  const pct       = Math.round((correctas / total) * 100);

  // Stars
  const stars = pct >= 80 ? '⭐⭐⭐' : pct >= 60 ? '⭐⭐' : '⭐';
  const msg   = pct >= 80
    ? '¡Excelente! Dominas muy bien este tema 🏆'
    : pct >= 60
    ? '¡Bien! Sigue practicando para mejorar 💪'
    : '¡No te rindas! Consulta al tutor sobre los temas en los que fallaste 🤝';

  const starsEl = document.getElementById('result-stars');
  const scoreEl = document.getElementById('result-score');
  const msgEl   = document.getElementById('result-msg');
  if (starsEl) starsEl.textContent = stars;
  if (scoreEl) scoreEl.textContent = `${pct}%`;
  if (msgEl)   msgEl.textContent   = `${correctas} de ${total} correctas — ${msg}`;

  // Update global stats
  const statQuiz = document.getElementById('stat-quizzes');
  if (statQuiz) statQuiz.textContent = window.SynapseState.quizCorrects;

  // Persist session score (opcional)
  showToast(`Quiz completado: ${pct}% ✨`, pct >= 60 ? 'success' : 'info');
}

/* ── DEMO QUIZ ───────────────────────────────────────────── */
function getDemoQuiz(tema, materia, n = 3) {
  const bank = [
    {
      pregunta: `¿Cuál de los siguientes es un concepto fundamental de ${tema}?`,
      opciones: ['Definición correcta del tema', 'Un concepto no relacionado', 'Una definición incorrecta', 'Ninguna de las anteriores'],
      respuestaCorrecta: 0,
      explicacion: `La definición correcta de ${tema} es clave para entender el concepto.`
    },
    {
      pregunta: `¿En qué materia se estudia principalmente ${tema}?`,
      opciones: [materia, 'Arte', 'Educación Física', 'Literatura'],
      respuestaCorrecta: 0,
      explicacion: `${tema} es un tema central en ${materia}.`
    },
    {
      pregunta: `¿Para qué sirve entender ${tema}?`,
      opciones: ['Para resolver problemas prácticos', 'Para nada', 'Solo para el examen', 'Solo a los profesores'],
      respuestaCorrecta: 0,
      explicacion: `Entender ${tema} tiene aplicaciones directas en la vida real.`
    },
    {
      pregunta: `¿Qué herramienta usarías para aprender mejor ${tema}?`,
      opciones: ['Practicar con ejercicios', 'Ignorarlo', 'Memorizar sin entender', 'Copiar del compañero'],
      respuestaCorrecta: 0,
      explicacion: `La práctica activa es la mejor forma de dominar ${tema}.`
    },
    {
      pregunta: `¿Cómo se relaciona ${tema} con otros conceptos de ${materia}?`,
      opciones: ['Se conecta con varios conceptos previos', 'No tiene relación', 'Es un tema aislado', 'Solo aparece en exámenes finales'],
      respuestaCorrecta: 0,
      explicacion: `Los conceptos en ${materia} están interconectados y ${tema} no es la excepción.`
    }
  ];
  return bank.slice(0, Math.min(n, bank.length));
}
