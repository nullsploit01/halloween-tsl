import * as THREE from 'three/webgpu';

export function addGround(scene) {
  const geometry = new THREE.PlaneGeometry(10, 10);
  const material = new THREE.MeshStandardNodeMaterial({ transparent: true });

  const ground = new THREE.Mesh(geometry, material);
  ground.rotation.x = -Math.PI * 0.5;
  ground.receiveShadow = true;

  scene.add(ground);
  return ground;
}
