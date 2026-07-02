#!/bin/bash

echo "⏳ Esperando a que la base de datos esté lista..."

# esperar hasta que PostgreSQL acepte conexiones
until pg_isready -h db -p 5432 -U fennec; do
  echo "🟡 PostgreSQL no está listo — esperando..."
  sleep 2
done

echo "🛠️ Base de datos lista, aplicando migraciones..."
python manage.py migrate

echo "🚀 Iniciando servidor Django..."
python manage.py runserver 0.0.0.0:8000
