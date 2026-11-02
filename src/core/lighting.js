import * as THREE from 'three/webgpu';

export function addLighting({ scene, renderer }) {
    // Cold, faint exterior/moonlight filling the hospital.
    const directionalLight = new THREE.DirectionalLight(0x9fb4c2, 0);

    directionalLight.position.set(-4, 8, -6);

    directionalLight.castShadow = false;

    const ambientLight = new THREE.AmbientLight(0x56616b, 0.22);

    scene.add(directionalLight, ambientLight);
    return { directionalLight, ambientLight };
}
