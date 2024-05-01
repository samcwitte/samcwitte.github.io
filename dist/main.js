// Thank you to https://tools.wwwtyro.net/space-3d/index.html for the skybox texture.

import * as THREE from '../node_modules/three/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'https://cdn.jsdelivr.net/npm/three/examples/jsm/postprocessing/OutputPass.js';


const fps = 60;
const frameDelay = 1000 / fps;
let lastFrameTime = 0;

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
}

const scene = new THREE.Scene();

const planetTexture = new THREE.TextureLoader().load("earth-texture.jpg");
const planetGeometry = new THREE.SphereGeometry(3, 32, 32);
const planetMaterial = new THREE.MeshStandardMaterial( {
  map: planetTexture,
} );

const planetMesh = new THREE.Mesh(planetGeometry, planetMaterial);
planetMesh.rotation.set(23.5 * THREE.MathUtils.DEG2RAD, 0, 0);
scene.add(planetMesh);


// Sun Light
const sunLight = new THREE.DirectionalLight(0xFFFFFF, 0.5);
sunLight.intensity = 3;
sunLight.position.set(0, 0, 10);
sunLight.lookAt(new THREE.Vector3(0, 0, 0));

const lightHelper = new THREE.DirectionalLightHelper(sunLight);
scene.add(sunLight);
//scene.add(lightHelper);

// Ambient Light
const ambientLight = new THREE.AmbientLight(0x111111);
scene.add(ambientLight);


// Helpers
// const gridHelper = new THREE.GridHelper(200, 50);
// scene.add(gridHelper);

// Star creation
function addStar() {
  const starGeometry = new THREE.SphereGeometry(0.25, 24, 24);
  const starMaterial = new THREE.MeshStandardMaterial( { color: 0xffffff });
    starMaterial.emissive = new THREE.Color(255, 255, 255);
    starMaterial.emissiveIntensity = 1;
  const star = new THREE.Mesh(starGeometry, starMaterial);

  const [x, y, z] = Array(3).fill().map(() => 50 * THREE.MathUtils.randFloatSpread( 10 ) );

  star.position.set(x, y, z);
  scene.add(star);
}
// Array(200).fill().forEach(addStar);

const loader = new THREE.CubeTextureLoader();
loader.setPath( "skybox/" );

const textureCube = loader.load([
  "left.png", "right.png",
  "top.png", "bottom.png",
  "front.png", "back.png"
]);

scene.background = textureCube;

// Camera
const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 1000);
camera.position.z = 10;
camera.position.y = 3;
camera.position.x = -10;
scene.add(camera);

// Renderer
const canvas = document.querySelector('.webgl');
const renderer = new THREE.WebGLRenderer({canvas});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.render(scene, camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.enablePan = false;
controls.enableZoom = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.05;



// Resize
window.addEventListener("resize", () => {
  // Update Sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update Camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();
  renderer.setSize(sizes.width, sizes.height);
});




// Main Loop
const loop = (time) => {
  window.requestAnimationFrame(loop);
  const delta = time - lastFrameTime;
  if (delta < frameDelay) return;

  lastFrameTime = time - (delta % frameDelay);

  controls.update();
  planetMesh.rotateY(0.0005);
  renderer.render(scene, camera);
}
loop()

// Timeline magic
const tl = gsap.timeline( { defaults: { duration: 1 } } );
tl.fromTo(planetMesh.scale, { z: 0, x: 0, y: 0 }, { z: 1, x: 1, y: 1 } );
tl.fromTo("div", { z: "-100%" }, { z: "0%" } );