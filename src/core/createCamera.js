import * as THREE from 'three/webgpu';

export function createCamera(sizes) {
    const camera = new THREE.PerspectiveCamera(70, sizes.width / sizes.height, 0.1, 100);

    camera.position.set(0, 1.7, 0);
    return camera;
}
