"""
Erzeugt einen eigenständigen 3D-Viewer (nem362_adapter_3d.html) mit three.js.

    npm install three@0.170.0          # einmalig, irgendwo
    python3 make_viewer.py <pfad/zu/node_modules/three>

Die HTML-Datei enthält three.js und das Modell komplett und läuft offline
in jedem Browser (Maus: drehen / zoomen / verschieben).
"""
import base64
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from nem362_adapter import part, SCHRAUBE_BIS_PUFFER  # noqa: E402

three_dir = Path(sys.argv[1])
here = Path(__file__).parent

verts, tris = part.tessellate(0.005, 0.1)
pos = [c for t in tris for i in t for c in (verts[i].X, verts[i].Y, verts[i].Z)]

kanten = []
for e in part.edges():
    n = 2 if e.geom_type.name == "LINE" else 24
    pts = [e.position_at(i / n) for i in range(n + 1)]
    for a, b in zip(pts, pts[1:]):
        kanten += [a.X, a.Y, a.Z, b.X, b.Y, b.Z]

bb = part.bounding_box()
daten = {"pos": [round(v, 4) for v in pos], "kanten": [round(v, 4) for v in kanten],
         "puffer_x": SCHRAUBE_BIS_PUFFER,
         "center": [bb.center().X, bb.center().Y, bb.center().Z]}


def data_url(p: Path) -> str:
    return "data:text/javascript;base64," + base64.b64encode(p.read_bytes()).decode()


html = f"""<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8">
<title>NEM-362-Schacht-Adapter – 3D</title>
<style>
 html,body{{margin:0;height:100%;background:#f4f4f2;font-family:system-ui,sans-serif;overflow:hidden}}
 #info{{position:absolute;left:12px;top:10px;color:#333;font-size:13px;line-height:1.5;
        background:rgba(255,255,255,.85);padding:8px 12px;border-radius:6px}}
 #info b{{font-size:15px}}
</style>
<script type="importmap">
{{"imports":{{"three":"{data_url(three_dir / 'build/three.module.min.js')}",
 "three/addons/controls/OrbitControls.js":"{data_url(three_dir / 'examples/jsm/controls/OrbitControls.js')}"}}}}
</script></head><body>
<div id="info"><b>NEM-362-Schacht-Adapter (H0)</b><br>
Ziehen: drehen · Rad: zoomen · Rechtsklick: verschieben<br>
<span style="color:#4682b4">blau</span>: Pufferebene · <span style="color:#888">grau</span>: Schienenoberkante (SO)</div>
<script type="module">
import * as THREE from "three";
import {{ OrbitControls }} from "three/addons/controls/OrbitControls.js";
const D = {json.dumps(daten)};
const renderer = new THREE.WebGLRenderer({{antialias:true, preserveDrawingBuffer:true}});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf4f4f2);
THREE.Object3D.DEFAULT_UP.set(0,0,1);
const cam = new THREE.PerspectiveCamera(30, innerWidth/innerHeight, 0.1, 1000);
cam.up.set(0,0,1);
const c = new THREE.Vector3(...D.center);
const startPos = new THREE.Vector3(c.x+28, c.y-38, c.z-6);
cam.position.copy(startPos);
const ctl = new OrbitControls(cam, renderer.domElement);
ctl.target.copy(c); ctl.enableDamping = true; ctl.update();

const g = new THREE.BufferGeometry();
g.setAttribute("position", new THREE.Float32BufferAttribute(D.pos, 3));
g.computeVertexNormals();
scene.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({{
  color:0xc8552e, roughness:.55, metalness:.05, side:THREE.DoubleSide,
  polygonOffset:true, polygonOffsetFactor:1, polygonOffsetUnits:1}})));
const kg = new THREE.BufferGeometry();
kg.setAttribute("position", new THREE.Float32BufferAttribute(D.kanten, 3));
scene.add(new THREE.LineSegments(kg, new THREE.LineBasicMaterial({{color:0x3a1a10}})));

// Pufferebene
const pe = new THREE.Mesh(new THREE.PlaneGeometry(14, 14),
  new THREE.MeshBasicMaterial({{color:0x4682b4, transparent:true, opacity:.12, side:THREE.DoubleSide, depthWrite:false}}));
pe.rotation.y = Math.PI/2; pe.position.set(D.puffer_x, 0, 7); scene.add(pe);
// Schienenoberkante: zwei Schienen (Spurweite 16,5)
for (const y of [-8.25, 8.25]) {{
  const s = new THREE.Mesh(new THREE.BoxGeometry(40, 0.6, 0.4),
    new THREE.MeshStandardMaterial({{color:0x999999}}));
  s.position.set(D.puffer_x-15, y, -0.2); scene.add(s);
}}

scene.add(new THREE.HemisphereLight(0xffffff, 0x8888aa, 1.4));
const dl = new THREE.DirectionalLight(0xffffff, 1.8); dl.position.set(20,-30,40); scene.add(dl);
const dl2 = new THREE.DirectionalLight(0xffffff, .7); dl2.position.set(-20,25,-10); scene.add(dl2);

addEventListener("resize", () => {{
  cam.aspect = innerWidth/innerHeight; cam.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}});
window.setView = (x,y,z) => {{ cam.position.set(c.x+x, c.y+y, c.z+z); ctl.update(); }};
(function loop(){{ ctl.update(); renderer.render(scene, cam); requestAnimationFrame(loop); }})();
</script></body></html>"""
out = here / "nem362_adapter_3d.html"
out.write_text(html, encoding="utf-8")
print(out, f"{out.stat().st_size/1024:.0f} kB")
