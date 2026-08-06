# ============================================
# Dockerfile — Synapse Backend
# Para deploy en Google Cloud Run
# ============================================

FROM node:20-slim

# Directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias primero (para cache de Docker)
COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm install --omit=dev

# Copiar el resto del código
COPY . .

# Exponer el puerto que usa la app
EXPOSE 3000

# Variables de entorno por defecto (se sobreescriben en Cloud Run)
ENV NODE_ENV=production
ENV PORT=3000

# Comando de inicio
CMD ["node", "backend/server.js"]
