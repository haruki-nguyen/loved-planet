import * as THREE from "https://cdn.skypack.dev/three@0.136.0";
import { OrbitControls } from "https://cdn.skypack.dev/three@0.136.0/examples/jsm/controls/OrbitControls";

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x160016);
const camera = new THREE.PerspectiveCamera(
  60,
  innerWidth / innerHeight,
  1,
  1000
);
camera.position.set(0, 4, 21);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

// Handle window resize
window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;

// Uniforms
const gu = {
  time: { value: 0 },
};

// Starfield data
const sizes = [];
const shift = [];
const pushShift = () => {
  shift.push(
    Math.random() * Math.PI,
    Math.random() * Math.PI * 2,
    (Math.random() * 0.9 + 0.1) * Math.PI * 0.1,
    Math.random() * 0.9 + 0.1
  );
};

const pts = Array.from({ length: 25000 }, () => {
  sizes.push(Math.random() * 1.5 + 0.5);
  pushShift();
  return new THREE.Vector3()
    .randomDirection()
    .multiplyScalar(Math.random() * 0.5 + 9.5);
});
for (let i = 0; i < 50000; i++) {
  const r = 10,
    R = 40;
  const rand = Math.pow(Math.random(), 1.5);
  const radius = Math.sqrt(R * R * rand + (1 - rand) * r * r);
  pts.push(
    new THREE.Vector3().setFromCylindricalCoords(
      radius,
      Math.random() * 2 * Math.PI,
      (Math.random() - 0.5) * 2
    )
  );
  sizes.push(Math.random() * 1.5 + 0.5);
  pushShift();
}

const g = new THREE.BufferGeometry().setFromPoints(pts);
g.setAttribute("sizes", new THREE.Float32BufferAttribute(sizes, 1));
g.setAttribute("shift", new THREE.Float32BufferAttribute(shift, 4));

// Load the sparkle atlas
const atlasTexture = new THREE.TextureLoader().load(
  "src/images/sparkle-atlas.png"
);
atlasTexture.minFilter = THREE.LinearFilter;
atlasTexture.magFilter = THREE.LinearFilter;

// Assign a random atlas index (0-9) to each sparkle
const atlasIndices = [];
const numImages = 10;
for (let i = 0; i < pts.length; i++) {
  atlasIndices.push(Math.floor(Math.random() * numImages));
}
g.setAttribute("atlasIndex", new THREE.Float32BufferAttribute(atlasIndices, 1));

// ShaderMaterial for sparkles with atlas support
const cols = 5;
const rows = 2;
const imgSize = 1.0 / cols;
const rowSize = 1.0 / rows;

const sparkleMaterial = new THREE.ShaderMaterial({
  uniforms: {
    time: gu.time,
    atlas: { value: atlasTexture },
    aspectRatio: { value: 3 / 4 },
    cols: { value: cols },
    rows: { value: rows },
  },
  vertexShader: `
    attribute float sizes;
    attribute vec4 shift;
    attribute float atlasIndex;
    uniform float time;
    varying float vAtlasIndex;
    void main() {
      float t = time;
      float moveT = mod(shift.x + shift.z * t, 6.28318530718);
      float moveS = mod(shift.y + shift.z * t, 6.28318530718);
      vec3 transformed = position + vec3(cos(moveS) * sin(moveT), cos(moveT), sin(moveS) * sin(moveT)) * shift.a;
      vAtlasIndex = atlasIndex;
      vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      gl_PointSize = sizes * 0.15 * (300.0 / length(mvPosition.xyz));
    }
  `,
  fragmentShader: `
    uniform sampler2D atlas;
    uniform float aspectRatio;
    uniform float cols;
    uniform float rows;
    varying float vAtlasIndex;
    void main() {
      float aspect = aspectRatio;
      vec2 centered = gl_PointCoord - vec2(0.5);
      float halfHeight = 0.5;
      float halfWidth = 0.5 * aspect;
      if (abs(centered.x) > halfWidth || abs(centered.y) > halfHeight) discard;
      // Atlas UV calculation with 180 degree rotation
      float idx = vAtlasIndex;
      float col = mod(idx, cols);
      float row = floor(idx / cols);
      vec2 uv = vec2(1.0 - gl_PointCoord.x, 1.0 - gl_PointCoord.y);
      uv.x = uv.x / cols + col / cols;
      uv.y = uv.y / rows + row / rows;
      vec4 texColor = texture2D(atlas, uv);
      if (texColor.a < 0.1) discard;
      gl_FragColor = vec4(texColor.rgb, 1.0);
    }
  `,
  transparent: false,
  depthWrite: false,
});

const p = new THREE.Points(g, sparkleMaterial);
p.rotation.order = "ZYX";
p.rotation.z = 0.2;
scene.add(p);

const clock = new THREE.Clock();

// Animation pause/resume state
let animationPaused = false;

// Space key binding to toggle animation
window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    animationPaused = !animationPaused;
    // Prevent scrolling when pressing space
    e.preventDefault();
    // If resuming, restart the animation loop
    if (!animationPaused) {
      renderer.setAnimationLoop(animationLoop);
    } else {
      renderer.setAnimationLoop(null);
    }
  }
});

function animationLoop() {
  controls.update();
  const t = clock.getElapsedTime() * 0.375;
  gu.time.value = t * Math.PI;
  p.rotation.y = t * 0.0375;
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animationLoop);

// Typewriter effect
const text1Elem = document.getElementById("text1");
text1Elem.classList.add("typing-text");
let i = 0;
const txt1 =
  "Một món quà nhỏ <Trong lúc rảnh rỗi <Anh dành cho bé << Anh yêu Cúc! < Anh thương vợ!! < Chồng thương vợ!!!";
const speed = 50;

// Add caret only once
let caret = document.getElementById("caret");
if (!caret) {
  caret = document.createElement("span");
  caret.id = "caret";
  text1Elem.after(caret);
}

function typeWriter() {
  if (i < txt1.length) {
    const char = txt1.charAt(i);
    if (char === "<") {
      const br = document.createElement("br");
      text1Elem.appendChild(br);
      text1Elem.appendChild(caret);
      i++;
      typeWriter();
    } else if (char === ">") {
      // Ignore '>'
      i++;
      typeWriter();
    } else {
      const span = document.createElement("span");
      span.textContent = char;
      span.style.animationDelay = `0s`;
      text1Elem.appendChild(span);
      text1Elem.appendChild(caret);
      // Trigger fade-in
      span.style.animation = "fadeIn 0.15s forwards";
      i++;
      setTimeout(typeWriter, 150);
    }
  }
}
// Ensure the typewriter only runs once
if (!window.typewriterStarted) {
  window.typewriterStarted = true;
  typeWriter();
}

// --- Add glowing pink neon circles ---
const neonCount = 6000;
const neonPositions = [];
for (let i = 0; i < neonCount; i++) {
  if (i < neonCount / 3) {
    // 1/3: Distribute randomly in space
    const v = new THREE.Vector3()
      .randomDirection()
      .multiplyScalar(Math.random() * 0.5 + 9.5);
    neonPositions.push(v.x, v.y, v.z);
  } else if (i < (2 * neonCount) / 3) {
    // 1/3: Distribute along the planet's orbit (ring)
    const orbitRadius = 20 + Math.random() * 10; // orbit between 20 and 30 units from center
    const angle = Math.random() * Math.PI * 2;
    const yJitter = (Math.random() - 0.5) * 2; // small vertical jitter
    const x = Math.cos(angle) * orbitRadius;
    const y = yJitter;
    const z = Math.sin(angle) * orbitRadius;
    neonPositions.push(x, y, z);
  } else {
    // 1/3: Distribute along a larger outer ring
    const outerRadius = 40 + Math.random() * 10; // orbit between 40 and 50 units from center
    const angle = Math.random() * Math.PI * 2;
    const yJitter = (Math.random() - 0.5) * 2; // small vertical jitter
    const x = Math.cos(angle) * outerRadius;
    const y = yJitter;
    const z = Math.sin(angle) * outerRadius;
    // Tilt the ring by 30 degrees around the X axis
    const tilt = Math.PI / 6; // 30 degrees
    const yT = y * Math.cos(tilt) - z * Math.sin(tilt);
    const zT = y * Math.sin(tilt) + z * Math.cos(tilt);
    neonPositions.push(x, yT, zT);
  }
}
const neonGeometry = new THREE.BufferGeometry();
neonGeometry.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(neonPositions, 3)
);

const neonMaterial = new THREE.ShaderMaterial({
  uniforms: {
    color: { value: new THREE.Color(0xff33cc) },
  },
  vertexShader: `
    void main() {
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      gl_PointSize = 0.4 * (300.0 / length(mvPosition.xyz));
    }
  `,
  fragmentShader: `
    uniform vec3 color;
    void main() {
      float dist = length(gl_PointCoord - vec2(0.5));
      float alpha = smoothstep(0.5, 0.0, dist);
      vec3 core = mix(vec3(1.0), color, dist * 2.0);
      vec3 glow = color * (1.0 - dist) * 3.0;
      gl_FragColor = vec4(core + glow, alpha);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

const neonPoints = new THREE.Points(neonGeometry, neonMaterial);
scene.add(neonPoints);

// --- Audio player logic ---
const audio = document.getElementById("bg-music");
const playPauseBtn = document.getElementById("play-pause");
const audioSlider = document.getElementById("audio-slider");
const audioTime = document.getElementById("audio-time");

function formatTime(sec) {
  if (isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Set initial icon to play (⏵) since music is not playing at startup
playPauseBtn.textContent = "⏵";

// Modal logic
const musicModal = document.getElementById("music-modal");
const musicYes = document.getElementById("music-yes");
const musicNo = document.getElementById("music-no");

// Show modal at startup
musicModal.style.display = "flex";

musicYes.addEventListener("click", () => {
  audio.play();
  musicModal.style.display = "none";
});

musicNo.addEventListener("click", () => {
  musicModal.style.display = "none";
});

// Loop music when ended
audio.addEventListener("ended", () => {
  audio.currentTime = 0;
  audio.play();
});

// Play/pause button logic
playPauseBtn.addEventListener("click", () => {
  if (audio.paused) {
    audio.play();
  } else {
    audio.pause();
  }
});

audio.addEventListener("play", () => {
  playPauseBtn.textContent = "⏸";
});
audio.addEventListener("pause", () => {
  playPauseBtn.textContent = "⏵";
});

// Slider logic
function updateSlider() {
  if (!isNaN(audio.duration)) {
    audioSlider.max = Math.floor(audio.duration);
    audioSlider.value = Math.floor(audio.currentTime);
    audioTime.textContent = `${formatTime(audio.currentTime)}/${formatTime(
      audio.duration
    )}`;
  } else {
    audioTime.textContent = "0:00/0:00";
  }
}
audio.addEventListener("timeupdate", updateSlider);
audio.addEventListener("loadedmetadata", updateSlider);

audioSlider.addEventListener("input", () => {
  audio.currentTime = audioSlider.value;
});

const toggleBtn = document.getElementById("toggle-container-btn");
const container = document.querySelector(".container");

let containerVisible = true;
toggleBtn.addEventListener("click", () => {
  containerVisible = !containerVisible;
  if (containerVisible) {
    container.style.display = "";
    toggleBtn.textContent = "×";
  } else {
    container.style.display = "none";
    toggleBtn.textContent = "☰";
  }
});
// Set initial icon
if (containerVisible) {
  toggleBtn.textContent = "×";
} else {
  toggleBtn.textContent = "☰";
}
