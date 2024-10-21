// Thank you to https://tools.wwwtyro.net/space-3d/index.html for the skybox texture.
// Thank you to NASA for the Sun, Moon, and Earth textures.

import * as THREE from 'three'; //"./node_modules/three/build/three.module.js"; //'https://cdn.jsdelivr.net/npm/three/build/three.module.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js"; //'https://cdn.jsdelivr.net/npm/three/examples/jsm/postprocessing/OutputPass.js';
import * as TWEEN from '@tweenjs/tween.js';
import { Easing } from '@tweenjs/tween.js';


const fps = 60;
const frameDelay = 1000 / fps;
let lastFrameTime = 0;
const defaultCameraPosition = new THREE.Vector3(-10, 3, 10);

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
}

const scene = new THREE.Scene();

// Planet (default: Earth)
const planetTexture = require("./public/earth-texture.jpg");
const planetGeometry = new THREE.SphereGeometry(3, 32, 32);
const planetMaterial = new THREE.MeshStandardMaterial( {
  map: new THREE.TextureLoader().load(planetTexture),
} );
const planetMesh = new THREE.Mesh(planetGeometry, planetMaterial);
planetMesh.name = "planet";
planetMesh.rotation.set(23.5 * THREE.MathUtils.DEG2RAD, 0, 0);
scene.add(planetMesh);

// Moon (default: Moon)
const moonOrbitRadius = 16;
const moonOrbitSpeed = -0.001;
let moonOrbitAngle = 0;
const moonTexture = require("./public/moon-texture.jpg");
const moonGeometry = new THREE.SphereGeometry(0.5, 16, 16);
const moonMaterial = new THREE.MeshStandardMaterial( {
  map: new THREE.TextureLoader().load(moonTexture),
} );
const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
moonMesh.name = "moon";
moonMesh.position.set(16, 0, 0);
moonMesh.lookAt(planetMesh.position);
moonMesh.rotateY(-3.14159/2);
scene.add(moonMesh);


// Star (default: Sun)
const starTexture = require("./public/star-texture.jpg");
const starGeometry = new THREE.SphereGeometry(25, 32, 32);
const starMaterial = new THREE.MeshStandardMaterial( {
  emissive: 0xffffff,
  emissiveMap: new THREE.TextureLoader().load(starTexture),
  emissiveIntensity: 0.75,
  map: new THREE.TextureLoader().load(starTexture)
} );
const starMesh = new THREE.Mesh(starGeometry, starMaterial);
starMesh.name = "star";
starMesh.position.set(0, 0, 500);
scene.add(starMesh);


// Sun Light
const sunLight = new THREE.DirectionalLight(0xFFFFFF, 0.5);
sunLight.intensity = 0.75;
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
camera.lookAt(planetMesh.getWorldPosition);
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
controls.enableDamping = true;
controls.enablePan = false;
controls.enableZoom = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.05;

// Click detection and ray casting
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function handleInteraction(event) {
  // Calculate mouse position in normalized device coordinates (-1 to +1) for both components
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // Update the picking ray with the camera and mouse position
  raycaster.setFromCamera(mouse, camera);

  // Calculate objects intersecting the picking ray
  const intersects = raycaster.intersectObjects(scene.children, true);

  if (intersects.length > 0) {
      focusOnObject(intersects[0].object);
  }
}

window.addEventListener('click', handleInteraction);
//window.addEventListener('touchstart', handleInteraction);
//window.addEventListener('pointerdown', handleInteraction);

function focusOnObject(object) {
  //console.log( "Clicked on ", object );
  if (object.name === "moon") { return; }
  camera.lookAt(object.getWorldPosition);

  const targetPosition = new THREE.Vector3().setFromMatrixPosition(object.matrixWorld);
  const currentCameraPosition = camera.position.clone();
  let radius;

  if (object.geometry.parameters.radius != undefined) {
    radius = object.geometry.parameters.radius;
  } else { return; }

  const fovFraction = 0.5;
  const fovInRadians = camera.fov * Math.PI / 180;
  const distance = radius / Math.sin((fovFraction * fovInRadians) / 2);

  // Determine the new camera position
  const direction = new THREE.Vector3().subVectors(camera.position, object.position).normalize();
  const newCameraPosition = new THREE.Vector3().addVectors(object.position, direction.multiplyScalar(distance));

  new TWEEN.Tween(camera.position)
    .to({
        x: newCameraPosition.x,
        y: newCameraPosition.y,
        z: newCameraPosition.z
    }, 1000)
    .easing(TWEEN.Easing.Quadratic.Out)
    .start();

  new TWEEN.Tween(controls.target)
    .to({
      x: object.position.x,
      y: object.position.y,
      z: object.position.z
    }, 1000)
    .easing(TWEEN.Easing.Quadratic.Out)
    .onUpdate(() => controls.update())
    .start();

  controls.update();

  console.log( "click end" );
  //camera.position.copy(currentCameraPosition);
}



// Key Listener
window.addEventListener('keydown', function(event) {
  if (event.key === 'r' || event.key === 'R') {
    focusOnObject(planetMesh);
  }
});


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



//resetCamera();
focusOnObject(planetMesh);
// Main Loop
const loop = (time) => {
  window.requestAnimationFrame(loop);
  const delta = time - lastFrameTime;
  if (delta < frameDelay) return;

  lastFrameTime = time - (delta % frameDelay);

  TWEEN.update();
  controls.update();
  planetMesh.rotateY(0.0005);

  moonOrbitAngle += moonOrbitSpeed;
  moonMesh.position.x = planetMesh.position.x + moonOrbitRadius * Math.cos(moonOrbitAngle);
  moonMesh.position.z = planetMesh.position.z + moonOrbitRadius * Math.sin(moonOrbitAngle);
  moonMesh.lookAt(planetMesh.position);
  moonMesh.rotateY(-3.14159/2);

  //renderer.render(scene, camera);
  composer.render(time);
}
loop()

// Timeline magic
const tl = gsap.timeline( { defaults: { duration: 1 } } );
tl.fromTo(planetMesh.scale, { z: 0, x: 0, y: 0 }, { z: 1, x: 1, y: 1 } );
tl.fromTo("div", { z: "-100%" }, { z: "0%" } );