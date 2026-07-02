# Imagen base de Node 20 estable
FROM node:20-alpine

# Carpeta de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json* pnpm-lock.yaml* ./

# Instalar dependencias
RUN npm install --legacy-peer-deps

# Copiar código del frontend
COPY . .

# Build de producción
RUN npm run build

# Exponer puerto de producción
EXPOSE 3000

# Iniciar Next.js en modo producción
CMD ["npm", "start"]
