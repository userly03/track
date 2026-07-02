import hashlib
import json
from datetime import date, datetime
from decimal import Decimal


def normalize_value(value):
    """
    Normaliza los valores antes de convertirlos en JSON ordenado.

    Objetivo:
    - Evitar que pequeñas diferencias generen hashes distintos.
    - Asegurar consistencia entre registros.
    """
    if isinstance(value, dict):
        return {k: normalize_value(v) for k, v in value.items()}

    if isinstance(value, list):
        return [normalize_value(v) for v in value]

    if isinstance(value, (datetime, date)):
        return value.isoformat()

    if isinstance(value, float):
        # Normalizamos floats a 6 decimales.
        return round(value, 6)

    if isinstance(value, Decimal):
        return float(value)

    if value is None:
        return ""

    return value


def generate_sha256_hash(data: dict) -> str:
    """
    Genera un hash SHA256 estable y reproducible.

    - Normaliza datos
    - Ordena claves
    - Convierte a JSON seguro
    - Hash SHA256 final
    """
    normalized = normalize_value(data)
    json_string = json.dumps(normalized, sort_keys=True, separators=(",", ":"))

    return hashlib.sha256(json_string.encode("utf-8")).hexdigest()
