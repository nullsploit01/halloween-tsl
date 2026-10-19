import * as THREE from 'three/webgpu';

export function addLighting({ scene, renderer }) {
    const directionalLight = new THREE.DirectionalLight(0xff9147, 0);
    directionalLight.castShadow = true;
    directionalLight.position.set(2, 1.1, -1.75).normalize().multiplyScalar(10);

    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.bottom = -10;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.near = 0.01;
    directionalLight.shadow.camera.far = 20;
    directionalLight.shadow.radius = 5;
    directionalLight.shadow.normalBias = 0.1;

    const ambientLight = new THREE.AmbientLight(0xb870ff, 10);

    scene.add(directionalLight, ambientLight);

    const lightsGui = renderer.inspector.createParameters('Lights').close();
    lightsGui.addColor(directionalLight, 'color').name('directionalColor');
    lightsGui.add(directionalLight.position, 'y', 0, 10, 0.01).name('directionalY');
    lightsGui.add(directionalLight, 'intensity', 0, 10, 0.01).name('directionalIntensity');
    lightsGui.addColor(ambientLight, 'color').name('ambientColor');
    lightsGui.add(ambientLight, 'intensity', 0, 5, 0.01).name('ambientIntensity');

    return { directionalLight, ambientLight };
}
