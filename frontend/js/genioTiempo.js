// ============================================================
// genioTiempo.js — Genio del Tiempo & Multiverso "What If?"
// Synapse - Frontend
// ============================================================

let currentPersonajeGenio = 'einstein';
let genioHistorial = [];

const PERSONAJES_DATA = {
  einstein:   { nombre: 'Albert Einstein', icono: '⚛️', epoca: '1905 — Berna, Suiza', saludo: '¡Guten Tag! Soy Albert. ¿Te has preguntado qué ocurriría si viajáramos en un rayo de luz o alteráramos la gravedad del universo?' },
  newton:     { nombre: 'Isaac Newton',    icono: '🍎', epoca: '1687 — Cambridge, Inglaterra', saludo: 'Salud, joven pensador. Soy Isaac. Las leyes de la naturaleza son armónicas y matemáticas... ¿qué pasaría si rompiéramos alguna de ellas?' },
  curie:      { nombre: 'Marie Curie',     icono: '🧪', epoca: '1911 — París, Francia', saludo: 'Bonjour. Soy Marie Curie. Los secretos de los átomos mueven el universo. ¿Qué hipótesis te gustaría explorar hoy?' },
  davinci:    { nombre: 'Leonardo da Vinci', icono: '🎨', epoca: '1503 — Florencia, Italia', saludo: 'Salute! Soy Leonardo. La ciencia y el arte son dos caras de la misma naturaleza. Exploremos juntos qué pasaría si cambiáramos las reglas del mundo.' },
  aristoteles:{ nombre: 'Aristóteles',     icono: '🏛️', epoca: '335 a.C. — Atenas, Grecia', saludo: 'Saludos, viajero. Soy Aristóteles. Examinemos las causas de la naturaleza y los dilemas de los universos posibles.' }
};

function selectGenioPersonaje(personajeId) {
  currentPersonajeGenio = personajeId;
  genioHistorial = [];

  const p = PERSONAJES_DATA[personajeId] || PERSONAJES_DATA.einstein;

  // Actualizar UI
  document.querySelectorAll('.genio-card-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.personaje === personajeId);
  });

  const chatBox = document.getElementById('genio-chat-messages');
  if (chatBox) {
    chatBox.innerHTML = `
      <div class="chat-msg msg-tutor anim-up">
        <div class="msg-avatar">${p.icono}</div>
        <div class="msg-body">
          <div style="font-weight:700;font-size:0.85rem;color:var(--clr-primary-l);margin-bottom:4px">${p.nombre} · <span style="opacity:0.7;font-weight:400">${p.epoca}</span></div>
          <div class="msg-text">${escapeHtml(p.saludo)}</div>
        </div>
      </div>
    `;
  }
}

function usarPromptWhatIf(hipotesis) {
  const input = document.getElementById('genio-input');
  if (input) {
    input.value = hipotesis;
    enviarMensajeGenio();
  }
}

async function enviarMensajeGenio() {
  const input = document.getElementById('genio-input');
  if (!input) return;

  const mensaje = input.value.trim();
  if (!mensaje) return;

  input.value = '';

  const chatBox = document.getElementById('genio-chat-messages');
  if (!chatBox) return;

  const p = PERSONAJES_DATA[currentPersonajeGenio] || PERSONAJES_DATA.einstein;

  // Render usuario
  chatBox.insertAdjacentHTML('beforeend', `
    <div class="chat-msg msg-user anim-up">
      <div class="msg-body">
        <div class="msg-text">${escapeHtml(mensaje)}</div>
      </div>
    </div>
  `);
  chatBox.scrollTop = chatBox.scrollHeight;

  // Typing indicator
  const typingId = 'genio-typing-' + Date.now();
  chatBox.insertAdjacentHTML('beforeend', `
    <div class="chat-msg msg-tutor anim-up" id="${typingId}">
      <div class="msg-avatar">${p.icono}</div>
      <div class="msg-body">
        <div class="msg-text" style="opacity:0.6">${p.nombre} está calculando los efectos en el espacio-tiempo... ⏳</div>
      </div>
    </div>
  `);
  chatBox.scrollTop = chatBox.scrollHeight;

  try {
    const data = await apiPost('/tutoria/genio-tiempo', {
      personajeId: currentPersonajeGenio,
      mensaje,
      historial: genioHistorial
    });

    document.getElementById(typingId)?.remove();

    if (!data.exito) throw new Error(data.mensaje || 'Error al procesar');

    genioHistorial.push({ role: 'user', text: mensaje });
    genioHistorial.push({ role: 'model', text: data.respuesta });

    chatBox.insertAdjacentHTML('beforeend', `
      <div class="chat-msg msg-tutor anim-up">
        <div class="msg-avatar">${data.icono || p.icono}</div>
        <div class="msg-body">
          <div style="font-weight:700;font-size:0.85rem;color:var(--clr-primary-l);margin-bottom:4px">${data.personaje || p.nombre}</div>
          <div class="msg-text" style="white-space:pre-wrap">${escapeHtml(data.respuesta)}</div>
        </div>
      </div>
    `);
    chatBox.scrollTop = chatBox.scrollHeight;

  } catch (err) {
    document.getElementById(typingId)?.remove();
    showToast('Error en Genio del Tiempo: ' + err.message, 'error');
  }
}
