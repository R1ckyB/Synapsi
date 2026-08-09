// ============================================================
// chat.js — Chat con el Tutor Socrático
// ============================================================

/* ── SEND MESSAGE ─────────────────────────────────────────── */
async function sendMessage(customMsg) {
  const input = document.getElementById('chat-input');
  const msg   = customMsg || input?.value.trim();
  if (!msg || msg.length === 0) return;

  if (!customMsg && input) {
    input.value = '';
    input.style.height = 'auto';
  }

  const state = window.SynapseState;
  const user  = loadLocal('user') || {};

  // Update counters
  state.chatPreguntasHoy++;
  const statEl = document.getElementById('stat-preguntas');
  if (statEl) statEl.textContent = state.chatPreguntasHoy;
  const changeEl = document.getElementById('stat-preguntas-change');
  if (changeEl) changeEl.textContent = state.chatPreguntasHoy === 1 ? '¡Primera pregunta del día!' : `+1 hoy`;

  // Render user message
  appendMessage('user', msg);

  // Show typing indicator
  const typingId = showTyping();

  // Disable send btn
  const sendBtn = document.getElementById('chat-send-btn');
  if (sendBtn) sendBtn.disabled = true;

  const statusEl = document.getElementById('chat-status');
  if (statusEl) statusEl.textContent = 'Pensando... 🧠';

  try {
    const materiaActual = state.materiaActual || 'General';
    const nivelDominio = user.nivelPorMateria?.[materiaActual] || null;
    const payload = {
      mensaje: msg,
      estudiante: {
        uid:            user.uid || 'anonimo',
        nombre:         user.nombre || 'Estudiante',
        nivelEducativo: user.nivelEducativo || 'secundaria',
        nivelDominio:   nivelDominio,        // resultado del diagnóstico
        materiaActual:  materiaActual,
        grupoId:        user.grupoId || 'general'
      },
      historial: state.historial.slice(-10)  // últimas 10 interacciones
    };

    const data = await apiPost('/tutoria/mensaje', payload);

    // Remove typing
    removeTyping(typingId);

    const respuesta = data.respuesta || 'Lo siento, no pude procesar tu pregunta.';

    // Append tutor response
    appendMessage('tutor', respuesta, {
      estadoEmocional: data.estadoEmocional,
      quiz: data.quizAutoGenerado
    });

    // Save to history
    state.historial.push(
      { role: 'user', text: msg },
      { role: 'model', text: respuesta }
    );
    // Keep history manageable
    if (state.historial.length > 30) state.historial = state.historial.slice(-20);
    saveLocal('historial', state.historial);

    if (statusEl) statusEl.textContent = 'Listo para ayudarte ✨';

  } catch (err) {
    removeTyping(typingId);

    // Demo/offline mode
    const demoResponse = getDemoResponse(msg, state.materiaActual);
    appendMessage('tutor', demoResponse);
    state.historial.push(
      { role: 'user', text: msg },
      { role: 'model', text: demoResponse }
    );

    if (statusEl) statusEl.textContent = 'Modo demo activo 🎭';
    if (!err.message?.includes('demo')) {
      console.warn('Chat API unavailable, using demo mode:', err.message);
    }
  } finally {
    if (sendBtn) sendBtn.disabled = false;
  }
}

/* ── APPEND MESSAGE ──────────────────────────────────────── */
function appendMessage(role, text, extras = {}) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const div = document.createElement('div');
  div.className = `msg msg-${role}`;

  const user  = loadLocal('user') || {};
  const avEmoji = role === 'tutor' ? '🧠' : getInitials(user.nombre || 'U');
  const time    = formatTime();

  // Emotion badge
  let emotionHtml = '';
  if (role === 'tutor' && extras.estadoEmocional && extras.estadoEmocional !== 'neutral') {
    const emojiMap = { motivado: '💪', confundido: '🤔', frustrado: '😟' };
    const cls      = extras.estadoEmocional.toLowerCase();
    emotionHtml    = `<div class="emotion-badge emotion-${cls}">${emojiMap[cls] || '💬'} ${cls.charAt(0).toUpperCase() + cls.slice(1)}</div>`;
  }

  // Format text: markdown-lite
  const formattedText = formatChatText(text);

  // Quiz card inside message
  let quizHtml = '';
  if (extras.quiz?.preguntas?.length) {
    const q = extras.quiz.preguntas[0];
    const idxCorrecta = typeof q.respuestaCorrectaIndex === 'number'
      ? q.respuestaCorrectaIndex
      : (typeof q.respuestaCorrecta === 'number' ? q.respuestaCorrecta : 0);

    const opts = (q.opciones || []).map((op, i) =>
      `<div class="quiz-option" onclick="handleInlineQuizAnswer(this, ${i === idxCorrecta}, '${escapeHtml(q.explicacion || '')}')">
         ${String.fromCharCode(65+i)}. ${escapeHtml(op)}
       </div>`
    ).join('');
    quizHtml = `
      <div class="chat-quiz-card" style="margin-top:12px">
        <div class="chat-quiz-title">🧩 Quiz Automático: ${escapeHtml(q.pregunta || '')}</div>
        ${opts}
      </div>`;
  }

  div.innerHTML = `
    <div class="msg-avatar">${avEmoji}</div>
    <div>
      ${emotionHtml}
      <div class="msg-bubble">${formattedText}${quizHtml}</div>
      <div class="msg-time">${time}</div>
    </div>`;

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

/* ── FORMAT TEXT (markdown-lite) ─────────────────────────── */
function formatChatText(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code style="background:rgba(255,255,255,0.1);padding:1px 5px;border-radius:4px;font-family:monospace">$1</code>')
    .replace(/\n\n/g, '</p><p style="margin-top:8px">')
    .replace(/\n/g, '<br>');
}

/* ── TYPING INDICATOR ────────────────────────────────────── */
function showTyping() {
  const container = document.getElementById('chat-messages');
  if (!container) return null;

  const id = 'typing-' + Date.now();
  const div = document.createElement('div');
  div.className = 'msg msg-tutor';
  div.id = id;
  div.innerHTML = `
    <div class="msg-avatar">🧠</div>
    <div class="typing-indicator">
      <div class="typing-dots"><span></span><span></span><span></span></div>
      <span class="typing-label">Synapse está pensando...</span>
    </div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return id;
}

function removeTyping(id) {
  if (id) document.getElementById(id)?.remove();
}

/* ── KEYBOARD HANDLER ────────────────────────────────────── */
function handleChatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

/* ── INLINE QUIZ ANSWER ──────────────────────────────────── */
function handleInlineQuizAnswer(el, isCorrect, explanation) {
  const parent = el.parentElement;
  parent.querySelectorAll('.quiz-option').forEach(o => {
    o.style.pointerEvents = 'none';
    o.style.opacity = '0.6';
  });
  el.style.opacity = '1';
  el.classList.add(isCorrect ? 'correct' : 'wrong');

  if (!isCorrect && explanation) {
    const hint = document.createElement('div');
    hint.style.cssText = 'font-size:0.78rem;color:var(--clr-warn);margin-top:6px;';
    hint.textContent = '💡 ' + explanation;
    parent.appendChild(hint);
  }

  const state = window.SynapseState;
  state.quizTotal++;
  if (isCorrect) {
    state.quizCorrects++;
    showToast('¡Correcto! 🎉', 'success', 2000);
  } else {
    showToast('Incorrecto — ¡sigue intentando! 💪', 'error', 2000);
  }
  // Update stat
  const statEl = document.getElementById('stat-quizzes');
  if (statEl) statEl.textContent = `${state.quizCorrects}`;
}

/* ── CLEAR CHAT ──────────────────────────────────────────── */
function clearChat() {
  const container = document.getElementById('chat-messages');
  if (!container) return;
  container.innerHTML = '';
  window.SynapseState.historial = [];
  clearLocal('historial');

  // Re-show welcome
  appendMessage('tutor', '¡Chat reiniciado! ¿Sobre qué tema tienes dudas ahora? 🚀');
}

/* ── EXPORT CHAT ─────────────────────────────────────────── */
function exportChat() {
  const hist = window.SynapseState.historial;
  if (!hist.length) { showToast('No hay conversación para exportar', 'info'); return; }

  const text = hist.map(h =>
    `[${h.role === 'user' ? 'Tú' : 'Synapse'}]: ${h.text}`
  ).join('\n\n');

  const blob = new Blob([`# Sesión de Tutoría Synapse\n\n${text}`], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `synapse-sesion-${Date.now()}.md`;
  a.click(); URL.revokeObjectURL(url);
  showToast('Chat exportado 📤', 'success');
}

/* ── CAMBIAR MATERIA ─────────────────────────────────────── */
function cambiarMateria(materia) {
  window.SynapseState.materiaActual = materia;
  const el = document.getElementById('stat-materia-actual');
  if (el) el.textContent = materia;
  if (typeof actualizarPreguntaDia === 'function') {
    actualizarPreguntaDia(materia);
  }
  showToast(`Materia cambiada a ${materia} 📚`, 'info', 2000);
}

/* ── SELECT MATERIA (sidebar) ────────────────────────────── */
function selectMateria(el, materia) {
  document.querySelectorAll('.materia-item').forEach(i => i.classList.remove('active'));
  el.classList.add('active');
  cambiarMateria(materia);

  // Sync topbar selector
  const sel = document.getElementById('materia-selector');
  if (sel) sel.value = materia;
}

/* ── REQUEST QUIZ ────────────────────────────────────────── */
function requestQuiz() {
  const materia = window.SynapseState.materiaActual;
  sendMessage(`Genera un quiz de 3 preguntas sobre ${materia} para evaluar lo que hemos estado practicando.`);
}

/* ── QUESTION OF THE DAY (IA GEMINI) ─────────────────────── */
function sendQuestionOfDay() {
  const materia = window.SynapseState.materiaActual || 'Matemáticas';
  const user = window.SynapseState.user || {};
  const nivel = user.nivelEducativo || 'secundaria';
  
  showView('chat');
  setTimeout(() => {
    sendMessage(`Dame el reto del día de ${materia} adaptado a nivel ${nivel}. Plantéame una pregunta socrática o acertijo interesante para empezar a razonar.`);
  }, 200);
}

/* ── IMAGE FROM CHAT ─────────────────────────────────────── */
function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  window.SynapseState.pendingImageFile = file;

  // Show modal
  const preview = document.getElementById('modal-img-preview');
  if (preview) preview.src = URL.createObjectURL(file);
  document.getElementById('img-chat-modal')?.classList.add('open');
}

function closeImgModal() {
  document.getElementById('img-chat-modal')?.classList.remove('open');
  window.SynapseState.pendingImageFile = null;
  const inp = document.getElementById('file-input-img');
  if (inp) inp.value = '';
}

async function sendImageFromChat() {
  const file = window.SynapseState.pendingImageFile;
  if (!file) return;

  const pregunta = document.getElementById('modal-img-q')?.value.trim() || '¿Puedes analizar esto?';
  closeImgModal();

  appendMessage('user', `📸 Envié una imagen: "${pregunta}"`);
  const typingId = showTyping();

  try {
    const form = new FormData();
    form.append('imagen', file);
    form.append('pregunta', pregunta);
    form.append('materia', window.SynapseState.materiaActual);
    const user = loadLocal('user') || {};
    form.append('uid', user.uid || 'anonimo');
    form.append('nombre', user.nombre || 'Estudiante');
    form.append('nivelEducativo', user.nivelEducativo || 'secundaria');

    const data = await apiPostForm('/imagen/analizar', form);
    removeTyping(typingId);

    const analisis = data.analisis;
    const resp = analisis?.guia_socratica || analisis?.observacion || JSON.stringify(analisis);
    appendMessage('tutor', resp || 'Analicé tu imagen. ¿Tienes más preguntas al respecto?');
  } catch (err) {
    removeTyping(typingId);
    appendMessage('tutor', '🎭 (Demo) Vi tu imagen. Cuéntame qué área específica quieres entender mejor para guiarte mejor.');
  }
}

/* ── DEMO RESPONSES ──────────────────────────────────────── */
function getDemoResponse(msg, materia) {
  const texto = (msg || '').toLowerCase().trim();

  // Saludos e inicio de conversación
  if (/^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|saludos|que tal)/i.test(texto)) {
    return `¡Hola! 👋 Qué gusto saludarte. Estoy listo para ayudarte con **${materia}**. ¿En qué ejercicio o concepto específico quieres que trabajemos hoy?`;
  }

  // Agradecimientos
  if (/(gracias|muchas gracias|agradecido|excelente|te lo agradezco)/i.test(texto)) {
    return `¡Con mucho gusto! 🌟 Recuerda que el mérito es tuyo por reflexionar y razonar cada paso. ¿Tienes alguna otra duda de **${materia}** o quieres hacer un quiz corto de repaso?`;
  }

  // Expresiones de confusión o frustración
  if (/(no entiendo|confundido|dificil|no se|ayuda|me perdi|complicado)/i.test(texto)) {
    return `No te preocupes, es completamente normal en **${materia}**. Vamos a simplificarlo: si pudieras dividir este problema en dos partes más sencillas, ¿cuál sería el primer dato que conocemos? 🧩`;
  }

  // Petición explícita de respuestas directas
  if (/(dame la respuesta|dime el resultado|resuelve|cuanto es|dime la solucion)/i.test(texto)) {
    return `Entiendo que quieras la respuesta directa, pero mi objetivo es enseñarte a resolverlo tú mismo 💪. Para guiarte en **${materia}**: ¿qué fórmula o paso crees que deberíamos aplicar primero?`;
  }

  // Respuesta contextual según la longitud o temática del mensaje
  if (texto.length < 15) {
    return `Veo que mencionas "*${escapeHtml(msg)}*". ¿Podrías darme un poco más de contexto sobre tu duda en **${materia}**? Por ejemplo, ¿en qué paso del problema te trabaste? 🤔`;
  }

  const responses = [
    `Analizando tu duda sobre "*${escapeHtml(msg)}*" en **${materia}** 🧐: ¿qué regla o concepto básico recuerdas que se aplique en este tipo de ejercicios?`,
    `Interesante planteamiento sobre "*${escapeHtml(msg)}*". Antes de darte la solución, cuéntame: ¿qué hipótesis tienes tú sobre por qué ocurre esto en **${materia}**? 🧠`,
    `Muy buen intento al preguntar sobre "*${escapeHtml(msg)}*". Para avanzar juntos en **${materia}**: ¿cuál crees que sería el primer paso lógico para abordar este problema? 💡`,
    `¡Excelente punto! En **${materia}**, al revisar "*${escapeHtml(msg)}*", ¿puedes identificar qué datos nos está dando el problema y qué nos están pidiendo encontrar? ⚡`,
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

/* ── TOGGLE RECORD IN CHAT ───────────────────────────────── */
async function toggleRecordChat() {
  const state = window.SynapseState;
  const btn   = document.getElementById('btn-record-chat');
  const label = document.getElementById('record-chat-label');

  if (!state.isRecording) {
    // Start recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      state.audioChunks = [];
      state.mediaRecorder = new MediaRecorder(stream);
      state.mediaRecorder.ondataavailable = e => state.audioChunks.push(e.data);
      state.mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(state.audioChunks, { type: 'audio/webm' });
        await processAudioBlob(blob, 'chat');
      };
      state.mediaRecorder.start();
      state.isRecording = true;
      btn?.classList.add('recording');
      if (label) label.textContent = 'Detener ⏹';

      // Timer
      state.recordSeconds = 0;
      state.recordTimer = setInterval(() => {
        state.recordSeconds++;
        if (label) label.textContent = `${formatSecs(state.recordSeconds)} ⏹`;
        if (state.recordSeconds >= 120) stopRecordChat(); // auto-stop at 2min
      }, 1000);

      showToast('🔴 Grabando... habla con claridad', 'info', 2000);
    } catch(e) {
      showToast('No se pudo acceder al micrófono', 'error');
    }
  } else {
    stopRecordChat();
  }
}

function stopRecordChat() {
  const state = window.SynapseState;
  if (state.recordTimer) clearInterval(state.recordTimer);
  state.mediaRecorder?.stop();
  state.isRecording = false;
  const btn   = document.getElementById('btn-record-chat');
  const label = document.getElementById('record-chat-label');
  btn?.classList.remove('recording');
  if (label) label.textContent = 'Nota de voz';
}

async function processAudioBlob(blob, context = 'audio') {
  const typingId = context === 'chat' ? showTyping() : null;
  if (context === 'chat') appendMessage('user', '🎙️ Envié una nota de voz');

  try {
    const form = new FormData();
    form.append('audio', blob, 'grabacion.webm');
    const user = loadLocal('user') || {};
    form.append('uid', user.uid || 'anonimo');
    form.append('materia', window.SynapseState.materiaActual);

    const data = await apiPostForm('/audio/procesar', form);
    if (typingId) removeTyping(typingId);

    if (context === 'chat') {
      const resumen = data.resumen || data.transcripcion || 'Audio procesado';
      appendMessage('tutor', `🎵 **Audio analizado:**\n\n${resumen}\n\n¿Tienes alguna duda sobre esto?`);
    } else {
      displayAudioResult(data);
    }
  } catch(err) {
    if (typingId) removeTyping(typingId);
    if (context === 'chat') {
      appendMessage('tutor', '🎭 (Demo) Escuché tu nota de voz. ¿Sobre qué tema específico necesitas apoyo? Cuéntame con texto mientras conectamos el procesador de audio.');
    } else {
      displayAudioResult({
        resumen: '(Demo) Transcripción de audio no disponible sin backend.',
        puntosClave: ['Conecta el backend para activar el procesamiento de voz'],
        preguntasRepaso: []
      });
    }
  }
}
