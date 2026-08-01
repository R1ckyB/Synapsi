// ============================================
// Wrapper de Google Gemini API
// Synapse - Backend (Modelo: gemini-2.0-flash)
// ============================================

const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

let genAI = null;
let model = null;

function getModel() {
  if (!model) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'Falta GEMINI_API_KEY en las variables de entorno (.env)\n' +
        'Obtén tu API key gratuita en: https://ai.google.dev/'
      );
    }

    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
    });

    console.log('🤖 Gemini API conectado (Modelo activo: gemini-2.0-flash)');
  }
  return model;
}

/**
 * Chat simple enviando un system prompt y el mensaje del usuario.
 */
async function chat(systemPrompt, userMessage) {
  const modelInstance = getModel();

  const result = await modelInstance.generateContent({
    contents: [
      {
        role: 'user',
        parts: [{ text: `${systemPrompt}\n\n---\n\nUsuario:\n${userMessage}` }]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    }
  });

  return result.response.text();
}

/**
 * Chat con historial de conversación.
 */
async function chatConHistorial(systemPrompt, historial = [], nuevoMensaje = '') {
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

    contents.push({
      role: 'user',
      parts: [{ text: nuevoMensaje }]
    });
  }

  const result = await modelInstance.generateContent({
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    }
  });

  return result.response.text();
}

/**
 * Chat determinístico que fuerza respuesta en formato JSON.
 */
async function chatJSON(systemPrompt, userMessage) {
  const modelInstance = getModel();

  const result = await modelInstance.generateContent({
    contents: [
      {
        role: 'user',
        parts: [{ text: `${systemPrompt}\n\n---\n\nContenido a procesar:\n${userMessage}` }]
      }
    ],
    generationConfig: {
      temperature: 0.2, // Bajo para máxima consistencia en JSON
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
    }
  });

  const texto = result.response.text();

  try {
    return JSON.parse(texto);
  } catch {
    const jsonMatch = texto.match(/\{[\s\S]*\}/) || texto.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Gemini no devolvió un JSON válido: ' + texto.substring(0, 200));
  }
}

/**
 * Chat multimodal enviando archivos (imágenes o audios en base64/buffer).
 */
async function chatMultimodal(systemPrompt, parts = []) {
  const modelInstance = getModel();

  const contents = [
    {
      role: 'user',
      parts: [
        { text: systemPrompt },
        ...parts
      ]
    }
  ];

  const result = await modelInstance.generateContent({
    contents,
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 2048,
    }
  });

  return result.response.text();
}

module.exports = {
  getModel,
  chat,
  chatConHistorial,
  chatJSON,
  chatMultimodal
};
