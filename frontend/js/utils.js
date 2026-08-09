// ============================================================
// utils.js — Funciones utilitarias globales
// ============================================================

/* ── TOAST NOTIFICATIONS ─────────────────────────────────── */
function showToast(msg, type = 'info', duration = 3500) {
  const icons = { success: '✅', error: '❌', info: '💡' };
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${escapeHtml(msg)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* ── API HELPER ──────────────────────────────────────────── */

/**
 * FIX #10 — Obtiene siempre un ID Token válido antes de enviar peticiones a la API.
 * getIdToken(false) renueva el token automáticamente si ya expiró (caduca c/60 min).
 * Esto evita que el chat deje de responder después de una hora de uso.
 */
async function obtenerAuthHeader() {
  if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
    try {
      const token = await firebase.auth().currentUser.getIdToken(/* forceRefresh */ false);
      return { 'Authorization': `Bearer ${token}` };
    } catch (e) {
      console.warn('[Synapse] No se pudo renovar token de Firebase:', e.message);
    }
  }
  // Fallback: usar token guardado en localStorage si Firebase no está disponible
  const tokenLocal = loadLocal('token');
  if (tokenLocal) return { 'Authorization': `Bearer ${tokenLocal}` };
  return {};
}
async function apiPost(endpoint, body, options = {}) {
  const authHeader = await obtenerAuthHeader(); // FIX #10 — Token siempre fresco
  const res = await fetch(`${SYNAPSE_CONFIG.API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader, ...options.headers },
    body: JSON.stringify(body),
    ...options
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || `Error ${res.status}`);
  return data;
}

async function apiGet(endpoint) {
  const authHeader = await obtenerAuthHeader(); // FIX #10 — Token siempre fresco
  const res = await fetch(`${SYNAPSE_CONFIG.API_BASE}${endpoint}`, {
    headers: { ...authHeader }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || `Error ${res.status}`);
  return data;
}

async function apiPostForm(endpoint, formData) {
  const authHeader = await obtenerAuthHeader();
  const res = await fetch(`${SYNAPSE_CONFIG.API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { ...authHeader },
    body: formData
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || `Error ${res.status}`);
  return data;
}

async function apiDelete(endpoint) {
  const authHeader = await obtenerAuthHeader();
  const res = await fetch(`${SYNAPSE_CONFIG.API_BASE}${endpoint}`, {
    method: 'DELETE',
    headers: { ...authHeader }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || `Error ${res.status}`);
  return data;
}

/* ── STORAGE HELPERS ─────────────────────────────────────── */
function saveLocal(key, value) {
  try { localStorage.setItem(`synapse_${key}`, JSON.stringify(value)); }
  catch(e) { console.warn('localStorage error:', e); }
}

function loadLocal(key, fallback = null) {
  try {
    const raw = localStorage.getItem(`synapse_${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch(e) { return fallback; }
}

function clearLocal(key) {
  localStorage.removeItem(`synapse_${key}`);
}

/* ── FORMATTING ──────────────────────────────────────────── */
function formatTime(date = new Date()) {
  return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

function formatSecs(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

/* ── AUTO-RESIZE TEXTAREA ────────────────────────────────── */
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

/* ── DOM HELPERS ─────────────────────────────────────────── */
function setLoading(btnId, textId, spinId, loading, text = '') {
  const btn  = document.getElementById(btnId);
  const txt  = document.getElementById(textId);
  const spin = document.getElementById(spinId);
  if (!btn) return;
  btn.disabled = loading;
  if (txt)  txt.textContent = loading ? '' : (text || txt.dataset.orig || txt.textContent);
  if (spin) spin.classList.toggle('hidden', !loading);
  if (!loading && text && txt) txt.dataset.orig = txt.textContent;
}

/* ── FILE TO BASE64 ──────────────────────────────────────── */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ── DRAG & DROP HELPERS ─────────────────────────────────── */
function handleDragOver(event, zoneId) {
  event.preventDefault();
  document.getElementById(zoneId)?.classList.add('dragover');
}
function handleDragLeave(zoneId) {
  document.getElementById(zoneId)?.classList.remove('dragover');
}

/* ── MOBILE SIDEBAR ──────────────────────────────────────── */
function openSidebar() {
  document.getElementById('sidebar')?.classList.add('open');
  document.getElementById('sidebar-overlay')?.classList.add('show');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('show');
  document.body.style.overflow = '';
}

/* ── USER MENU & LOGOUT ──────────────────────────────────── */
function toggleUserMenu() {
  const menu = document.getElementById('user-mini-menu');
  if (menu) menu.classList.toggle('hidden');
}

function handleLogout() {
  clearLocal('user');
  clearLocal('token');
  clearLocal('historial');
  if (window.firebase && firebase.auth) {
    try { firebase.auth().signOut(); } catch (e) {}
  }
  showToast('Sesión cerrada 🚪', 'info', 1500);
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 300);
}

// Cerrar user menu al hacer click fuera
document.addEventListener('click', (e) => {
  const menu = document.getElementById('user-mini-menu');
  if (menu && !menu.classList.contains('hidden')) {
    const card = document.querySelector('.sidebar-user-card');
    const avatar = document.getElementById('topbar-avatar');
    if (!menu.contains(e.target) && !card?.contains(e.target) && !avatar?.contains(e.target)) {
      menu.classList.add('hidden');
    }
  }
});
