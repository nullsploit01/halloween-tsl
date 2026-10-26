import { createCamera } from './core/createCamera.js';
import { createPostProcessing } from './core/createPostProcessing.js';
import { createRenderer } from './core/createRenderer.js';
import { createScene } from './core/createScene.js';
import { addLighting } from './core/lighting.js';
import { Sizes } from './core/Sizes.js';
import { createCameraHud } from './ui/createCameraHud.js';
import { createJunctionBoxHud } from './ui/createJunctionBoxHud.js';
import { addWorld } from './world/addWorld.js';
import { JunctionBox } from './world/JunctionBox.js';
import { Stalker } from './world/Stalker.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import * as THREE from 'three/webgpu';

const canvas = document.querySelector('canvas.threejs');

const sizes = new Sizes();
const scene = createScene();
const camera = createCamera(sizes);
const cameraHud = createCameraHud();

scene.add(camera);

// Player height, rather than the former scene-preview camera position.
camera.position.set(0, 1.7, 0);

const renderer = await createRenderer(canvas, sizes);
const controls = new PointerLockControls(camera, document.body);

const postProcessing = createPostProcessing({
    renderer,
    scene,
    camera,
});

const { ambientLight } = addLighting({ scene, renderer });

const { lantern, hotel, lanternLight } = await addWorld(scene, camera);

const stalker = new Stalker(scene, {
    agroDistance: 10,
    chaseSpeed: 3,
});

await stalker.load();

canvas.addEventListener('click', () => {
    controls.lock();
});

sizes.onResize(() => {
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();

    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(sizes.pixelRatio);
});

const nightVisionLight = new THREE.SpotLight(0xb8ffb5, 45, 20, Math.PI * 0.25, 0.5, 2);

nightVisionLight.visible = false;

camera.add(nightVisionLight);

nightVisionLight.target.position.set(0, 0, -10);
camera.add(nightVisionLight.target);

let nightVisionEnabled = false;

const normalAmbientIntensity = ambientLight.intensity;
let ambientStartTimeout;
let ambientResetTimeout;
let senseModeActive = false;

function setNightVision(enabled) {
    nightVisionEnabled = enabled;

    postProcessing.setNightVision(enabled);
    nightVisionLight.visible = enabled;

    lantern.visible = !enabled;
    lanternLight.visible = !enabled;
    cameraHud.setVisible(enabled);
}

function stopSobelEvent() {
    clearTimeout(ambientStartTimeout);
    clearTimeout(ambientResetTimeout);

    senseModeActive = false;
    ambientLight.intensity = normalAmbientIntensity;
    postProcessing.setSobel(false);
}

let senseBlurTimeout;

function triggerSenseBlur() {
    canvas.classList.remove('sense-blur');

    // Forces CSS to restart the animation if G is pressed again.
    void canvas.offsetWidth;

    canvas.classList.add('sense-blur');

    clearTimeout(senseBlurTimeout);

    senseBlurTimeout = setTimeout(() => {
        canvas.classList.remove('sense-blur');
    }, 4000);
}

const junctionBoxHud = createJunctionBoxHud();

const junctionBoxes = [];
const maxJunctionBoxes = 3;
let activeJunctionBox = null;

function spawnNextJunctionBox() {
    if (junctionBoxes.length >= maxJunctionBoxes) return false;

    const box = new JunctionBox();

    const spawned = box.spawn(hotel, camera.position, 100);

    if (!spawned) return false;

    junctionBoxes.push(box);
    activeJunctionBox = box;

    return true;
}

window.addEventListener('keydown', (event) => {
    if (event.repeat) return;

    if (event.code === 'KeyF') {
        const nextNightVisionState = !nightVisionEnabled;

        // Enabling night vision cancels the Sobel event.
        if (nextNightVisionState) {
            stopSobelEvent();
        }

        setNightVision(nextNightVisionState);
    }

    if (event.code === 'KeyG') {
        // Sobel event always exits night vision first.
        setNightVision(false);

        postProcessing.triggerSobel(4);
        triggerSenseBlur();

        clearTimeout(ambientStartTimeout);
        clearTimeout(ambientResetTimeout);

        senseModeActive = true;

        ambientStartTimeout = setTimeout(() => {
            ambientLight.intensity = 8;
        }, 400);

        ambientResetTimeout = setTimeout(() => {
            ambientLight.intensity = normalAmbientIntensity;
            senseModeActive = false;
        }, 4000);
    }

    if (event.code === 'KeyK') {
        stalker.despawn();
    }

    if (event.code === 'KeyJ') {
        spawnNextJunctionBox();
    }

    if (event.code === 'KeyE') {
        activeJunctionBox?.beginActivation(camera.position);
    }
});

const keys = new Set();
const timer = new THREE.Timer();

window.addEventListener('keydown', (event) => keys.add(event.code));
window.addEventListener('keyup', (event) => keys.delete(event.code));
window.addEventListener('blur', () => keys.clear());

const walkSpeed = 4;
const sprintSpeed = 7;
const sneakSpeed = 1.5;

function tick() {
    timer.update();

    const deltaTime = timer.getDelta();

    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const movement = new THREE.Vector3();

    if (controls.isLocked) {
        movement.set(0, 0, 0);

        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();

        right.crossVectors(forward, camera.up).normalize();

        if (keys.has('KeyW')) movement.add(forward);
        if (keys.has('KeyS')) movement.sub(forward);
        if (keys.has('KeyD')) movement.add(right);
        if (keys.has('KeyA')) movement.sub(right);

        if (movement.lengthSq() > 0) {
            const isShiftHeld = keys.has('ShiftLeft') || keys.has('ShiftRight');

            const isCtrlHeld = keys.has('AltLeft') || keys.has('AltRight');

            // Ctrl + Shift takes priority over sprint.
            let currentMoveSpeed = walkSpeed;

            if (isShiftHeld && isCtrlHeld) {
                currentMoveSpeed = sneakSpeed;
            } else if (isShiftHeld) {
                currentMoveSpeed = sprintSpeed;
            }

            movement.normalize().multiplyScalar(currentMoveSpeed * deltaTime);

            hotel.movePlayer(camera.position, movement, 1.25);
        }
    }

    cameraHud.update(deltaTime);
    hotel.update(camera.position);
    cameraHud.updateObjective(camera, activeJunctionBox, senseModeActive);

    const wasActivated = activeJunctionBox?.update(camera.position, deltaTime);

    junctionBoxHud.update(camera, activeJunctionBox);

    if (wasActivated) {
        setTimeout(() => {
            spawnNextJunctionBox();
        }, 900);
    }

    stalker.trySpawn(hotel, camera.position);
    stalker.update(camera.position, deltaTime, hotel);

    postProcessing.update(deltaTime);
    postProcessing.renderPipeline.render();
}

renderer.setAnimationLoop(tick);
