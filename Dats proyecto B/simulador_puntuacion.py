#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Simulador de puntuación — INNOVAE, subprograma d) sustitución de generadores de frío.

Implementa la Orden TED/569/2026 (BOE-A-2026-12282):

    Anexo 2.d   umbrales: coste elegible mínimo, ayuda máxima
    Anexo 3     criterios excluyentes y de valoración; escalas relativas
    art. 22.5   orden de prelación de mayor a menor puntuación
    art. 22.6   desempate: criterio 1 → 2 → 3 → 4 → fecha y hora
    art. 22.7   selección por encaje presupuestario descendiendo la lista
    art. 23.5   se presume la renuncia de quien no acepta en diez días hábiles
    art. 24.3   lista de reserva; concesión íntegra o nada

IDEA CENTRAL
------------
Las escalas de los criterios 1 y 2 NO son absolutas. Se construyen sobre el rango
R = RM - Rm de las ratios de todas las solicitudes presentadas. Por eso no se puede
puntuar una solicitud aislada: hace falta la población entera.

Entrada : Fuentes/simulacion_solicitudes.csv   (20 columnas, ver simulacion_diccionario.csv)
Salida  : Fuentes/simulacion_resultado.csv     (mismas columnas, ya puntuadas)

Uso:
    python3 simulador_puntuacion.py
    python3 simulador_puntuacion.py --entrada pob.csv --modo-corte estricto
    python3 simulador_puntuacion.py --tasa-renuncia 0.10 --semilla 7

Sin dependencias externas: solo biblioteca estándar.
"""

from __future__ import annotations

import argparse
import csv
import random
from dataclasses import dataclass, field
from pathlib import Path

# --------------------------------------------------------------------------
# CONSTANTES NORMATIVAS  (Anexo 2.d y Anexo 3 — no tocar sin cambio de bases)
# --------------------------------------------------------------------------

KWH_POR_KTEP = 11_630_000       # 1 ktep = 11,63 GWh
PRESUPUESTO_SUBPROGRAMA = 25_000_000
PUNTUACION_MINIMA = 50
AYUDA_MAXIMA_PROYECTO = 2_000_000
COSTE_ELEGIBLE_MINIMO = 100_000

# Criterio 1 — ahorro y eficiencia energética (40 pts).
# Cortes expresados como múltiplos de R sobre Rm.
ESCALA_C1 = [(0.2, 40), (0.4, 32), (0.6, 24), (0.8, 16)]
PUNTOS_C1_ULTIMO_TRAMO = 8

# Criterio 2 — económico (25 pts). Mismos cortes, distinta puntuación.
ESCALA_C2 = [(0.2, 25), (0.4, 20), (0.6, 15), (0.8, 10)]
PUNTOS_C2_ULTIMO_TRAMO = 6

# Criterio 3 — innovación (25 pts). El Anexo 3 da RANGOS, no valores.
RANGOS_INNOVACION = {
    "sin":         None,            # excluyente
    "baja":        (0.01, 4.99),
    "incremental": (5.00, 9.99),
    "intermedia":  (10.00, 17.99),
    "disruptiva":  (18.00, 25.00),
}

# Criterio 4 — beneficios socioeconómicos (10 pts). Todo o nada.
PUNTOS_C4 = 10

VERDADERO = {"si", "sí", "s", "1", "true", "verdadero"}

# El CSV de entrada contiene SOLO inputs. Todo lo derivado lo añade el simulador
# al escribir la salida: así el fichero de trabajo no arrastra columnas vacías.
COLUMNAS_ENTRADA = [
    "id", "escenario", "origen_dato", "arquetipo", "sector",
    "coste_elegible_eur", "ayuda_solicitada_eur", "ahorro_kwh_ano",
    "categoria_innovacion", "bonus_socioeconomico",
]
COLUMNAS_DERIVADAS = [
    "ahorro_ktep", "rpa", "rpe",
    "puntos_c1", "puntos_c2", "puntos_c3", "puntos_c4", "puntuacion_total",
    "orden_prelacion", "resultado", "motivo_exclusion",
]
COLUMNAS_SALIDA = COLUMNAS_ENTRADA + COLUMNAS_DERIVADAS


# --------------------------------------------------------------------------
# CONFIGURACIÓN
# --------------------------------------------------------------------------

@dataclass
class Config:
    """Los campos '# ABIERTO' son supuestos sin resolver en las bases."""

    # ABIERTO: el Anexo 3 excluye el 5 % inferior y superior de las ratios
    # "para garantizar una evaluación centrada en el rango medio".
    # 'escala'  -> el recorte solo afecta al cálculo de Rm y RM; todos puntúan.
    # 'excluye' -> los recortados quedan además fuera de la puntuación.
    # Decidido (JM, 21/08/2026): 'escala'. La tabla contempla RPA <= Rm + 0,2·R,
    # que incluye valores por debajo de Rm: si quedaran fuera, ese tramo no
    # tendría sentido.
    recorte_pct: float = 0.05
    modo_recorte: str = "escala"

    # ABIERTO: el recorte se aplica "siempre que exista un número representativo
    # de solicitudes". Las bases no dicen cuántas. Ni la FAQ ni el webinar lo
    # aclaran. Por debajo de 20, int(n * 0,05) = 0 y el recorte es inocuo de todos
    # modos, así que el umbral solo importa en poblaciones pequeñas.
    minimo_para_recortar: int = 20

    # ABIERTO: cómo asigna la CTV el valor exacto dentro del rango de innovación.
    # 'medio' | 'aleatorio' | 'conservador'
    estrategia_innovacion: str = "medio"

    # RESUELTO por el art. 22.7: se recorre el orden de prelación en sentido
    # descendente "seleccionando aquellas solicitudes para las cuales, de ser
    # aceptadas, no se superen los límites de presupuesto". Es selección por
    # encaje, no parada en la primera que no cabe. El art. 24.3 usa la misma
    # lógica para la lista de reserva: solo se concede si el presupuesto liberado
    # permite atender COMPLETAMENTE la solicitud.
    # 'estricto' se conserva solo para medir cuánto movería la línea de corte;
    # es contrario a la lectura del art. 22.7.
    modo_corte: str = "rellenar"

    # Art. 23.5: se presume la renuncia de quien no acepta en diez días hábiles.
    # El art. 24.3 permite reasignar a la lista de reserva sin nueva convocatoria
    # si el presupuesto liberado cubre ÍNTEGRAMENTE la siguiente solicitud.
    # 0.0 desactiva la simulación de renuncias (comportamiento por defecto).
    tasa_renuncia: float = 0.0

    presupuesto: int = PRESUPUESTO_SUBPROGRAMA
    umbral: int = PUNTUACION_MINIMA
    semilla: int | None = 20261118

    _rng: random.Random = field(init=False, repr=False)

    def __post_init__(self):
        self._rng = random.Random(self.semilla)


# --------------------------------------------------------------------------
# LECTURA / ESCRITURA  (formato español: separador ';', decimales con coma)
# --------------------------------------------------------------------------

def _num(valor: str | float | int) -> float:
    """Acepta '1.350.000', '16,355' o 1350000. Devuelve float."""
    if isinstance(valor, (int, float)):
        return float(valor)
    v = (valor or "").strip()
    if not v:
        return 0.0
    if "," in v:                      # decimal español: el punto es de millares
        v = v.replace(".", "").replace(",", ".")
    return float(v)


def _txt(valor: float, decimales: int = 3) -> str:
    return f"{valor:.{decimales}f}".replace(".", ",")


def _si(valor: str) -> bool:
    return (valor or "").strip().lower() in VERDADERO


def cargar(ruta: Path) -> list[dict]:
    with open(ruta, encoding="utf-8-sig", newline="") as fh:
        filas = list(csv.DictReader(fh, delimiter=";"))
    if not filas:
        raise SystemExit(f"{ruta} está vacío.")

    faltan = [c for c in COLUMNAS_ENTRADA if c not in filas[0]]
    if faltan:
        raise SystemExit(f"Faltan columnas obligatorias en {ruta}: {', '.join(faltan)}")

    vistos = set()
    for f in filas:
        if f["id"] in vistos:
            raise SystemExit(f"id duplicado: {f['id']}. Las claves deben ser únicas.")
        vistos.add(f["id"])
        for c in COLUMNAS_DERIVADAS:      # se rellenan durante la simulación
            f.setdefault(c, "")
    return filas


def guardar(filas: list[dict], ruta: Path) -> None:
    """Escribe siempre el esquema de salida completo, en orden fijo."""
    with open(ruta, "w", encoding="utf-8-sig", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=COLUMNAS_SALIDA, delimiter=";",
                           lineterminator="\r\n", extrasaction="ignore")
        w.writeheader()
        for f in filas:
            w.writerow({c: f.get(c, "") for c in COLUMNAS_SALIDA})


def validar(filas: list[dict]) -> list[str]:
    """Comprueba los umbrales del Anexo 2.d. Devuelve avisos, no interrumpe."""
    avisos = []
    for f in filas:
        ce, ay = _num(f["coste_elegible_eur"]), _num(f["ayuda_solicitada_eur"])
        if ce < COSTE_ELEGIBLE_MINIMO:
            avisos.append(f"{f['id']}: coste elegible {ce:,.0f} € por debajo del "
                          f"mínimo de {COSTE_ELEGIBLE_MINIMO:,.0f} € (Anexo 2.d)")
        if ay > AYUDA_MAXIMA_PROYECTO:
            avisos.append(f"{f['id']}: ayuda {ay:,.0f} € por encima del máximo de "
                          f"{AYUDA_MAXIMA_PROYECTO:,.0f} €; se recortará al tope")
        if ay > ce:
            avisos.append(f"{f['id']}: la ayuda supera al coste elegible")
    return avisos


# --------------------------------------------------------------------------
# PASO 1 — ratios de cada fila
# --------------------------------------------------------------------------

def calcular_ratios(filas: list[dict]) -> None:
    """Rellena ahorro_ktep, rpa y rpe. Modifica las filas in situ."""
    for f in filas:
        ktep = _num(f["ahorro_kwh_ano"]) / KWH_POR_KTEP
        if ktep <= 0:
            raise ValueError(f"{f['id']}: ahorro nulo o negativo.")
        f["ahorro_ktep"] = _txt(ktep, 6)
        f["rpa"] = _txt((_num(f["coste_elegible_eur"]) / 1e6) / ktep)
        f["rpe"] = _txt((_num(f["ayuda_solicitada_eur"]) / 1e6) / ktep)


# --------------------------------------------------------------------------
# PASO 2 — la escala relativa
# --------------------------------------------------------------------------

def calcular_escala(valores: list[float], cfg: Config) -> tuple[float, float, float]:
    """Devuelve (Rm, RM, R) tras el recorte del 5 % inferior y superior."""
    v = sorted(valores)
    n = len(v)
    if n >= cfg.minimo_para_recortar and cfg.recorte_pct > 0:
        k = int(n * cfg.recorte_pct)
        if k > 0:
            v = v[k:n - k]
    return v[0], v[-1], v[-1] - v[0]


def puntos_por_intervalo(ratio: float, rm: float, r: float,
                         escala: list[tuple[float, int]], ultimo: int) -> int:
    """Ratio más bajo, más puntos. El primer tramo incluye todo lo que esté bajo Rm."""
    if r <= 0:                       # todas las solicitudes empatan
        return escala[0][1]
    for factor, puntos in escala:
        if ratio <= rm + factor * r:
            return puntos
    return ultimo


# --------------------------------------------------------------------------
# PASO 3 — criterios 3 y 4
# --------------------------------------------------------------------------

def puntos_innovacion(categoria: str, cfg: Config) -> float:
    cat = (categoria or "").strip().lower()
    if cat not in RANGOS_INNOVACION:
        raise ValueError(f"Categoría de innovación desconocida: {categoria!r}")
    rango = RANGOS_INNOVACION[cat]
    if rango is None:                # 'sin innovación' es excluyente
        return 0.0
    lo, hi = rango
    if cfg.estrategia_innovacion == "conservador":
        return lo
    if cfg.estrategia_innovacion == "aleatorio":
        return round(cfg._rng.uniform(lo, hi), 2)
    return round((lo + hi) / 2, 2)   # 'medio'


# --------------------------------------------------------------------------
# PASO 4 — puntuar la población
# --------------------------------------------------------------------------

def _excluir(fila: dict, motivo: str) -> None:
    fila.update(puntos_c1="", puntos_c2="", puntos_c3="", puntos_c4="",
                puntuacion_total="0", orden_prelacion="", resultado="excluida",
                motivo_exclusion=motivo)


def puntuar(filas: list[dict], cfg: Config) -> dict:
    calcular_ratios(filas)

    # 'sin innovación' es excluyente (Anexo 3.1.b): no entra ni al cálculo de la escala.
    vivas = []
    for f in filas:
        f.setdefault("motivo_exclusion", "")
        if (f.get("categoria_innovacion", "").strip().lower() == "sin"):
            _excluir(f, "sin innovacion")
        else:
            vivas.append(f)

    if not vivas:
        raise SystemExit("Ninguna solicitud admisible: todas quedan excluidas.")

    rpa_m, rpa_M, rpa_R = calcular_escala([_num(f["rpa"]) for f in vivas], cfg)
    rpe_m, rpe_M, rpe_R = calcular_escala([_num(f["rpe"]) for f in vivas], cfg)

    for f in vivas:
        rpa, rpe = _num(f["rpa"]), _num(f["rpe"])

        # Lectura alternativa del recorte: los extremos quedan fuera de la
        # puntuación, no solo del cálculo del rango. Se comprueban ambas ratios.
        if cfg.modo_recorte == "excluye" and not (
                rpa_m <= rpa <= rpa_M and rpe_m <= rpe <= rpe_M):
            _excluir(f, "recortada por extrema")
            continue

        c1 = puntos_por_intervalo(rpa, rpa_m, rpa_R, ESCALA_C1, PUNTOS_C1_ULTIMO_TRAMO)
        c2 = puntos_por_intervalo(rpe, rpe_m, rpe_R, ESCALA_C2, PUNTOS_C2_ULTIMO_TRAMO)
        c3 = puntos_innovacion(f["categoria_innovacion"], cfg)
        c4 = float(PUNTOS_C4) if _si(f.get("bonus_socioeconomico", "")) else 0.0

        f.update(puntos_c1=str(c1), puntos_c2=str(c2),
                 puntos_c3=_txt(c3, 2), puntos_c4=_txt(c4, 0),
                 puntuacion_total=_txt(c1 + c2 + c3 + c4, 2))

    return {"rpa": (rpa_m, rpa_M, rpa_R), "rpe": (rpe_m, rpe_M, rpe_R),
            "n_evaluadas": len(vivas)}


# --------------------------------------------------------------------------
# PASO 5 — ordenar, cortar por presupuesto y fijar la línea de corte
# --------------------------------------------------------------------------

def _ayuda(fila: dict) -> float:
    return min(_num(fila["ayuda_solicitada_eur"]), AYUDA_MAXIMA_PROYECTO)


def ordenar_y_cortar(filas: list[dict], cfg: Config) -> dict:
    """
    art. 22.5  orden de prelación descendente
    art. 22.6  desempate: c1, luego c2, c3, c4 y por último fecha y hora
    art. 22.7  se seleccionan las solicitudes que, de ser aceptadas, no superen
               el presupuesto — selección por encaje, no parada en la primera
               que no cabe
    """
    aptas = []
    for f in filas:
        if f.get("resultado") == "excluida":
            continue
        if _num(f["puntuacion_total"]) < cfg.umbral:
            _excluir(f, f"no alcanza {cfg.umbral} puntos")
        else:
            aptas.append(f)

    # 'id' hace de proxy de la fecha y hora de presentación del art. 22.6.
    aptas.sort(key=lambda f: (-_num(f["puntuacion_total"]),
                              -_num(f["puntos_c1"]), -_num(f["puntos_c2"]),
                              -_num(f["puntos_c3"]), -_num(f["puntos_c4"]),
                              f["id"]))

    acumulado = 0.0
    corte = None
    agotado = False

    for i, f in enumerate(aptas, start=1):
        f["orden_prelacion"] = str(i)
        if agotado and cfg.modo_corte == "estricto":
            f["resultado"] = "lista_reserva"
            continue
        if acumulado + _ayuda(f) <= cfg.presupuesto:
            acumulado += _ayuda(f)
            f["resultado"] = "concedida"
            corte = _num(f["puntuacion_total"])
        else:
            f["resultado"] = "lista_reserva"
            agotado = True

    res = {
        "n_aptas": len(aptas),
        "n_concedidas": sum(1 for f in aptas if f["resultado"] == "concedida"),
        "n_reserva": sum(1 for f in aptas if f["resultado"] == "lista_reserva"),
        "n_excluidas": sum(1 for f in filas if f.get("resultado") == "excluida"),
        "ayuda_concedida": acumulado,
        "presupuesto_libre": cfg.presupuesto - acumulado,
        "linea_de_corte": corte,
        "renuncias": 0,
        "rescatadas": 0,
        "corte_tras_renuncias": None,
    }

    if cfg.tasa_renuncia > 0:
        res.update(_simular_renuncias(aptas, cfg, acumulado))

    return res


def _simular_renuncias(aptas: list[dict], cfg: Config, acumulado: float) -> dict:
    """
    art. 23.5  se presume la renuncia de quien no acepta en diez días hábiles
    art. 24.3  el remanente se reasigna al siguiente en prelación, siempre que
               permita atender COMPLETAMENTE su solicitud (nada de parciales)
    """
    concedidas = [f for f in aptas if f["resultado"] == "concedida"]
    renuncian = [f for f in concedidas if cfg._rng.random() < cfg.tasa_renuncia]

    liberado = 0.0
    for f in renuncian:
        f["resultado"] = "renuncia"
        liberado += _ayuda(f)

    rescatadas = 0
    corte = None
    for f in aptas:
        if f["resultado"] != "lista_reserva":
            continue
        if _ayuda(f) <= liberado:            # solo si cabe entera
            liberado -= _ayuda(f)
            f["resultado"] = "concedida_reserva"
            rescatadas += 1
            corte = _num(f["puntuacion_total"])

    return {"renuncias": len(renuncian), "rescatadas": rescatadas,
            "corte_tras_renuncias": corte,
            "presupuesto_libre": cfg.presupuesto - acumulado + liberado}


# --------------------------------------------------------------------------
# Informe
# --------------------------------------------------------------------------

def informe(esc: dict, res: dict, cfg: Config) -> None:
    e = lambda x: f"{x:,.0f}".replace(",", ".")
    print("=" * 68)
    print("SIMULACIÓN DE PUNTUACIÓN — INNOVAE subprograma d)")
    print("=" * 68)
    print(f"Supuestos: recorte={cfg.recorte_pct:.0%} modo={cfg.modo_recorte} · "
          f"innovación={cfg.estrategia_innovacion} · corte={cfg.modo_corte}"
          + (f" · renuncias={cfg.tasa_renuncia:.0%}" if cfg.tasa_renuncia else ""))
    print(f"\nSolicitudes evaluadas: {esc['n_evaluadas']}")
    for k in ("rpa", "rpe"):
        m, M, R = esc[k]
        print(f"  {k.upper()}:  Rm={m:.3f}  RM={M:.3f}  R={R:.3f}")
        print(f"        tramos: ≤{m + .2 * R:.3f} | ≤{m + .4 * R:.3f} | "
              f"≤{m + .6 * R:.3f} | ≤{m + .8 * R:.3f} | resto")
    print(f"\nSuperan los {cfg.umbral} puntos : {res['n_aptas']}")
    print(f"  concedidas               : {res['n_concedidas']}")
    print(f"  lista de reserva         : {res['n_reserva']}")
    print(f"  excluidas                : {res['n_excluidas']}")
    if cfg.tasa_renuncia:
        print(f"  renuncias (art. 23.5)    : {res['renuncias']}")
        print(f"  rescatadas de reserva    : {res['rescatadas']}")
    print(f"\nAyuda concedida            : {e(res['ayuda_concedida'])} €")
    print(f"Presupuesto sin asignar    : {e(res['presupuesto_libre'])} €")
    corte = res["linea_de_corte"]
    print(f"\n>>> LÍNEA DE CORTE ESTIMADA: "
          f"{('%.2f pts' % corte) if corte is not None else 'no se agota el presupuesto'}")
    if res.get("corte_tras_renuncias") is not None:
        print(f">>> Tras renuncias, baja a : {res['corte_tras_renuncias']:.2f} pts")
    print("=" * 68)


# --------------------------------------------------------------------------

def main() -> None:
    raiz = Path(__file__).resolve().parent
    p = argparse.ArgumentParser(description="Simulador de puntuación INNOVAE frío.")
    p.add_argument("--entrada", type=Path, default=raiz / "Fuentes" / "simulacion_solicitudes.csv")
    p.add_argument("--salida", type=Path, default=raiz / "Fuentes" / "simulacion_resultado.csv")
    p.add_argument("--semilla", type=int, default=20261118)
    p.add_argument("--innovacion", choices=["medio", "aleatorio", "conservador"], default="medio")
    p.add_argument("--modo-recorte", choices=["escala", "excluye"], default="escala")
    p.add_argument("--modo-corte", choices=["estricto", "rellenar"], default="rellenar")
    p.add_argument("--tasa-renuncia", type=float, default=0.0,
                   help="Fracción de beneficiarios que no acepta (art. 23.5). 0 la desactiva.")
    a = p.parse_args()

    cfg = Config(semilla=a.semilla, estrategia_innovacion=a.innovacion,
                 modo_recorte=a.modo_recorte, modo_corte=a.modo_corte,
                 tasa_renuncia=a.tasa_renuncia)

    filas = cargar(a.entrada)
    for aviso in validar(filas):
        print(f"⚠  {aviso}")

    esc = puntuar(filas, cfg)
    res = ordenar_y_cortar(filas, cfg)
    guardar(filas, a.salida)
    informe(esc, res, cfg)
    print(f"\nResultado escrito en: {a.salida}")

    if esc["n_evaluadas"] < cfg.minimo_para_recortar:
        print(f"\n⚠  Solo {esc['n_evaluadas']} solicitudes: por debajo del umbral de "
              f"{cfg.minimo_para_recortar} no se aplica el recorte del 5 %, y la escala "
              f"la fijan los dos casos extremos. Los resultados no son interpretables "
              f"hasta que la población tenga tamaño realista.")


if __name__ == "__main__":
    main()
