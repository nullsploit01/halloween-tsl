import * as THREE from 'three/webgpu';

export function createCamera(sizes) {
  const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100);

  camera.position.set(9, 7.5, 7);
  return camera;
}
