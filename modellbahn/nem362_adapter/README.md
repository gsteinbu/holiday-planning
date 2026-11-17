# NEM-362-Kupplungsschacht zum Nachrüsten (Märklin H0 Personenwagen)

Parametrisches [build123d](https://github.com/gumyr/build123d)-Modell eines Adapters:
Montageplatte (von unten an Drehgestell/Wagenboden schrauben) → Steg → Normschacht nach NEM 362.

```bash
pip install build123d
python3 nem362_adapter.py      # erzeugt .step, .stl, .svg (Seitenansicht)
```

## Vor dem Druck nachmessen
| Parameter | Bedeutung | Default |
|---|---|---|
| `MONTAGE_Z` | Anschraubfläche über Schienenoberkante | 11.0 |
| `SCHRAUBE_BIS_PUFFER` | Schraubenmitte → Pufferebene | 22.0 |

## NEM-362-Werte (H0)
a = 3,2 (Schachtbreite innen), b = 1,75 (Höhe innen), f = 7,1 (Oberkante innen über SO),
e = 7,5 (Pufferebene → Schachtvorderkante). Bitte gegen das Normblatt NEM 362 prüfen.

Druck: Resin empfohlen (Wand 0,6–0,7 mm). Bei FDM `WAND` ≥ 0,8 und Schacht mit Öffnung nach oben drucken.

## 3D-Ansicht
- `nem362_adapter_3d.html`: eigenständiger, drehbarer 3D-Viewer (offline, im Browser öffnen)
- `ansicht_vorn_unten.png`, `ansicht_oben.png`: Standbilder
- Neu erzeugen: `npm install three@0.170.0`, dann `python3 make_viewer.py node_modules/three`
