import { Inspector } from 'three/addons/inspector/Inspector.js';
import * as THREE from 'three/webgpu';

export async function createRenderer(canvas, sizes) {
    const renderer = new THREE.WebGPURenderer({
        canvas,
        antialias: true,
    });

    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(sizes.pixelRatio);
    renderer.setClearColor(0x000000);

    renderer.inspector = new Inspector();
    await renderer.init();

    return renderer;
}
