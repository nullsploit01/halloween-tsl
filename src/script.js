import { createCamera } from './core/createCamera.js';
import { createOrbitControls } from './core/createControls.js';
import { createPostProcessing } from './core/createPostProcessing.js';
import { createRenderer } from './core/createRenderer.js';
import { createScene } from './core/createScene.js';
import { addLighting } from './core/lighting.js';
import { Sizes } from './core/Sizes.js';
import { addWorld } from './world/addWorld.js';
import * as THREE from 'three/webgpu';

const canvas = document.querySelector('canvas.threejs');

const sizes = new Sizes();
const scene = createScene();
const camera = createCamera(sizes);
const renderer = await createRenderer(canvas, sizes);
const controls = createOrbitControls(camera, canvas);

createPostProcessing({ renderer, scene, camera });
addLighting({ scene, renderer });
const {lanternController} = await addWorld(scene);

sizes.onResize(() => {
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(sizes.pixelRatio);
});

const timer = new THREE.Timer();
const cameraOffset = new THREE.Vector3(0, 3, 6)
const cameraFollowSpeed = 8

const tick = () => {
  timer.update();

  const deltaTime = timer.getDelta()
  
  controls.update();
  lanternController.update(deltaTime)

  const lanternPosition = lanternController.lantern.position

  const desiredCameraPosition = lanternPosition.clone().add(cameraOffset)

  camera.position.lerp(
      desiredCameraPosition,
      1 - Math.exp(-cameraFollowSpeed * deltaTime)
  )

  camera.lookAt(lanternPosition)

  renderer.render(scene, camera);
};

renderer.setAnimationLoop(tick);
