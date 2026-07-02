"""
Fase 3 — VALIDACIÓN PRO
------------------------

Los signals para ValidationItem ya no son necesarios porque:

✔ El hash se gestiona desde el modelo (save override).
✔ Las alertas se ejecutan desde el servicio add_validation_action.
✔ Evitamos múltiples triggers involuntarios en estados W-de-N.

Este archivo queda como placeholder para futuras señales si el sistema evoluciona.
"""

# No signals needed for ValidationItem under the new W-de-N validation system.
