// ============================================
// Wrapper de Google Gemini API
// Synapse - Backend (Modelo: gemini-2.0-flash)
// ============================================

const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();
const logger = require('../utils/logger');

// ── Configuración de Retry ──
const MAX_REINTENTOS = 3;
const BACKOFF_BASE_MS = 500; // 500ms → 1s → 2s

/**
 * Ejecuta una función async con reintentos y backoff exponencial.
 * Solo reintenta en errores transitorios (timeout, rate limit, 5xx).
 *
 * @param {Function} fn        - Función async a ejecutar
 * @param {number}   intentos  - Intentos restantes
 * @param {number}   espera    - Ms a esperar antes de reintentar
 * @returns {Promise<any>}
 */
async function conReintentos(fn, intentos = MAX_REINTENTOS, espera = BACKOFF_BASE_MS) {
  try {
    return await fn();
  } catch (err) {
    const esTransitorio =
      err.status === 429 ||           // Rate limit de Gemini
      err.status === 503 ||           // Servicio no disponible
      err.status === 504 ||           // Gateway timeout
      err.message?.includes('timeout') ||
      err.message?.includes('ECONNRESET') ||
      err.message?.includes('socket hang up');

    if (intentos > 1 && esTransitorio) {
      logger.warn(`Gemini API error transitorio — reintentando en ${espera}ms`, {
        error: err.message,
        intentosRestantes: intentos - 1
      });
      await new Promise(r => setTimeout(r, espera));
      return conReintentos(fn, intentos - 1, espera * 2); // Backoff exponencial
    }

    throw err; // Error no recuperable o sin reintentos restantes
  }
}

let genAI = null;
let model = null;

function getModel(modelName = 'gemini-flash-latest') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Falta GEMINI_API_KEY en las variables de entorno (.env)\n' +
      'Obtén tu API key gratuita en: https://ai.google.dev/'
    );
  }

  if (!genAI) genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: modelName });
}

/**
 * Chat simple enviando un system prompt y el mensaje del usuario.
 */
async function chat(systemPrompt, userMessage) {
  return conReintentos(async () => {
    const modelInstance = getModel();
    const result = await modelInstance.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n---\n\nUsuario:\n${userMessage}` }]
        }
      ],
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
    });
    return result.response.text();
  });
}

/**
 * Chat con historial de conversación.
 */
async function chatConHistorial(systemPrompt, historial = [], nuevoMensaje = '') {
  return conReintentos(async () => {
    const modelInstance = getModel();
    const contents = [];

    if (historial.length === 0) {
      contents.push({
        role: 'user',
        parts: [{ text: `${systemPrompt}\n\n---\n\n${nuevoMensaje}` }]
      });
    } else {
      contents.push({
        role: 'user',
        parts: [{ text: `${systemPrompt}\n\n---\n\n${historial[0].text}` }]
      });
      for (let i = 1; i < historial.length; i++) {
        contents.push({
          role: historial[i].role === 'model' ? 'model' : 'user',
          parts: [{ text: historial[i].text }]
        });
      }
      contents.push({ role: 'user', parts: [{ text: nuevoMensaje }] });
    }

    const result = await modelInstance.generateContent({
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 900 }
    });
    return result.response.text();
  });
}

/**
 * Chat determinístico que fuerza respuesta en formato JSON.
 */
async function chatJSON(systemPrompt, userMessage) {
  try {
    return await conReintentos(async () => {
      const modelInstance = getModel();
      const result = await modelInstance.generateContent({
        contents: [{
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n---\n\nContenido a procesar:\n${userMessage}` }]
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        }
      });
      const texto = result.response.text();
      try {
        return JSON.parse(texto);
      } catch {
        const jsonMatch = texto.match(/\{[\s\S]*\}/) || texto.match(/\[[\s\S]*\]/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
        throw new Error('Gemini no devolvió un JSON válido: ' + texto.substring(0, 200));
      }
    });
  } catch (err) {
    if (err.message?.includes('API key') || err.message?.includes('GEMINI_API_KEY') || err.status === 400) {
      logger.warn('⚠️ Usando JSON simulado (API Key no configurada o inválida)');
      return {
        respuesta: '¡Excelente explicación! ¿Podrías darme un ejemplo práctico para confirmar que lo entendí del todo?',
        scoreComprension: 75,
        feedbackPedagogico: 'Buen uso de términos básicos.',
        completado: false
      };
    }
    throw err;
  }
}

/**
 * Chat multimodal enviando archivos (imágenes o audios en base64/buffer).
 */
async function chatMultimodal(systemPrompt, parts = []) {
  return conReintentos(async () => {
    const modelInstance = getModel();
    const result = await modelInstance.generateContent({
      contents: [{ role: 'user', parts: [{ text: systemPrompt }, ...parts] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 2048 }
    });
    return result.response.text();
  });
}

module.exports = {
  getModel,
  chat,
  chatConHistorial,
  chatJSON,
  chatMultimodal
};
