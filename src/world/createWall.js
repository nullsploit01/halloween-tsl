import * as THREE from 'three/webgpu';

export function createWall({ length, height = 3, thickness = 0.2 }) {
  const geometry = new THREE.BoxGeometry(thickness, height, length);
  const material = new THREE.MeshStandardNodeMaterial({
    color: 0x30272a,
    roughness: 0.9,
  });

  const wall = new THREE.Mesh(geometry, material);
  wall.castShadow = true;
  wall.receiveShadow = true;

  return wall;
}
