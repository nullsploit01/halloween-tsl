import { GLTFLoader } from 'three/addons/Addons.js';
import * as THREE from 'three/webgpu';

const gltfLoader = new GLTFLoader();

export async function addLantern(camera) {
  const gltf = await gltfLoader.loadAsync('./models/lantern.glb');
  const lantern = gltf.scene;

  lantern.scale.setScalar(0.005);

  lantern.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  camera.add(lantern);

  const lanternLight = new THREE.PointLight(0xff9a45, 3.5, 10, 2);

  lanternLight.position.set(10, 10.35, -30);

  lanternLight.castShadow = true;
  lanternLight.shadow.mapSize.set(512, 512);

  lantern.add(lanternLight);

  // Local position: right/left, up/down, forward/back from the camera.
  lantern.position.set(0.45, -0.55, -1.6);

  // Keep your model-specific correction.
  lantern.rotation.set(0, -Math.PI * 0.5, 0);

  return { lantern, lanternLight };
}
