"""
NEM-362-Kupplungsschacht zum Nachrüsten an einem Märklin-H0-Personenwagen.

Parametrisches build123d-Modell: Eine Montageplatte wird von unten an das
Drehgestell bzw. den Wagenboden geschraubt oder geklebt; ein Steg führt nach
vorn zur Pufferebene und trägt den Normschacht nach NEM 362 auf Normhöhe.

Koordinatensystem
    X  Wagenlängsrichtung, +X zeigt zum Wagenende (Pufferebene)
    Y  quer, Wagenmitte bei Y = 0
    Z  hoch, Z = 0 ist die Schienenoberkante (SO)
    Ursprung in X: Mitte der Befestigungsschraube

Vor dem Druck am Wagen nachmessen und unten in PARAMETER eintragen:
    MONTAGE_Z               Höhe der Anschraubfläche (Unterseite Drehgestell/Boden) über SO
    SCHRAUBE_BIS_PUFFER     Abstand Mitte Befestigungsschraube -> Pufferebene (Pufferteller)

Ausgabe: nem362_adapter.step, nem362_adapter.stl, nem362_adapter.svg
"""

from pathlib import Path

from build123d import (
    Align,
    Axis,
    Box,
    BuildPart,
    Cylinder,
    Locations,
    Mode,
    Plane,
    SlotCenterToCenter,
    BuildSketch,
    Circle,
    chamfer,
    export_stl,
    export_step,
    extrude,
    ExportSVG,
    LineType,
)

# --------------------------------------------------------------------------
# PARAMETER (alle Maße in mm)
# --------------------------------------------------------------------------

# --- NEM 362, Nenngröße H0 (Normblatt prüfen!) -----------------------------
SCHACHT_BREITE_INNEN = 3.2    # a = 3,2 ±0,1
SCHACHT_HOEHE_INNEN = 1.75    # b = 1,75 ±0,05
SCHACHT_OK_INNEN_Z = 7.1      # f = 7,1 ±0,1  -> Oberkante Schachtöffnung innen über SO
PUFFER_BIS_SCHACHT = 7.5      # e = 7,5 ±0,5  -> Pufferebene bis Schachtvorderkante
SCHACHT_TIEFE = 6.0           # Einstecktiefe der Kupplungsdeichsel

# Rastfenster für die Rastnase des Kupplungskopfes (oben und/oder unten)
RASTFENSTER_OBEN = True
RASTFENSTER_UNTEN = True
RASTFENSTER_LAENGE = 1.2      # in X
RASTFENSTER_BREITE = 2.0      # in Y
RASTFENSTER_ABSTAND = 2.0     # Schachtvorderkante bis Mitte Fenster

WAND = 0.7                    # Wandstärke Schacht (Resin: 0.6, FDM: >= 0.8)

# --- Wagenspezifisch: AM WAGEN NACHMESSEN ---------------------------------
MONTAGE_Z = 11.0              # Anschraubfläche über SO
SCHRAUBE_BIS_PUFFER = 22.0    # Schraubenmitte -> Pufferebene

# --- Montageplatte --------------------------------------------------------
PLATTE_DICKE = 1.6
PLATTE_BREITE = 8.0
PLATTE_HINTEN = 5.0           # Überstand hinter der Schraubenmitte
SCHRAUBE_D = 2.2              # Durchgang für M2 bzw. Märklin-Blechschraube
LANGLOCH = 2.0                # Verstellweg in X (0 = rundes Loch)
STEG_BREITE = 4.6             # Breite des Verbindungsstegs

# --------------------------------------------------------------------------
# Abgeleitete Maße
# --------------------------------------------------------------------------
schacht_front_x = SCHRAUBE_BIS_PUFFER - PUFFER_BIS_SCHACHT
schacht_aussen_b = SCHACHT_BREITE_INNEN + 2 * WAND
schacht_aussen_h = SCHACHT_HOEHE_INNEN + 2 * WAND
schacht_laenge = SCHACHT_TIEFE + WAND                 # mit Rückwand
schacht_innen_uk = SCHACHT_OK_INNEN_Z - SCHACHT_HOEHE_INNEN
schacht_uk = schacht_innen_uk - WAND
schacht_ok = SCHACHT_OK_INNEN_Z + WAND
schacht_back_x = schacht_front_x - schacht_laenge

platte_uk = MONTAGE_Z - PLATTE_DICKE
platte_vorn_x = schacht_back_x + 2.0                  # Platte überlappt Schacht etwas

assert platte_uk >= schacht_ok, (
    f"Montagefläche zu tief: Plattenunterkante {platte_uk:.2f} mm liegt unter "
    f"Schachtoberkante {schacht_ok:.2f} mm. PLATTE_DICKE oder MONTAGE_Z prüfen."
)
assert schacht_back_x >= (LANGLOCH + SCHRAUBE_D) / 2 + 2.0, (
    "SCHRAUBE_BIS_PUFFER zu klein - Steg/Schacht verdecken den Schraubenkopf."
)

# --------------------------------------------------------------------------
# Modell
# --------------------------------------------------------------------------
with BuildPart() as adapter:
    # Montageplatte
    with Locations((-PLATTE_HINTEN, 0, platte_uk)):
        Box(
            platte_vorn_x + PLATTE_HINTEN, PLATTE_BREITE, PLATTE_DICKE,
            align=(Align.MIN, Align.CENTER, Align.MIN),
        )

    # Senkrechter Steg zwischen Platte und Schacht
    steg_h = platte_uk - schacht_ok
    if steg_h > 0:
        with Locations((schacht_back_x, 0, schacht_ok)):
            Box(
                platte_vorn_x - schacht_back_x, STEG_BREITE, steg_h,
                align=(Align.MIN, Align.CENTER, Align.MIN),
            )

    # Schachtkörper
    with Locations((schacht_back_x, 0, schacht_uk)):
        Box(
            schacht_laenge, schacht_aussen_b, schacht_aussen_h,
            align=(Align.MIN, Align.CENTER, Align.MIN),
        )

    # Schachtöffnung (vorn offen)
    with Locations((schacht_front_x + 0.01, 0, schacht_innen_uk)):
        Box(
            SCHACHT_TIEFE + 0.01, SCHACHT_BREITE_INNEN, SCHACHT_HOEHE_INNEN,
            align=(Align.MAX, Align.CENTER, Align.MIN),
            mode=Mode.SUBTRACT,
        )

    # Rastfenster
    fenster_x = schacht_front_x - RASTFENSTER_ABSTAND
    if RASTFENSTER_OBEN:
        with Locations((fenster_x, 0, SCHACHT_OK_INNEN_Z - 0.01)):
            Box(
                RASTFENSTER_LAENGE, RASTFENSTER_BREITE, WAND + 0.02,
                align=(Align.CENTER, Align.CENTER, Align.MIN),
                mode=Mode.SUBTRACT,
            )
    if RASTFENSTER_UNTEN:
        with Locations((fenster_x, 0, schacht_uk - 0.01)):
            Box(
                RASTFENSTER_LAENGE, RASTFENSTER_BREITE, WAND + 0.02,
                align=(Align.CENTER, Align.CENTER, Align.MIN),
                mode=Mode.SUBTRACT,
            )

    # Einführschräge an der Schachtöffnung
    front_kanten = (
        adapter.edges()
        .filter_by(Axis.X, reverse=True)
        .filter_by_position(Axis.X, schacht_front_x - 0.001, schacht_front_x + 0.001)
    )
    innen_kanten = [
        e for e in front_kanten
        if abs(e.center().Y) <= SCHACHT_BREITE_INNEN / 2 + 1e-3
        and schacht_innen_uk - 1e-3 <= e.center().Z <= SCHACHT_OK_INNEN_Z + 1e-3
    ]
    if innen_kanten:
        chamfer(innen_kanten, 0.25)
    print(f"Einführschräge an {len(innen_kanten)} Kanten")

    # Befestigungsloch / Langloch
    with BuildSketch(Plane.XY.offset(platte_uk)) as loch:
        if LANGLOCH > 0:
            SlotCenterToCenter(LANGLOCH, SCHRAUBE_D)
        else:
            Circle(SCHRAUBE_D / 2)
    extrude(amount=PLATTE_DICKE, mode=Mode.SUBTRACT)

part = adapter.part

# --------------------------------------------------------------------------
# Export
# --------------------------------------------------------------------------
if __name__ == "__main__":
    out = Path(__file__).parent
    export_step(part, out / "nem362_adapter.step")
    export_stl(part, out / "nem362_adapter.stl", tolerance=0.005, angular_tolerance=0.1)

    # Seitenansicht (Blick von -Y, Pufferebene rechts) als SVG zur Kontrolle
    svg = ExportSVG(scale=8)
    svg.add_layer("sichtbar", line_weight=0.15)
    svg.add_layer("verdeckt", line_weight=0.08, line_type=LineType.ISO_DASH)
    c = part.bounding_box().center()
    vis, hid = part.project_to_viewport(
        (c.X, -1000, c.Z), viewport_up=(0, 0, 1), look_at=(c.X, 0, c.Z)
    )
    svg.add_shape(vis, layer="sichtbar")
    svg.add_shape(hid, layer="verdeckt")
    svg.write(out / "nem362_adapter.svg")

    bb = part.bounding_box()
    print(f"Volumen: {part.volume:.1f} mm³  valid={part.is_valid}")
    print(f"Bounding box X {bb.min.X:.2f}..{bb.max.X:.2f}  "
          f"Y {bb.min.Y:.2f}..{bb.max.Y:.2f}  Z {bb.min.Z:.2f}..{bb.max.Z:.2f}")
    print(f"Schacht innen: Z {schacht_innen_uk:.2f}..{SCHACHT_OK_INNEN_Z:.2f} über SO, "
          f"Vorderkante {PUFFER_BIS_SCHACHT:.1f} hinter Pufferebene")
