# 🧠 Synapse — Plataforma de Mentoría y Tutoría Educativa Inteligente

> **Candidato Oficial para el Desafío Global: Build with Gemini XPRIZE 2026**  
> *Transformando la educación con el Método Socrático, IA Multimodal (Gemini 2.0 Flash) y Accesibilidad Multicanal.*

---

## 📋 Descripción General del Programa

**Synapse** es una plataforma educativa impulsada por inteligencia artificial diseñada para guiar a los estudiantes en su proceso de aprendizaje sin darles las respuestas directamente. A través de la implementación rigurosa del **Método Socrático**, Synapse actúa como un tutor pedagógico virtual que razona junto al estudiante, adapta su lenguaje según el nivel educativo (Primaria, Secundaria, Preparatoria o Universidad) y fomenta el pensamiento crítico.

### 🌟 Pilares Clave de la Plataforma

1. **🤖 Agente Tutor Socrático Multimodal (Gemini 2.0 Flash)**:
   - **Texto**: Guía conversacional paso a paso que identifica errores conceptuales y hace preguntas de orientación.
   - **Voz**: Procesamiento y respuesta a notas de voz del estudiante para resolver dudas habladas.
   - **Visión (Foto de Cuadernos)**: Análisis inteligente de fotografías de ejercicios resueltos o apunte de cuaderno para señalar dónde ocurrió el fallo de lógica.

2. **📲 Accesibilidad Multicanal (Web App + WhatsApp)**:
   - **Web App Futurista**: Interfaz interactiva responsiva con diseño optimizado para celulares y computadoras, modo oscuro, gráficos de progreso y generador de quizzes.
   - **Integración con WhatsApp (Twilio Webhook)**: Acceso directo a la tutoría inteligente desde cualquier teléfono móvil sin necesidad de instalar aplicaciones adicionales ni contar con internet de alta velocidad.

3. **📊 Dashboard para Profesores e Analytics de Vacíos de Conocimiento**:
   - Detección automática y agregada de los **Vacíos de Conocimiento (*Knowledge Gaps*)** que presentan los alumnos durante sus sesiones individuales.
   - Panel de control para docentes con métricas de áreas de oportunidad por grupo y materia.

4. **🎯 Evaluación Adaptativa**:
   - Generación dinámica de **Quizzes Diagnósticos y Evaluaciones** ajustadas en tiempo real a las fortalezas y debilidades identificadas por la IA.

---

## 🏗️ Arquitectura Tecnológica

| Capa | Tecnología | Descripción |
|---|---|---|
| **IA / LLM** | Google Gemini 2.0 Flash (`@google/generative-ai`) | Agente socrático multimodal de ultra-baja latencia |
| **Backend** | Node.js + Express | Servidor API RESTful optimizado con arquitecturas de producción |
| **Base de Datos** | Firebase Firestore | Persistencia en la nube de historiales, rachas y métricas |
| **Autenticación** | Firebase Auth | Autenticación con Google y Email con validación de ID Tokens JWT |
| **WhatsApp Integration** | Twilio Webhooks | Comunicación bidireccional con validación HMAC de firma |
| **Frontend** | Vanilla HTML5 / CSS3 / JavaScript | UI futurista con glassmorphism, 100% responsiva para móviles |
| **Infraestructura** | Docker + Google Cloud Run | Contenedores serverless desplegados con escalamiento automático |

---

## ⚙️ Variables de Entorno (`.env`)

Para ejecutar el proyecto localmente o en la nube, crea un archivo `.env` en la raíz con las siguientes variables:

```env
PORT=3000
NODE_ENV=production
GEMINI_API_KEY=tu_api_key_de_gemini
FIREBASE_PROJECT_ID=project-7b7f1c13-3404-4ad7-b7d
TWILIO_ACCOUNT_SID=tu_account_sid
TWILIO_AUTH_TOKEN=tu_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
BASE_URL=https://synapse-backend-316597665743.us-central1.run.app
```

---

## 🚀 Instalación y Despliegue

### Desarrollo Local
```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm run dev

# 3. Ejecutar suite de pruebas unitarias (21 tests)
npm test
```

### Despliegue en Google Cloud Run
```bash
gcloud run deploy synapse-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000
```

---

## ⚖️ Términos de Licencia y Propiedad Intelectual

### 🔒 Licencia Comercial y de Propiedad Privada (Uso Restringido y de Pago)

**© 2026 Synapse Team. Todos los derechos reservados.**

Este software, su código fuente, arquitectura, diseño de interfaces, prompts pedagógicos, agentes de IA y documentación asociada son propiedad intelectual exclusiva de sus creadores y desarrolladores.

#### **Condiciones de Licencia y Restricciones Legales:**

1. **Restricción de Uso Comercial**: Queda estrictamente prohibido el uso comercial, lucro, reventa, redistribución, alojamiento en producción para terceros o sublicenciamiento de este software o de cualquiera de sus componentes sin la obtención previa de una **Licencia Comercial Autorizada y de Pago** emitida formalmente por los titulares de los derechos de autor.
2. **Derecho de Autor y Marca**: Ninguna persona física o moral tiene permitido copiar, modificar, crear obras derivadas o explotar institucionalmente el sistema **Synapse** sin un acuerdo comercial y contrato firmado con el pago de regalías correspondiente.
3. **Uso Académico / Hackathon**: Se autoriza la revisión y evaluación del presente repositorio exclusivamente para los fines de juzgamiento de la competencia **Build with Gemini XPRIZE 2026**.

*Para consultas de adquisición de licencias comerciales, alianzas institucionales o permisos de uso empresarial, contactar formalmente a la dirección del equipo desarrollador.*
