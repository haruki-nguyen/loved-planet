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
const m = new THREE.PointsMaterial({
  size: 0.1,
  transparent: true,
  blending: THREE.AdditiveBlending,
  onBeforeCompile: (shader) => {
    shader.uniforms.time = gu.time;
    shader.vertexShader = `
      uniform float time;
      attribute float sizes;
      attribute vec4 shift;
      varying vec3 vColor;
      ${shader.vertexShader}
    `
      .replace(`gl_PointSize = size;`, `gl_PointSize = size * sizes;`)
      .replace(
        `#include <color_vertex>`,
        `#include <color_vertex>
        float d = length(abs(position) / vec3(40., 10., 40));
        d = clamp(d, 0., 1.);
        vColor = mix(vec3(227., 155., 0.), vec3(100., 50., 255.), d) / 255.;
      `
      )
      .replace(
        `#include <begin_vertex>`,
        `#include <begin_vertex>
        float t = time;
        float moveT = mod(shift.x + shift.z * t, PI2);
        float moveS = mod(shift.y + shift.z * t, PI2);
        transformed += vec3(cos(moveS) * sin(moveT), cos(moveT), sin(moveS) * sin(moveT)) * shift.a;
      `
      );
    shader.fragmentShader = `
      varying vec3 vColor;
      ${shader.fragmentShader}
    `
      .replace(
        `#include <clipping_planes_fragment>`,
        `#include <clipping_planes_fragment>
        float d = length(gl_PointCoord.xy - 0.5);
        if (d > 0.5) discard;
      `
      )
      .replace(
        `vec4 diffuseColor = vec4( diffuse, opacity );`,
        `vec4 diffuseColor = vec4( vColor, smoothstep(0.5, 0.2, d) * 0.5 + 0.5 );`
      );
  },
});
const p = new THREE.Points(g, m);
p.rotation.order = "ZYX";
p.rotation.z = 0.2;
scene.add(p);

const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  controls.update();
  const t = clock.getElapsedTime() * 0.5;
  gu.time.value = t * Math.PI;
  p.rotation.y = t * 0.05;
  renderer.render(scene, camera);
});

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
