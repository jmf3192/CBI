#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Genera una poblacion sintetica de solicitudes a partir de una ficha de calibracion JSON.

    python3 generar_poblacion.py ficha.json --salida solicitudes.csv --resumen

El script no sabe nada de ninguna convocatoria concreta: todo lo lee de la ficha.
Ver references/esquema.md para el formato.

Solo biblioteca estandar.
"""

import argparse
import csv
import json
import math
import random
import sys
from collections import Counter


# ---------------------------------------------------------------- distribuciones

def muestrear(dist, rng):
    """Devuelve un valor de la distribucion descrita por `dist`."""
    tipo = dist.get("tipo")

    if tipo == "empirica":
        valores = dist["valores"]
        if not valores:
            raise ValueError("distribucion empirica sin valores")
        v = rng.choice(valores)
        # Suaviza el remuestreo para no repetir literalmente los observados.
        v *= rng.uniform(0.92, 1.08)
        # factor_cola ensancha la cola derecha para corregir la censura del programa
        # de origen (ver references/calibracion.md 3). Se aplica solo por encima del
        # p75 y sobre el exceso, de modo que la mediana de la muestra observada se
        # conserva: lo que se corrige es la cola, no el centro de la distribucion.
        fc = dist.get("factor_cola", 1.0)
        if fc > 1.0:
            orden = sorted(valores)
            k = (len(orden) - 1) * 0.75
            i = int(k)
            j = min(i + 1, len(orden) - 1)
            p75 = orden[i] + (orden[j] - orden[i]) * (k - i)
            if v > p75:
                v = p75 + (v - p75) * fc
        return v

    if tipo == "lognormal":
        p50, p90 = float(dist["p50"]), float(dist["p90"])
        if p50 <= 0 or p90 <= p50:
            raise ValueError("lognormal necesita 0 < p50 < p90")
        mu = math.log(p50)
        sigma = (math.log(p90) - mu) / 1.2815515655446004  # z(0,90)
        return math.exp(rng.gauss(mu, sigma))

    if tipo == "triangular":
        return rng.triangular(float(dist["min"]), float(dist["max"]), float(dist["moda"]))

    if tipo == "uniforme":
        return rng.uniform(float(dist["min"]), float(dist["max"]))

    raise ValueError("tipo de distribucion desconocido: %r" % tipo)


def elegir_ponderado(opciones, pesos, rng):
    total = sum(pesos)
    if total <= 0:
        raise ValueError("pesos no positivos")
    r = rng.uniform(0, total)
    acum = 0.0
    for opcion, peso in zip(opciones, pesos):
        acum += peso
        if r <= acum:
            return opcion
    return opciones[-1]


# ---------------------------------------------------------------- generacion

def resolver_variable(var, arquetipo):
    """Aplica las sobrescrituras del arquetipo sobre la definicion base de la variable."""
    sobre = arquetipo.get("sobrescribe", {}).get(var["nombre"])
    if not sobre:
        return var
    fusion = dict(var)
    fusion.update(sobre)
    return fusion


def generar_fila(variables, arquetipo, reglas, rng):
    """Devuelve un dict con los valores de puntuacion, o None si viola un excluyente."""
    fila = {}
    for var_base in variables:
        var = resolver_variable(var_base, arquetipo)
        nombre, tipo = var["nombre"], var["tipo"]

        if tipo == "beneficio":
            en_unidad_baremo = muestrear(var["distribucion"], rng)
            fila["_baremo_" + nombre] = en_unidad_baremo
            fila[nombre] = en_unidad_baremo * float(var.get("por_unidad_baremo", 1))

        elif tipo == "coste_por_ratio":
            ratio = muestrear(var["distribucion"], rng)
            base = fila["_baremo_" + var["beneficio"]]
            fila[nombre] = ratio * base * 1e6  # ratio esta en MEUR por unidad de baremo

        elif tipo == "fraccion_de":
            fraccion = muestrear(var["distribucion"], rng)
            valor = fraccion * fila[var["base"]]
            tope = var.get("tope")
            if tope and tope in reglas:
                valor = min(valor, float(reglas[tope]))
            fila[nombre] = valor

        elif tipo == "categorica":
            probs = var["probabilidades"]
            fila[nombre] = elegir_ponderado(list(probs), list(probs.values()), rng)

        elif tipo == "booleana":
            si, no = var.get("valores", ["si", "no"])
            fila[nombre] = si if rng.random() < float(var["probabilidad"]) else no

        else:
            raise ValueError("tipo de variable desconocido: %r" % tipo)

    # Excluyentes cuantitativos: se aplican aqui, en la generacion, para que el CSV
    # solo contenga filas admisibles y no necesite columnas que las marquen.
    minimo = reglas.get("coste_minimo_eur")
    if minimo:
        costes = [v["nombre"] for v in variables if v["tipo"] == "coste_por_ratio"]
        if costes and fila[costes[0]] < float(minimo):
            return None

    return fila


def generar(ficha, escenarios_pedidos, rng):
    reglas = ficha.get("reglas", {})
    variables = ficha["variables"]
    arquetipos = ficha["arquetipos"]
    pesos = [a.get("peso", 1.0) for a in arquetipos]
    max_intentos = int(reglas.get("max_intentos_por_fila", 100))

    filas, rechazos = [], 0

    for nombre_esc in escenarios_pedidos:
        esc = ficha["escenarios"][nombre_esc]
        presentadas = int(esc["solicitudes"])
        admitidas = round(presentadas * float(esc.get("tasa_admision", 1.0)))

        for i in range(1, admitidas + 1):
            arq = elegir_ponderado(arquetipos, pesos, rng)
            fila = None
            for _ in range(max_intentos):
                fila = generar_fila(variables, arq, reglas, rng)
                if fila is not None:
                    break
                rechazos += 1
            if fila is None:
                sys.stderr.write(
                    "AVISO: el arquetipo %r no produce filas admisibles. "
                    "Revisa su calibracion, no subas max_intentos.\n" % arq["nombre"])
                continue

            fila["id"] = "SIM-%s-%04d" % (nombre_esc, i)
            fila["escenario"] = nombre_esc
            fila["origen_dato"] = "SINTETICO"
            fila["arquetipo"] = arq["nombre"]
            if "sector" in arq:
                fila["sector"] = arq["sector"]
            filas.append(fila)

    return filas, rechazos


# ---------------------------------------------------------------- salida

def columnas(ficha, filas):
    # `orden_columnas` permite fijar el orden exacto que espera el motor de puntuacion
    # de esa convocatoria. Si no se declara, se usa el orden natural de la ficha.
    declarado = ficha.get("orden_columnas")
    if declarado:
        return list(declarado)
    cols = ["id", "escenario", "origen_dato", "arquetipo"]
    if any("sector" in f for f in filas):
        cols.append("sector")
    cols += [v["nombre"] for v in ficha["variables"]]
    return cols


def escribir_csv(ruta, cols, filas, decimal_coma=True):
    def fmt(valor):
        if isinstance(valor, float):
            texto = "%.2f" % valor if abs(valor) < 1000 else "%.0f" % valor
            return texto.replace(".", ",") if decimal_coma else texto
        return valor

    with open(ruta, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh, delimiter=";")
        w.writerow(cols)
        for f in filas:
            w.writerow([fmt(f.get(c, "")) for c in cols])


def imprimir_resumen(ficha, filas, rechazos):
    def pct(v, p):
        v = sorted(v)
        k = (len(v) - 1) * p
        i = int(k)
        j = min(i + 1, len(v) - 1)
        return v[i] + (v[j] - v[i]) * (k - i)

    print("\n=== Poblacion generada ===")
    print("Filas admitidas: %d   (rechazadas por excluyentes durante el muestreo: %d)"
          % (len(filas), rechazos))

    for esc in sorted({f["escenario"] for f in filas}):
        n = sum(1 for f in filas if f["escenario"] == esc)
        print("  %-8s %d solicitudes admitidas" % (esc, n))

    print("\n--- Distribuciones obtenidas (contrastar con la ficha) ---")
    for var in ficha["variables"]:
        nombre, tipo = var["nombre"], var["tipo"]
        valores = [f[nombre] for f in filas if nombre in f]
        if not valores:
            continue
        if tipo in ("categorica", "booleana"):
            c = Counter(valores)
            reparto = "  ".join("%s %.0f%%" % (k, 100 * v / len(valores))
                                for k, v in c.most_common())
            marca = "  [JUICIO EXPERTO]" if var.get("origen") == "JUICIO_EXPERTO" else ""
            print("  %-24s %s%s" % (nombre, reparto, marca))
        else:
            print("  %-24s p25=%.4g  mediana=%.4g  p75=%.4g  max=%.4g"
                  % (nombre, pct(valores, .25), pct(valores, .5),
                     pct(valores, .75), max(valores)))

    # Las ratios son lo que puntua, asi que merecen su propio bloque.
    beneficios = [v for v in ficha["variables"] if v["tipo"] == "beneficio"]
    if beneficios:
        ben = beneficios[0]
        div = float(ben.get("por_unidad_baremo", 1))
        for var in ficha["variables"]:
            if var["tipo"] not in ("coste_por_ratio", "fraccion_de"):
                continue
            ratios = [(f[var["nombre"]] / 1e6) / (f[ben["nombre"]] / div)
                      for f in filas if f.get(ben["nombre"])]
            if ratios:
                print("  ratio %-18s p25=%.2f  mediana=%.2f  p75=%.2f  max=%.2f"
                      % (var["nombre"], pct(ratios, .25), pct(ratios, .5),
                         pct(ratios, .75), max(ratios)))

    notas = ficha.get("notas", [])
    if notas:
        print("\n--- Notas de la ficha ---")
        for nota in notas:
            print("  - %s" % nota)
    print()


# ---------------------------------------------------------------- cli

def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("ficha", help="ruta a la ficha de calibracion JSON")
    ap.add_argument("--salida", default="solicitudes_sinteticas.csv")
    ap.add_argument("--escenario", action="append",
                    help="genera solo estos escenarios (repetible). Por defecto, todos")
    ap.add_argument("--semilla", type=int, default=None,
                    help="fija la aleatoriedad para que la corrida sea reproducible")
    ap.add_argument("--resumen", action="store_true",
                    help="imprime las estadisticas de la poblacion generada")
    ap.add_argument("--punto-decimal", action="store_true",
                    help="usa punto en vez de coma como separador decimal")
    args = ap.parse_args()

    with open(args.ficha, encoding="utf-8") as fh:
        ficha = json.load(fh)

    escenarios = args.escenario or list(ficha["escenarios"])
    desconocidos = [e for e in escenarios if e not in ficha["escenarios"]]
    if desconocidos:
        sys.exit("Escenario no definido en la ficha: %s" % ", ".join(desconocidos))

    rng = random.Random(args.semilla)
    filas, rechazos = generar(ficha, escenarios, rng)
    if not filas:
        sys.exit("No se ha generado ninguna fila. Revisa reglas y arquetipos.")

    cols = columnas(ficha, filas)
    escribir_csv(args.salida, cols, filas, decimal_coma=not args.punto_decimal)

    print("Escritas %d solicitudes en %s" % (len(filas), args.salida))
    if args.semilla is not None:
        print("Semilla: %d (corrida reproducible)" % args.semilla)
    if args.resumen:
        imprimir_resumen(ficha, filas, rechazos)


if __name__ == "__main__":
    main()
