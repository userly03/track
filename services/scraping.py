"""
Scraping SIMULADO PRO para TrackBuild v2.
No usa webs externas. Es estable, rápido y extensible.
Sirve como base realista para pruebas, reporting y KPIs.
"""


def get_market_price(material: str):
    material = material.lower().strip()

    # Base simulada con muchos materiales (puedes agregar más)
    fake_db = {
        "cemento": {"avg": 32.5, "min": 28, "max": 40, "source": "FAKE-SIM"},
        "arena": {"avg": 18.0, "min": 15, "max": 22, "source": "FAKE-SIM"},
        "fierro": {"avg": 8.5, "min": 7, "max": 12, "source": "FAKE-SIM"},
        "ladrillo": {"avg": 1.2, "min": 1, "max": 2, "source": "FAKE-SIM"},
        "yeso": {"avg": 22.0, "min": 18, "max": 30, "source": "FAKE-SIM"},
        "pvc": {"avg": 6.5, "min": 5, "max": 9, "source": "FAKE-SIM"},
        "clavos": {"avg": 4.0, "min": 3, "max": 6, "source": "FAKE-SIM"},
        "pintura": {"avg": 45.0, "min": 35, "max": 60, "source": "FAKE-SIM"},
        "madera": {"avg": 55.0, "min": 40, "max": 80, "source": "FAKE-SIM"},
        "cables": {"avg": 3.5, "min": 2, "max": 5, "source": "FAKE-SIM"},
        "martillo": {"avg": 25.0, "min": 18, "max": 35, "source": "FAKE-SIM"},
    }

    if material not in fake_db:
        # Producto NO encontrado → retorno profesional
        return {
            "market_avg": None,
            "market_min": None,
            "market_max": None,
            "source": "NOT_FOUND",
            "count": 0,
            "error": "material_not_found",
        }

    data = fake_db[material]

    return {
        "market_avg": data["avg"],
        "market_min": data["min"],
        "market_max": data["max"],
        "source": data["source"],
        "count": 1,
    }
