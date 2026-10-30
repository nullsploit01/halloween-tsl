
import { GLTFLoader } from 'three/addons/Addons.js';
import * as THREE from 'three/webgpu';

const gltfLoader = new GLTFLoader();

export async function addNightVisionCamera(camera) {
    const gltf = await gltfLoader.loadAsync('./models/camera.glb');

    const device = gltf.scene;

    device.scale.setScalar(0.1);

    device.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    camera.add(device);

    // Adjust these after checking your camera model.
    const restingPosition = new THREE.Vector3(
        0.32,
        -0.08,
        -0.85
    );

    const hiddenPosition = restingPosition.clone();
    hiddenPosition.y -= 0.85;

    device.rotation.set(0, -Math.PI * 0.5, 0);
    device.position.copy(hiddenPosition);
    device.visible = false;

    let animationFrame = null;
    let animationToken = 0;

    function cancelAnimation() {
        animationToken++;

        if (animationFrame !== null) {
            cancelAnimationFrame(animationFrame);
            animationFrame = null;
        }
    }

    function animatePosition(from, to, duration = 550) {
        cancelAnimation();

        const token = animationToken;
        const startTime = performance.now();

        return new Promise((resolve) => {
            function tick(now) {
                if (token !== animationToken) {
                    resolve(false);
                    return;
                }

                const t = THREE.MathUtils.clamp(
                    (now - startTime) / duration,
                    0,
                    1
                );

                // Smooth ease-out.
                const eased = 1 - Math.pow(1 - t, 3);

                device.position.lerpVectors(from, to, eased);

                // Small settling motion.
                device.position.y +=
                    Math.sin(t * Math.PI) * 0.025;

                if (t < 1) {
                    animationFrame = requestAnimationFrame(tick);
                } else {
                    device.position.copy(to);
                    animationFrame = null;
                    resolve(true);
                }
            }

            animationFrame = requestAnimationFrame(tick);
        });
    }

    async function show({ duration = 650 } = {}) {
        cancelAnimation();

        device.visible = true;
        device.position.copy(hiddenPosition);

        return animatePosition(
            hiddenPosition,
            restingPosition,
            duration
        ).finally(() => {
            device.visible = false;
        });
    }

    async function hide({ duration = 450 } = {}) {
        cancelAnimation();

        device.visible = true;

        const completed = await animatePosition(
            device.position.clone(),
            hiddenPosition,
            duration
        );

        if (completed) {
            device.visible = false;
        }

        return completed;
    }

    return {
        device,
        show,
        hide,

        setVisible(visible, options = {}) {
            return visible ? show(options) : hide(options);
        },
    };
}
