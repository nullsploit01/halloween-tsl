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
    lanternLight.castShadow = false;
    lanternLight.shadow.mapSize.set(512, 512);

    lantern.add(lanternLight);

    const restingPosition = new THREE.Vector3(0.32, -0.55, -0.95);

    const hiddenPosition = restingPosition.clone();
    hiddenPosition.y -= 0.8;

    lantern.rotation.set(0, -Math.PI * 0.5, 0);
    lantern.position.copy(hiddenPosition);
    lantern.visible = false;

    let animationFrame = null;
    let animationToken = 0;

    function cancelAnimation() {
        animationToken++;

        if (animationFrame !== null) {
            cancelAnimationFrame(animationFrame);
            animationFrame = null;
        }
    }

    function show({ duration = 650, animate = true } = {}) {
        cancelAnimation();

        const token = animationToken;

        lantern.visible = true;
        lanternLight.visible = true;

        if (!animate) {
            lantern.position.copy(restingPosition);
            return;
        }

        lantern.position.copy(hiddenPosition);

        const startTime = performance.now();

        function tick(now) {
            if (token !== animationToken) return;

            const t = THREE.MathUtils.clamp((now - startTime) / duration, 0, 1);

            const eased = 1 - Math.pow(1 - t, 3);

            lantern.position.lerpVectors(hiddenPosition, restingPosition, eased);

            const settle = Math.sin(t * Math.PI) * 0.025;
            lantern.position.y += settle;

            if (t < 1) {
                animationFrame = requestAnimationFrame(tick);
            } else {
                lantern.position.copy(restingPosition);
                animationFrame = null;
            }
        }

        animationFrame = requestAnimationFrame(tick);
    }

    function hide() {
        cancelAnimation();

        lantern.visible = false;
        lanternLight.visible = false;
        lantern.position.copy(hiddenPosition);
    }

    return {
        lantern,
        lanternLight,

        show,
        hide,

        setVisible(visible, options = {}) {
            if (visible) {
                show(options);
            } else {
                hide();
            }
        },
    };
}
