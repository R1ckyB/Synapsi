// ============================================================
// feynman.js — Modo Profesor Invertido (Técnica Feynman)
// Synapse - Frontend
// ============================================================

let feynmanHistorial = [];
let feynmanTemaActual = 'Fotosíntesis';
let feynmanScoreActual = 0;

function setFeynmanTema(tema) {
  feynmanTemaActual = tema;
  feynmanHistorial = [];
  feynmanScoreActual = 0;

  const chatBox = document.getElementById('feynman-chat-messages');
  if (chatBox) {
    chatBox.innerHTML = `
      <div class="chat-msg msg-tutor anim-up">
        <div class="msg-avatar">🤖</div>
        <div class="msg-body">
          <div class="msg-text">
            ¡Hola! Soy <b>Leo</b> 👦. No entiendo muy bien cómo funciona <b>${escapeHtml(tema)}</b>... ¿Me lo podrías explicar con tus propias palabras como si fuera tu compañero de clase? 😃
          </div>
        </div>
      </div>
    `;
  }

  updateFeynmanGauge(0);
}

function updateFeynmanGauge(score) {
  feynmanScoreActual = score;
  const fill = document.getElementById('feynman-gauge-fill');
  const txt = document.getElementById('feynman-gauge-txt');
  const feedback = document.getElementById('feynman-feedback-txt');

  if (fill) fill.style.width = `${score}%`;
  if (txt) txt.textContent = `${score}%`;
  if (score >= 90 && feedback) {
    feedback.innerHTML = `🏆 <b>¡Felicidades!</b> Le explicaste el tema tan bien a Leo que ha alcanzado un 90%+ de comprensión. ¡Dominio demostrado!`;
  }
}

async function enviarExplicacionFeynman() {
  const input = document.getElementById('feynman-input');
  if (!input) return;

  const explicacion = input.value.trim();
  if (!explicacion) return;

  input.value = '';

  const chatBox = document.getElementById('feynman-chat-messages');
  if (!chatBox) return;

  // Render usuario
  chatBox.insertAdjacentHTML('beforeend', `
    <div class="chat-msg msg-user anim-up">
      <div class="msg-body">
        <div class="msg-text">${escapeHtml(explicacion)}</div>
      </div>
    </div>
  `);
  chatBox.scrollTop = chatBox.scrollHeight;

  // Typing indicator
  const typingId = 'feynman-typing-' + Date.now();
  chatBox.insertAdjacentHTML('beforeend', `
    <div class="chat-msg msg-tutor anim-up" id="${typingId}">
      <div class="msg-avatar">🤖</div>
      <div class="msg-body">
        <div class="msg-text" style="opacity:0.6">Leo está pensando tu explicación... 💭</div>
      </div>
    </div>
  `);
  chatBox.scrollTop = chatBox.scrollHeight;

  try {
    const res = await fetch('/api/tutoria/feynman', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tema: feynmanTemaActual,
        explicacionUsuario: explicacion,
        historial: feynmanHistorial
      })
    });
    const data = await res.json();

    document.getElementById(typingId)?.remove();

    if (!data.exito) throw new Error(data.mensaje || 'Error al procesar');

    // Actualizar historial
    feynmanHistorial.push({ role: 'user', text: explicacion });
    feynmanHistorial.push({ role: 'model', text: data.respuesta });

    // Render respuesta de Leo
    chatBox.insertAdjacentHTML('beforeend', `
      <div class="chat-msg msg-tutor anim-up">
        <div class="msg-avatar">🤖</div>
        <div class="msg-body">
          <div class="msg-text">${escapeHtml(data.respuesta)}</div>
          ${data.feedbackPedagogico ? `<div style="font-size:0.75rem;margin-top:6px;color:var(--clr-primary-l);background:rgba(99,102,241,0.1);padding:4px 8px;border-radius:6px">💡 Nota del Tutor: ${escapeHtml(data.feedbackPedagogico)}</div>` : ''}
        </div>
      </div>
    `);
    chatBox.scrollTop = chatBox.scrollHeight;

    // Actualizar gauge
    updateFeynmanGauge(data.scoreComprension);

  } catch (err) {
    document.getElementById(typingId)?.remove();
    showToast('Error al enviar explicación: ' + err.message, 'error');
  }
}
