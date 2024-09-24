// Thank you to https://tools.wwwtyro.net/space-3d/index.html for the skybox texture.
// Thank you to NASA for the Sun, Moon, and Earth textures.

import * as THREE from 'three'; //"./node_modules/three/build/three.module.js"; //'https://cdn.jsdelivr.net/npm/three/build/three.module.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

const fps = 60;
const frameDelay = 1000 / fps;
let lastFrameTime = 0;
const defaultCameraPosition = new THREE.Vector3(-10, 3, 10);

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
}

const scene = new THREE.Scene();

// Ambient Light
const ambientLight = new THREE.AmbientLight(0x111111);
scene.add(ambientLight);

// Sun Light
const sunLight = new THREE.DirectionalLight(0xFFFFFF, 0.5);
sunLight.intensity = 0.75;
sunLight.position.set(0, 0, 10);
sunLight.lookAt(new THREE.Vector3(0, 0, 0));
scene.add(sunLight);

// Helpers
// const gridHelper = new THREE.GridHelper(200, 50);
// scene.add(gridHelper);

const skybox_top = require("./public/skybox/top.png");
const skybox_bottom = require("./public/skybox/bottom.png");
const skybox_left = require("./public/skybox/left.png");
const skybox_right = require("./public/skybox/right.png");
const skybox_front = require("./public/skybox/front.png");
const skybox_back = require("./public/skybox/back.png");
const loader = new THREE.CubeTextureLoader();

const textureCube = loader.load([
  skybox_left, skybox_right,
  skybox_top, skybox_bottom,
  skybox_front, skybox_back
]);

scene.background = textureCube;

// Camera
const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 5000);
camera.position.copy(defaultCameraPosition);
scene.add(camera);

// Renderer
const canvas = document.querySelector('.webgl');
const renderer = new THREE.WebGLRenderer({canvas});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.render(scene, camera);

// Bloom
const bloomPass = new UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ), 1.5, 0.4, 0.85 );
bloomPass.threshold = 0.1; // Lower threshold to make the sun's emissive parts bloom more
bloomPass.strength = 1.5; // Adjust based on desired intensity
bloomPass.radius = 0.5; // Radius of the glow effect

// Effect Composer
const composer = new EffectComposer( renderer );
composer.addPass( new RenderPass(scene, camera) );
composer.addPass( bloomPass );

// Controls
const controls = new OrbitControls(camera, canvas);
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
  composer.setSize(sizes.width, sizes.height);
});


// Main Loop
const loop = (time) => {
  window.requestAnimationFrame(loop);
  const delta = time - lastFrameTime;
  if (delta < frameDelay) return;

  lastFrameTime = time - (delta % frameDelay);
  controls.update();

  //renderer.render(scene, camera);
  composer.render(time);
}
loop()

// Timeline magic
const tl = gsap.timeline( { defaults: { duration: 1 } } );
// tl.fromTo(planetMesh.scale, { z: 0, x: 0, y: 0 }, { z: 1, x: 1, y: 1 } );
tl.fromTo("div", { z: "-100%" }, { z: "0%" } );