#!/bin/sh
set -e

DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${POSTGRES_USER:-fennec}"
DB_NAME="${POSTGRES_DB:-trackbuild}"

echo "Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}..."
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"; do
  sleep 2
done

echo "PostgreSQL is ready. Applying migrations..."
python manage.py migrate --noinput

echo "Starting Django..."
exec "$@"
