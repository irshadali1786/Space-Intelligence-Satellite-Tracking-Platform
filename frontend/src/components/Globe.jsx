import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// Earth textures are loaded in the browser from the three-globe example assets.
const TEX = "https://unpkg.com/three-globe@2.31.0/example/img/";
const R = 1; // Earth radius = 1 unit (6371 km)

// Same frame as an equirectangular texture wrapped on SphereGeometry.
export function llaToVec(lat, lon, altKm = 0, out = new THREE.Vector3()) {
  const r = R + altKm / 6371;
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon + 180);
  return out.set(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

const AMBER = new THREE.Color("#D99A45");
const IVORY = new THREE.Color("#E9E0D0");

/**
 * props:
 *  satellites: [{satellite_id, name, latitude_deg, longitude_deg, altitude_km}]
 *  selectedId, onSelect(id)
 *  path: [{latitude_deg, longitude_deg, altitude_km}] orbit path of the selected satellite
 *  autoRotate, interactive, markerSize
 */
export default function Globe({ satellites = [], selectedId, onSelect, path = [], autoRotate = true, markerSize = 0.012, cameraZ = 3.2 }) {
  const mount = useRef(null);
  const state = useRef({});
  const cb = useRef({ onSelect, satellites });
  cb.current = { onSelect, satellites };

  // one-time scene setup
  useEffect(() => {
    const el = mount.current;
    const w = () => el.clientWidth, h = () => el.clientHeight;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, w() / h(), 0.1, 100);
    camera.position.set(0, 0.6, cameraZ);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w(), h());
    el.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.minDistance = 1.5;
    controls.maxDistance = 6;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.35;

    // lighting: one warm "sun" plus very low ambient
    const sun = new THREE.DirectionalLight(0xfff1dc, 2.6);
    sun.position.set(5, 2, 4);
    scene.add(sun, new THREE.AmbientLight(0x6a6258, 0.55));

    const loader = new THREE.TextureLoader();
    const earthMat = new THREE.MeshPhongMaterial({ color: 0x3a3a3a, shininess: 8, specular: new THREE.Color(0x2a2620) });
    const earth = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 96), earthMat);
    scene.add(earth);
    loader.load(TEX + "earth-blue-marble.jpg", (t) => { t.colorSpace = THREE.SRGBColorSpace; earthMat.map = t; earthMat.color.set(0xffffff); earthMat.needsUpdate = true; });
    loader.load(TEX + "earth-topology.png", (t) => { earthMat.bumpMap = t; earthMat.bumpScale = 0.02; earthMat.needsUpdate = true; });

    // atmosphere: fresnel rim, warm and subtle
    const atmo = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.045, 96, 96),
      new THREE.ShaderMaterial({
        transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
        vertexShader: "varying vec3 vN; void main(){ vN = normalize(normalMatrix*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} ",
        fragmentShader: "varying vec3 vN; void main(){ float i = pow(0.62 - dot(vN, vec3(0.,0.,1.)), 3.0); gl_FragColor = vec4(0.86,0.66,0.40,1.0)*i*0.9; }",
      })
    );
    scene.add(atmo);

    // faint starfield
    const sp = new Float32Array(1500 * 3);
    for (let i = 0; i < sp.length; i += 3) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(30 + Math.random() * 20);
      sp.set([v.x, v.y, v.z], i);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xe9e0d0, size: 0.05, transparent: true, opacity: 0.55 })));

    // satellite markers (single Points object for performance)
    // Buffers are allocated ONCE and updated in place (setDrawRange), so updates never leak GPU memory.
    const MAX_MARKERS = 1500, MAX_PATH = 2000;
    const mGeo = new THREE.BufferGeometry();
    const mPos = new THREE.BufferAttribute(new Float32Array(MAX_MARKERS * 3), 3);
    const mCol = new THREE.BufferAttribute(new Float32Array(MAX_MARKERS * 3), 3);
    mPos.setUsage(THREE.DynamicDrawUsage); mCol.setUsage(THREE.DynamicDrawUsage);
    mGeo.setAttribute("position", mPos); mGeo.setAttribute("color", mCol);
    mGeo.setDrawRange(0, 0);
    mGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 50);   // fixed: skip per-frame recompute
    const markers = new THREE.Points(mGeo, new THREE.PointsMaterial({ size: markerSize, vertexColors: true, sizeAttenuation: true, depthWrite: false }));
    scene.add(markers);

    const lGeo = new THREE.BufferGeometry();
    const lPos = new THREE.BufferAttribute(new Float32Array(MAX_PATH * 3), 3);
    lPos.setUsage(THREE.DynamicDrawUsage);
    lGeo.setAttribute("position", lPos); lGeo.setDrawRange(0, 0);
    lGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 50);
    const pathLine = new THREE.Line(lGeo, new THREE.LineBasicMaterial({ color: AMBER, transparent: true, opacity: 0.8 }));
    scene.add(pathLine);

    const ray = new THREE.Raycaster();
    ray.params.Points.threshold = 0.02;
    const mouse = new THREE.Vector2();
    let downAt = null;
    const dom = renderer.domElement;
    const onDown = (e) => { downAt = [e.clientX, e.clientY]; };
    const onUp = (e) => {
      if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 4) return; // was a drag
      const rect = dom.getBoundingClientRect();
      mouse.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      ray.setFromCamera(mouse, camera);
      const hits = ray.intersectObject(markers);
      // ignore markers hidden behind the Earth
      const hit = hits.find((x) => x.point.dot(camera.position) > 0 && x.distanceToRay != null);
      if (hit && cb.current.onSelect) cb.current.onSelect(cb.current.satellites[hit.index]?.satellite_id);
    };
    dom.addEventListener("pointerdown", onDown);
    dom.addEventListener("pointerup", onUp);

    let raf;
    const loop = () => { controls.update(); renderer.render(scene, camera); raf = requestAnimationFrame(loop); };
    loop();

    const onResize = () => { camera.aspect = w() / h(); camera.updateProjectionMatrix(); renderer.setSize(w(), h()); };
    const ro = new ResizeObserver(onResize);
    ro.observe(el);

    state.current = { markers, pathLine, controls };
    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      dom.removeEventListener("pointerdown", onDown); dom.removeEventListener("pointerup", onUp);
      controls.dispose();
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
        mats.forEach((m) => { ["map", "bumpMap"].forEach((k) => m[k] && m[k].dispose()); m.dispose(); });
      });
      renderer.dispose();
      renderer.forceContextLoss();
      if (dom.parentNode === el) el.removeChild(dom);
    };
  }, []); // eslint-disable-line

  // update marker positions in place
  useEffect(() => {
    const { markers } = state.current;
    if (!markers) return;
    const g = markers.geometry, pos = g.getAttribute("position"), col = g.getAttribute("color");
    const n = Math.min(satellites.length, pos.count);
    const v = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const s = satellites[i];
      llaToVec(s.latitude_deg, s.longitude_deg, s.altitude_km, v).toArray(pos.array, i * 3);
      (s.satellite_id === selectedId ? IVORY : AMBER).toArray(col.array, i * 3);
    }
    pos.needsUpdate = true; col.needsUpdate = true;
    g.setDrawRange(0, n);
  }, [satellites, selectedId]);

  // update orbit path in place
  useEffect(() => {
    const { pathLine } = state.current;
    if (!pathLine) return;
    const g = pathLine.geometry, pos = g.getAttribute("position");
    const n = Math.min(path.length, pos.count);
    const v = new THREE.Vector3();
    for (let i = 0; i < n; i++) llaToVec(path[i].latitude_deg, path[i].longitude_deg, path[i].altitude_km, v).toArray(pos.array, i * 3);
    pos.needsUpdate = true;
    g.setDrawRange(0, n);
  }, [path]);

  useEffect(() => { if (state.current.controls) state.current.controls.autoRotate = autoRotate; }, [autoRotate]);

  return <div ref={mount} className="w-full h-full" />;
}
