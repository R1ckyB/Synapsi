// ============================================================
// audio.js — Audio Recording & Processing
// ============================================================

/* ── TOGGLE RECORD ───────────────────────────────────────── */
async function toggleRecord() {
  const state = window.SynapseState;
  if (!state.isRecording) {
    await startRecord();
  } else {
    stopRecord();
  }
}

async function startRecord() {
  const state = window.SynapseState;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.audioChunks = [];
    state.mediaRecorder = new MediaRecorder(stream);
    state.mediaRecorder.ondataavailable = e => state.audioChunks.push(e.data);
    state.mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(state.audioChunks, { type: 'audio/webm' });
      enableProcessBtn(blob);
    };
    state.mediaRecorder.start();
    state.isRecording = true;

    // UI update
    const btn = document.getElementById('record-btn');
    const statusEl = document.getElementById('record-status');
    if (btn) { btn.classList.add('recording'); btn.textContent = '⏹'; }
    if (statusEl) statusEl.textContent = 'Grabando... habla claramente 🎙️';

    // Timer
    state.recordSeconds = 0;
    const timeEl = document.getElementById('record-time');
    state.recordTimer = setInterval(() => {
      state.recordSeconds++;
      if (timeEl) timeEl.textContent = formatSecs(state.recordSeconds);
      if (state.recordSeconds >= 180) stopRecord(); // max 3min
    }, 1000);

    showToast('🔴 Grabación iniciada', 'info', 1500);
  } catch(e) {
    showToast('No se pudo acceder al micrófono. Verifica los permisos del navegador.', 'error');
  }
}

function stopRecord() {
  const state = window.SynapseState;
  if (!state.isRecording) return;
  if (state.recordTimer) clearInterval(state.recordTimer);
  state.mediaRecorder?.stop();
  state.isRecording = false;

  const btn = document.getElementById('record-btn');
  const statusEl = document.getElementById('record-status');
  if (btn) { btn.classList.remove('recording'); btn.textContent = '🎙️'; }
  if (statusEl) statusEl.textContent = 'Audio grabado ✅ — haz clic en Analizar';
  showToast('Grabación guardada ✅', 'success', 2000);
}

function enableProcessBtn(blob) {
  window._pendingAudioBlob = blob;
  const btn = document.getElementById('btn-process-audio');
  if (btn) btn.style.display = 'flex';
}

/* ── PROCESS AUDIO (from record btn) ─────────────────────── */
async function processAudio() {
  const blob = window._pendingAudioBlob;
  if (!blob) { showToast('No hay audio grabado', 'error'); return; }
  await sendAudioToAPI(blob);
}

/* ── HANDLE AUDIO FILE ───────────────────────────────────── */
function handleAudioFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) { showToast('El archivo supera 10MB', 'error'); return; }
  showToast(`Archivo seleccionado: ${file.name} 🎵`, 'info', 2000);
  sendAudioToAPI(file);
}

function handleAudioDrop(event) {
  event.preventDefault();
  handleDragLeave('audio-upload-zone');
  const file = event.dataTransfer.files[0];
  if (!file?.type.startsWith('audio/')) { showToast('Solo se permiten archivos de audio', 'error'); return; }
  sendAudioToAPI(file);
}

/* ── SEND AUDIO TO API ───────────────────────────────────── */
async function sendAudioToAPI(audioData) {
  const zone = document.getElementById('audio-upload-zone');
  if (zone) zone.innerHTML = `<div class="spinner spinner-lg" style="margin:auto"></div><p style="margin-top:var(--sp-md);color:var(--clr-text-2)">Procesando con Gemini... 🧠</p>`;

  try {
    const form = new FormData();
    form.append('audio', audioData, 'audio.webm');
    const user = loadLocal('user') || {};
    form.append('uid', user.uid || 'anonimo');
    form.append('materia', window.SynapseState?.materiaActual || 'General');
    form.append('nivelEducativo', user.nivelEducativo || 'secundaria');

    const data = await apiPostForm('/audio/procesar', form);
    displayAudioResult(data);
  } catch(err) {
    console.warn('Audio API error, using demo:', err.message);
    displayAudioResult({
      resumen: `🎭 (Demo) Audio recibido. En producción, Gemini transcribirá tu audio y generará: resumen, puntos clave y preguntas de repaso.`,
      puntosClave: [
        'Transcripción automática con Gemini',
        'Resumen estructurado del contenido',
        'Generación de preguntas de repaso'
      ],
      preguntasRepaso: [
        '¿Cuáles son los puntos principales del tema?',
        '¿Cómo se aplica este concepto en la práctica?',
        '¿Qué relación tiene con otros temas que has estudiado?'
      ]
    });
  } finally {
    // Restore upload zone
    if (zone) {
      zone.innerHTML = `
        <div class="upload-icon">🎵</div>
        <div class="upload-title">O sube un archivo de audio</div>
        <div class="upload-sub">MP3, WAV, M4A, OGG · Máx 10MB</div>`;
    }
    // Reset process btn
    const btn = document.getElementById('btn-process-audio');
    if (btn) btn.style.display = 'none';
    window._pendingAudioBlob = null;
  }
}

/* ── DISPLAY AUDIO RESULT ────────────────────────────────── */
function displayAudioResult(data) {
  const resultDiv = document.getElementById('audio-result');
  if (!resultDiv) return;
  resultDiv.classList.remove('hidden');

  const resumenEl  = document.getElementById('audio-resumen');
  const puntosEl   = document.getElementById('audio-puntos');
  const preguntaEl = document.getElementById('audio-preguntas');

  if (resumenEl) resumenEl.textContent = data.resumen || data.transcripcion || '—';

  if (puntosEl) {
    const puntos = data.puntosClave || data.puntos_clave || [];
    puntosEl.innerHTML = puntos.map(p => `<li>${escapeHtml(p)}</li>`).join('');
  }

  if (preguntaEl) {
    const preguntas = data.preguntasRepaso || data.preguntas_repaso || [];
    preguntaEl.innerHTML = preguntas.map((q, i) =>
      `<div style="padding:8px 0;border-bottom:1px solid var(--clr-border);font-size:0.88rem;color:var(--clr-text-2)">
         <strong style="color:var(--clr-primary-l)">${i + 1}.</strong> ${escapeHtml(q)}
       </div>`
    ).join('');
  }

  resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
  showToast('Audio analizado ✅', 'success');
}

// ============================================================
// imagen.js — Image Analyzer Logic (inline in audio.js for simplicity)
// ============================================================

/* ── HANDLE IMAGE FILE ───────────────────────────────────── */
function handleImgFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  showImgPreview(file);
}

function handleImgDrop(event) {
  event.preventDefault();
  handleDragLeave('img-upload-zone');
  const file = event.dataTransfer.files[0];
  if (!file?.type.startsWith('image/')) { showToast('Solo se permiten imágenes', 'error'); return; }
  showImgPreview(file);
}

function showImgPreview(file) {
  window._pendingImgFile = file;
  const previewEl = document.getElementById('img-preview');
  if (previewEl) previewEl.src = URL.createObjectURL(file);

  document.getElementById('img-upload-zone')?.classList.add('hidden');
  document.getElementById('img-preview-section')?.classList.remove('hidden');
  document.getElementById('img-result')?.classList.add('hidden');
}

function clearImg() {
  window._pendingImgFile = null;
  const inp = document.getElementById('img-file-input');
  if (inp) inp.value = '';
  document.getElementById('img-upload-zone')?.classList.remove('hidden');
  document.getElementById('img-preview-section')?.classList.add('hidden');
  document.getElementById('img-result')?.classList.add('hidden');
}

/* ── ANALYZE IMAGE ───────────────────────────────────────── */
async function analyzeImage() {
  const file = window._pendingImgFile;
  if (!file) { showToast('No hay imagen seleccionada', 'error'); return; }

  const pregunta = document.getElementById('img-pregunta')?.value.trim() || '¿Encontraste errores?';
  const materia  = document.getElementById('img-materia-sel')?.value || 'General';

  const btn  = document.getElementById('btn-analyze-img');
  const txt  = document.getElementById('btn-analyze-text');
  const spin = document.getElementById('btn-analyze-spin');
  if (btn) btn.disabled = true;
  if (txt) txt.textContent = 'Analizando con Gemini...';
  if (spin) spin.classList.remove('hidden');

  try {
    const form = new FormData();
    form.append('imagen', file);
    form.append('pregunta', pregunta);
    form.append('materia', materia);
    const user = loadLocal('user') || {};
    form.append('uid', user.uid || 'anonimo');
    form.append('nombre', user.nombre || 'Estudiante');
    form.append('nivelEducativo', user.nivelEducativo || 'secundaria');

    const data = await apiPostForm('/imagen/analizar', form);
    displayImgResult(data.analisis || data);
  } catch(err) {
    displayImgResult({
      observacion: '🎭 (Demo) Vi tu imagen. En producción, Gemini analizará errores y conceptos con visión multimodal.',
      guia_socratica: '¿Qué parte del procedimiento crees que podría estar incorrecta? Identificar el paso problemático es el primer paso para corregirlo.',
      pistas: [
        'Revisa paso a paso si las unidades son correctas',
        'Verifica que no hayas saltado pasos intermedios',
        'Compara con un ejemplo resuelto similar'
      ]
    });
  } finally {
    if (btn) btn.disabled = false;
    if (txt) txt.textContent = '🔍 Analizar con Gemini';
    if (spin) spin.classList.add('hidden');
  }
}

function displayImgResult(analisis) {
  const resultDiv = document.getElementById('img-result');
  if (!resultDiv) return;
  resultDiv.classList.remove('hidden');

  const obsEl   = document.getElementById('img-observacion');
  const guiaEl  = document.getElementById('img-guia');
  const pistasEl = document.getElementById('img-pistas');

  if (obsEl)   obsEl.textContent  = analisis.observacion || analisis.respuesta || '—';
  if (guiaEl)  guiaEl.textContent = analisis.guia_socratica || analisis.guia || '—';

  if (pistasEl) {
    const pistas = analisis.pistas || analisis.hints || [];
    pistasEl.innerHTML = pistas.map(p => `<li>${escapeHtml(p)}</li>`).join('');
  }

  resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
  showToast('Imagen analizada ✅', 'success');
}
