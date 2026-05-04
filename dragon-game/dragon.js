import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Dragon model borrowed from ../dragon-over-sf; token is pratikyadav's (also used in mapbox-3d-buildings, mapbox-streets, etc.)
const MAPBOX_TOKEN = 'pk.eyJ1IjoicHJhdGlreWFkYXYiLCJhIjoiY2pocHcxYTNxMWRpdTM3cWp5dHZtM2d6bCJ9.iPF7EN0N_BUbdwQ04t_HSw';
const DRAGON_GLTF = '../dragon-over-sf/dragon_flying_cycle/scene.gltf';

const state = {
  // Start in the bay just NE of the Ferry Building, heading SW toward it
  lat: 37.7985,
  lng: -122.390,
  altitude: 50,     // metres above sea level
  speed: 80,        // km/h — dragons cruise slower than jets
  heading: 222,     // bearing toward the Ferry Building (~430 m away)
  pitch: 0,
  roll: 0,
  paused: false,
  cameraOrbit: 0,   // ° offset around dragon: 0 = behind, +90 = right, -90 = left
};

const keysDown = new Set();
let map;
let dragonModel = null;
let mixer = null;
let lastRenderTime = Date.now();
let lastTime = null;

mapboxgl.accessToken = MAPBOX_TOKEN;

map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/standard',
  center: [state.lng, state.lat],
  zoom: 14,
  pitch: 65,
  bearing: state.heading,
  antialias: true,
});

// Snap the camera to the chase position immediately, before any frame renders,
// so we never show the default constructor framing.
updateChaseCamera();
map.on('style.load', () => {
  if (typeof map.setConfigProperty === 'function') {
    map.setConfigProperty('basemap', 'lightPreset', 'dusk');
  }
  updateChaseCamera();
});

map.on('load', () => {
  map.addSource('mapbox-dem', {
    type: 'raster-dem',
    url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
    tileSize: 512,
    maxzoom: 14,
  });
  map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.4 });

  map.addLayer(createDragonLayer());

  setupKeyboard();
  requestAnimationFrame(gameLoop);
});

// ── Keyboard ───────────────────────────────────────────────────────────────
function setupKeyboard() {
  document.addEventListener('keydown', (e) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (e.code === 'Space') { state.paused = !state.paused; return; }
    keysDown.add(e.code);
  });
  document.addEventListener('keyup', (e) => keysDown.delete(e.code));
}

function updateControls(dt) {
  const ROLL_RATE = 90;
  const ROLL_MAX = 45;
  const ROLL_DECAY = 90;

  if (keysDown.has('KeyA')) {
    state.roll = Math.min(ROLL_MAX, state.roll + ROLL_RATE * dt);
  } else if (keysDown.has('KeyD')) {
    state.roll = Math.max(-ROLL_MAX, state.roll - ROLL_RATE * dt);
  } else {
    if (state.roll > 0) state.roll = Math.max(0, state.roll - ROLL_DECAY * dt);
    if (state.roll < 0) state.roll = Math.min(0, state.roll + ROLL_DECAY * dt);
  }

  if (keysDown.has('KeyW')) state.pitch = Math.min(45, state.pitch + 30 * dt);
  if (keysDown.has('KeyS')) state.pitch = Math.max(-45, state.pitch - 30 * dt);
  if (!keysDown.has('KeyW') && !keysDown.has('KeyS')) {
    // gentle pitch return-to-zero so dragon levels out when keys released
    if (state.pitch > 0) state.pitch = Math.max(0, state.pitch - 15 * dt);
    if (state.pitch < 0) state.pitch = Math.min(0, state.pitch + 15 * dt);
  }

  if (keysDown.has('ArrowUp'))   state.speed = Math.min(300, state.speed + 60 * dt);
  if (keysDown.has('ArrowDown')) state.speed = Math.max(20,  state.speed - 60 * dt);

  const ORBIT_RATE = 60; // °/s
  if (keysDown.has('ArrowLeft'))  state.cameraOrbit = (state.cameraOrbit - ORBIT_RATE * dt + 360) % 360;
  if (keysDown.has('ArrowRight')) state.cameraOrbit = (state.cameraOrbit + ORBIT_RATE * dt + 360) % 360;
}

// ── Position math ──────────────────────────────────────────────────────────
function advancePosition(dt) {
  state.heading = (state.heading - state.roll * 2 * dt + 360) % 360;

  const headingRad = state.heading * Math.PI / 180;
  const pitchRad = state.pitch * Math.PI / 180;
  const speedMs = state.speed / 3.6;
  const distM = speedMs * dt;

  const metersPerDegLat = 111111;
  const metersPerDegLng = 111111 * Math.cos(state.lat * Math.PI / 180);

  state.lat += (distM * Math.cos(headingRad) * Math.cos(pitchRad)) / metersPerDegLat;
  state.lng += (distM * Math.sin(headingRad) * Math.cos(pitchRad)) / metersPerDegLng;
  state.altitude += distM * Math.sin(pitchRad);
  state.altitude = Math.max(20, Math.min(8000, state.altitude));
}

// ── HUD ────────────────────────────────────────────────────────────────────
function updateHUD() {
  document.getElementById('hud-alt').textContent = `ALT ${Math.round(state.altitude)}m`;
  document.getElementById('hud-spd').textContent = `${Math.round(state.speed)} km/h`;
  document.getElementById('hud-hdg').textContent = `${Math.round(state.heading).toString().padStart(3, '0')}°`;

  const absRoll = Math.abs(state.roll);
  document.getElementById('hud-bnk').textContent =
    absRoll >= 1 ? `${Math.round(absRoll).toString().padStart(2, '0')}°${state.roll > 0 ? 'L' : 'R'}` : '';
}

// ── Game loop ──────────────────────────────────────────────────────────────
function gameLoop(timestamp) {
  requestAnimationFrame(gameLoop);

  if (state.paused) { lastTime = null; return; }

  const dt = lastTime ? Math.min((timestamp - lastTime) / 1000, 0.1) : 0.016;
  lastTime = timestamp;

  updateControls(dt);
  advancePosition(dt);
  updateChaseCamera();
  updateHUD();
}

// ── Dragon model (Three.js custom layer) ───────────────────────────────────
function createDragonLayer() {
  let threeCamera, scene, renderer;

  return {
    id: 'dragon-model',
    type: 'custom',
    renderingMode: '3d',

    onAdd(map, gl) {
      threeCamera = new THREE.Camera();
      scene = new THREE.Scene();

      scene.add(new THREE.AmbientLight(0xffffff, 0.7));
      const sun = new THREE.DirectionalLight(0xffffff, 1.2);
      sun.position.set(0.5, 1, 0.5).normalize();
      scene.add(sun);
      const fill = new THREE.DirectionalLight(0xffeedd, 0.6);
      fill.position.set(-0.5, 0.5, -0.5).normalize();
      scene.add(fill);

      new GLTFLoader().load(
        DRAGON_GLTF,
        (gltf) => {
          dragonModel = gltf.scene;
          scene.add(dragonModel);
          if (gltf.animations && gltf.animations.length) {
            mixer = new THREE.AnimationMixer(dragonModel);
            mixer.clipAction(gltf.animations[0]).setDuration(1).play();
          }
        },
        undefined,
        (err) => console.error('[dragon] GLTF load error:', err)
      );

      renderer = new THREE.WebGLRenderer({
        canvas: map.getCanvas(),
        context: gl,
        antialias: true,
      });
      renderer.autoClear = false;
    },

    render(_gl, matrix) {
      if (!dragonModel) { map.triggerRepaint(); return; }

      // advance wing-flap animation
      const now = Date.now();
      if (mixer) mixer.update((now - lastRenderTime) * 0.001);
      lastRenderTime = now;

      const mc = mapboxgl.MercatorCoordinate.fromLngLat(
        { lng: state.lng, lat: state.lat },
        state.altitude
      );
      const mercScale = mc.meterInMercatorCoordinateUnits();
      // The dragon GLTF is huge in its native units — dragon-over-sf used 0.0000003.
      // That's effectively a fixed Mercator scale, independent of latitude. Keep it
      // for a similar visible size, while mapping orientation correctly.
      const modelMetersPerUnit = 0.00000015 / mercScale; // ≈ metres per GLTF unit (50% of original)
      const s = modelMetersPerUnit * mercScale;

      // Orientation: GLTF Y-up → Mapbox Z-up via X+90°, then yaw (heading) about
      // local up (Y after the X swap), then pitch and roll.
      const modelMatrix = new THREE.Matrix4()
        .makeTranslation(mc.x, mc.y, mc.z)
        .scale(new THREE.Vector3(s, -s, s))
        .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2))
        .multiply(new THREE.Matrix4().makeRotationY(-(state.heading * Math.PI / 180) + Math.PI))
        .multiply(new THREE.Matrix4().makeRotationX(-(state.pitch * Math.PI / 180)))
        .multiply(new THREE.Matrix4().makeRotationZ(-(state.roll * Math.PI / 180)));

      const projMatrix = new THREE.Matrix4().fromArray(matrix);
      threeCamera.projectionMatrix = projMatrix.multiply(modelMatrix);

      renderer.resetState();
      renderer.render(scene, threeCamera);
      map.triggerRepaint();
    },
  };
}

// ── Chase camera ───────────────────────────────────────────────────────────
function updateChaseCamera() {
  // The camera sits BEHIND_M behind the dragon along (heading + cameraOrbit + 180°)
  // — i.e. orbit=0 places the camera directly behind.
  const camAngleRad = (state.heading + state.cameraOrbit + 180) * Math.PI / 180;
  const metersPerDegLat = 111111;
  const metersPerDegLng = 111111 * Math.cos(state.lat * Math.PI / 180);

  const BEHIND_M = 1300;
  const ABOVE_M = 120;

  const behindLat = state.lat + (BEHIND_M * Math.cos(camAngleRad)) / metersPerDegLat;
  const behindLng = state.lng + (BEHIND_M * Math.sin(camAngleRad)) / metersPerDegLng;

  const cam = map.getFreeCameraOptions();
  cam.position = mapboxgl.MercatorCoordinate.fromLngLat(
    { lng: behindLng, lat: behindLat },
    state.altitude + ABOVE_M
  );
  cam.lookAtPoint({ lng: state.lng, lat: state.lat }, undefined, state.altitude);
  map.setFreeCameraOptions(cam);
}
