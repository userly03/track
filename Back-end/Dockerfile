# Imagen base de Python
FROM python:3.12-slim

# Dependencias necesarias para psycopg2, PostGIS y pg_isready
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    postgresql-client \
    gdal-bin \
    && rm -rf /var/lib/apt/lists/*

# Carpeta de trabajo
WORKDIR /app

# Copiar archivo de dependencias
COPY requirements.txt .

# Instalar dependencias de Python
RUN pip install --no-cache-dir -r requirements.txt

# Copiar todo el código del backend
COPY . .

# Evitar buffering en logs
ENV PYTHONUNBUFFERED=1

# Copiar entrypoint fuera de /app para que no quede sobrescrito por el bind mount
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
# Normalize Windows CRLF to LF and make entrypoint executable
RUN sed -i 's/\r$//' /usr/local/bin/entrypoint.sh && chmod +x /usr/local/bin/entrypoint.sh

# Usar entrypoint que espera a PostgreSQL
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
