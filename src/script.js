import { createCamera } from './core/createCamera.js';
import { createOrbitControls } from './core/createControls.js';
import { createPostProcessing } from './core/createPostProcessing.js';
import { createRenderer } from './core/createRenderer.js';
import { createScene } from './core/createScene.js';
import { Sizes } from './core/Sizes.js';
import { addGround } from './world/ground.js';
import { addLighting } from './world/lighting.js';
import * as THREE from 'three/webgpu';

const canvas = document.querySelector('canvas.threejs');

const sizes = new Sizes();
const scene = createScene();
const camera = createCamera(sizes);
const renderer = await createRenderer(canvas, sizes);
const controls = createOrbitControls(camera, canvas);

createPostProcessing({ renderer, scene, camera });
addLighting({ scene, inspector: renderer.inspector });
addGround(scene);

sizes.onResize(() => {
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(sizes.pixelRatio);
});

const timer = new THREE.Timer();

const tick = () => {
  timer.update();
  controls.update();
  renderer.render(scene, camera);
};

renderer.setAnimationLoop(tick);
