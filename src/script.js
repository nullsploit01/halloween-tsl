import { createCamera } from './core/createCamera.js';
import { createPostProcessing } from './core/createPostProcessing.js';
import { createRenderer } from './core/createRenderer.js';
import { createScene } from './core/createScene.js';
import { addLighting } from './core/lighting.js';
import { Sizes } from './core/Sizes.js';
import { createCameraHud } from './ui/createCameraHud.js';
import { createControlsHud } from './ui/createControlsHud.js';
import { GameOverScreen } from './ui/GameOverScreen.js';
import { LoadingScreen } from './ui/LoadingScreen.js';
import { soundManager } from './world/addSounds.js';
import { addWorld } from './world/addWorld.js';
import { ElevatorDoor } from './world/ElevatorDoor.js';
import { JunctionBox } from './world/JunctionBox.js';
import { Stalker } from './world/Stalker.js';
import { Howler } from 'howler';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { ClusteredLighting } from 'three/examples/jsm/lighting/ClusteredLighting.js';
import * as THREE from 'three/webgpu';

const NIGHT_VISION_BATTERY_MAX = 100;
const NIGHT_VISION_DRAIN_RATE = 3; // Battery percentage per second


const gameOverScreen = new GameOverScreen();
let hasGameEnded = false;

const canvas = document.querySelector('canvas.threejs');

const sizes = new Sizes();
const scene = createScene();
const camera = createCamera(sizes);
const cameraHud = createCameraHud({battery: NIGHT_VISION_BATTERY_MAX, batteryDrainPerSecond: NIGHT_VISION_DRAIN_RATE});
const controlsHud = createControlsHud(soundManager);

// Player height, rather than the former scene-preview camera position.
camera.position.set(0, 1.7, 0);

const renderer = await createRenderer(canvas, sizes);

const loadingScreen = new LoadingScreen(renderer);
loadingScreen.start();

renderer.lighting = new ClusteredLighting(256, 32, 24, 32);
loadingScreen.setProgress(5, 'INITIALIZING GRAPHICS...');

const controls = new PointerLockControls(camera, document.body);

const postProcessing = createPostProcessing({
    renderer,
    scene,
    camera,
});

const { ambientLight } = addLighting({ scene, renderer });

const { lantern, hotel, lanternLight, ghost, setLanternVisible, nightVisionCamera } =
    await addWorld(scene, camera, (progress, message) => {
        loadingScreen.setProgress(progress, message);
    });

let activatedBoxCount = 0;
const elevatorDoor = new ElevatorDoor(scene);
scene.add(camera);

const stalker = new Stalker(scene, {
    agroDistance: 10,
    chaseSpeed: 3,
});

await stalker.load();

loadingScreen.setProgress(90, 'SOMETHING IS MOVING...');

loadingScreen.ready();

let hasGameStarted = false;
let senseTarget = null;
let senseTargetName = null;
let junctionSpawnTimeout = null;

loadingScreen.onEnter(async () => {
    await Howler.ctx?.resume();

    soundManager.playSound('woosh');

    senseTarget = elevatorDoor;
    senseTargetName = 'ELEVATOR DOOR';

    cameraHud.setObjective('FIND THE ELEVATOR');

    setTimeout(() => {
        loadingScreen.hide();
    }, 400);

    setTimeout(() => {
        soundManager.playSound('ventilation');
        soundManager.playSound('lightBuzz');
    }, 700);

    hasGameStarted = true;
    controlsHud.setVisible(true);
    controls.lock();
});

window.addEventListener('click', () => {
    if (!hasGameStarted || hasGameEnded) return;
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

let nightVisionBattery = NIGHT_VISION_BATTERY_MAX;

const normalAmbientIntensity = ambientLight.intensity;
let ambientStartTimeout;
let ambientResetTimeout;
let senseModeActive = false;
let powerOutageTriggered = false;

let nightVisionTransitioning = false;

async function setNightVision(enabled) {
    if (nightVisionTransitioning) return;
    if (nightVisionEnabled === enabled) return;

    nightVisionTransitioning = true;
    setLanternVisible(false);
    if (enabled) {
        // Raise the camera into view.
        const completed = await nightVisionCamera.show({
            duration: 650,
        });

        if (!completed) {
            nightVisionTransitioning = false;
            return;
        }

        // Activate night vision after the camera is raised.
        postProcessing.setNightVision(true);
        nightVisionLight.visible = true;
        cameraHud.setVisible(true);

        nightVisionEnabled = true;
    } else {
        postProcessing.setNightVision(false);
        nightVisionLight.visible = false;
        cameraHud.setVisible(false);

        await nightVisionCamera.hide({
            duration: 1050,
        });

        nightVisionEnabled = false;
    }

    nightVisionTransitioning = false;
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
    senseTarget = box;
    senseTargetName = 'JUNCTION BOX';

    cameraHud.setObjective('ACTIVATE JUNCTION BOXES ' + junctionBoxes.length + '/' + maxJunctionBoxes);

    return true;
}

const systemMessage = document.createElement('div');
systemMessage.className = 'system-message';
document.body.append(systemMessage);

let systemMessageTimeout;

function showSystemMessage(message, type = 'info', duration = 2500) {
    const validTypes = ['success', 'info', 'warning', 'error'];

    if (!validTypes.includes(type)) {
        type = 'info';
    }

    systemMessage.textContent = message;

    systemMessage.classList.remove('is-visible', 'success', 'info', 'warning', 'error');

    // Apply new type
    systemMessage.classList.add(type);

    // Restart visibility animation
    requestAnimationFrame(() => {
        systemMessage.classList.add('is-visible');
    });

    clearTimeout(systemMessageTimeout);

    systemMessageTimeout = setTimeout(() => {
        systemMessage.classList.remove('is-visible');
    }, duration);
}

function triggerPowerOutage() {
    if (powerOutageTriggered) return;

    powerOutageTriggered = true;

    hotel.setCorridorLights(false);

    stopSobelEvent();
    setNightVision(false);

    stalker.spawn(hotel, camera.position);

    setTimeout(() => {
        soundManager.stopSound('ventilation');
        soundManager.stopSound('lightBuzz');
    }, 100);

    setTimeout(() => {
        soundManager.playSound('creepy');
    }, 300);

    showSystemMessage('POWER FAILURE — A STALKER IS LOOKING FOR YOU', 'error');
}

const interactionHint = document.createElement('div');
interactionHint.className = 'interaction-hint';
document.body.append(interactionHint);

function updateInteractionHint() {
    let text = '';

    if (activeJunctionBox?.isPlayerNearby(camera.position)) {
        if (activeJunctionBox.state === 'off') {
            text = 'PRESS [E] — RESTORE POWER';
        }

        if (activeJunctionBox.state === 'activating') {
            const percent = Math.round(activeJunctionBox.activationProgress * 100);

            text = `RESTORING POWER ${percent}%`;
        }
    } else if (elevatorDoor.isPlayerNearby(camera.position)) {
        text = 'PRESS [E] — CALL ELEVATOR';
    }

    interactionHint.textContent = text;
    interactionHint.classList.toggle('is-visible', text !== '');
}

let stopPlayerMovements = false;

function handleInteraction() {
    soundManager.playSound('junction-press');
    const startedBox = activeJunctionBox?.beginActivation(camera.position);
    if (startedBox) {
        return;
    }

    const elevatorMessage = elevatorDoor.call(camera.position);

    if (!elevatorMessage) return;

    // The first failed elevator call begins the game objective.
    if (!elevatorDoor.isPowered && junctionBoxes.length === 0) {
        setTimeout(() => {
            triggerPowerOutage();
        }, 2000);

        const spawned = spawnNextJunctionBox();
        return;
    }

    if (elevatorMessage === 'ELEVATOR CALLED') {
        soundManager.stopSound('stalkerWhispersLoud');

        setTimeout(() => {
            soundManager.playSound('look-behind-you-loud');
        }, 200);

        setTimeout(() => {
            showSystemMessage('LOOK BEHIND YOU', 'error');
            ghost.trigger(
                camera.position,
                elevatorDoor.group.getWorldPosition(new THREE.Vector3()),
            );
        }, 1000);

        soundManager.playSound('heavyFootsteps');
        stopPlayerMovements = true;
    }

    showSystemMessage(elevatorMessage, 'info');
}

function respawnPlayer() {
    // Cancel any pending junction-box spawn.
    clearTimeout(junctionSpawnTimeout);
    junctionSpawnTimeout = null;

    // Reset player position and orientation.
    camera.position.copy(hotel.getPlayerStartPosition());
    camera.rotation.set(0, 0, 0);

    // Reset stalker.
    stalker.despawn();

    // Reset gameplay effects.
    stopSobelEvent();
    postProcessing.setNightVision(false);
    postProcessing.setChromaticAberration(false);

    // Restore lighting.
    hotel.setCorridorLights(true);
    setLanternVisible(false);
    setNightVision(false);

    ghost.reset();
    nightVisionBattery = NIGHT_VISION_BATTERY_MAX;

    // Remove all spawned junction boxes.
    junctionBoxes.forEach((box) => {
        box.resetSpawn();
    });

    junctionBoxes.length = 0;
    activeJunctionBox = null;

    // Reset objective and progression.
    activatedBoxCount = 0;
    powerOutageTriggered = false;

    senseTarget = elevatorDoor;
    senseTargetName = 'ELEVATOR DOOR';

    cameraHud.setObjective('FIND THE ELEVATOR');

    // Reset audio.
    soundManager.stopSound('creepy');

    soundManager.playSound('ventilation');
    soundManager.playSound('lightBuzz');

    showSystemMessage('SESSION RESTARTED — GOOD LUCK', 'success');
}

let stalkerWhispersId = null;
let stalkerWhisperId = null;
let stalkerRunningId = null;

let previousStalkerState = null;

const stalkerAudioPosition = new THREE.Vector3();

function updateStalkerAudio() {
    if (!stalker.model || !stalker.hasSpawned) return;

    stalker.model.getWorldPosition(stalkerAudioPosition);

    // Replace isChasing with your actual chase/spotting condition.
    const isChasing = stalker.isChasing;

    const currentState = isChasing ? 'chasing' : 'idle';

    if (currentState !== previousStalkerState) {
        // Stop previous state sounds
        if (stalkerWhispersId !== null) {
            soundManager.stopSound('stalkerWhispers', stalkerWhispersId);
            stalkerWhispersId = null;
        }

        if (stalkerWhisperId !== null) {
            soundManager.stopSound('stalkerWhisper', stalkerWhisperId);
            stalkerWhisperId = null;
        }

        if (stalkerRunningId !== null) {
            soundManager.stopSound('stalkerRunning', stalkerRunningId);
            stalkerRunningId = null;
        }

        if (isChasing) {
            // She spotted the player
            stalkerWhisperId = soundManager.playSound('stalkerWhisper', {
                positional: true,
                position: stalkerAudioPosition,
            });

            stalkerRunningId = soundManager.playSound('stalkerRunning', {
                positional: true,
                position: stalkerAudioPosition,
                loop: true,
            });
        } else {
            // She is stalking the player
            stalkerWhispersId = soundManager.playSound('stalkerWhispers', {
                positional: true,
                position: stalkerAudioPosition,
                loop: true,
            });
        }

        previousStalkerState = currentState;
    }

    // Keep active sounds attached to the moving Stalker
    if (stalkerWhispersId !== null) {
        soundManager.sounds
            .get('stalkerWhispers')
            .howl.pos(...stalkerAudioPosition.toArray(), stalkerWhispersId);
    }

    if (stalkerWhisperId !== null) {
        soundManager.sounds
            .get('stalkerWhisper')
            .howl.pos(...stalkerAudioPosition.toArray(), stalkerWhisperId);
    }

    if (stalkerRunningId !== null) {
        soundManager.sounds
            .get('stalkerRunning')
            .howl.pos(...stalkerAudioPosition.toArray(), stalkerRunningId);
    }
}

function processGameOver() {
    if (!hasGameStarted) return;

    hasGameEnded = true;

    controls.unlock();
    keys.clear();

    controlsHud.setVisible(false);

    soundManager.stopAll();

    gameOverScreen.show();
}

window.addEventListener('keydown', (event) => {
    if (event.repeat || !hasGameStarted) return;

    if (event.code === 'KeyN') {
    if (nightVisionTransitioning) return;

    const nextNightVisionState = !nightVisionEnabled;

    if (nextNightVisionState) {
        if (nightVisionBattery <= 0) {
            showSystemMessage(
                'BATTERY DEPLETED — NIGHT VISION UNAVAILABLE',
                'warning'
            );
            return;
        }

        stopSobelEvent();
    }

    setNightVision(nextNightVisionState);
}

    if (event.code === 'KeyF') {
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

    if (event.code === 'KeyE') {
        hotel.triggerCorridorLightGlitch();
        handleInteraction();
    }

    if (event.code === 'KeyL') {
        setLanternVisible(!lantern.visible);
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

let currentFootstepSound = null;
let currentFootstepId = null;

function tick() {
    timer.update();

    const deltaTime = timer.getDelta();

    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const movement = new THREE.Vector3();

    if (controls.isLocked && !stopPlayerMovements) {
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
            const isAltHeld = keys.has('AltLeft') || keys.has('AltRight');

            let currentMoveSpeed = walkSpeed;
            let footstepSound = 'walking';

            // Alt + Shift = Sneaking
            if (isAltHeld && isShiftHeld) {
                currentMoveSpeed = sneakSpeed;
                footstepSound = 'slow-walking';
            }
            // Shift = Running
            else if (isShiftHeld) {
                currentMoveSpeed = sprintSpeed;
                footstepSound = 'running';
            }

            movement.normalize().multiplyScalar(currentMoveSpeed * deltaTime);

            hotel.movePlayer(camera.position, movement, 1.25);

            if (currentFootstepSound !== footstepSound) {
                if (currentFootstepSound && currentFootstepId !== null) {
                    soundManager.stopSound(currentFootstepSound, currentFootstepId);
                }

                currentFootstepSound = footstepSound;

                currentFootstepId = soundManager.playSound(footstepSound, { loop: true });
            }
        } else {
            if (currentFootstepSound && currentFootstepId !== null) {
                soundManager.stopSound(currentFootstepSound, currentFootstepId);
            }

            currentFootstepSound = null;
            currentFootstepId = null;
        }
    }

    if (nightVisionEnabled) {
    nightVisionBattery = Math.max(
        0,
        nightVisionBattery - NIGHT_VISION_DRAIN_RATE * deltaTime
    );

    if (nightVisionBattery <= 0) {
        setNightVision(false);

        showSystemMessage(
            'BATTERY DEPLETED — NIGHT VISION DISABLED',
            'warning',
            3500
        );
    }
}

    cameraHud.update(deltaTime);

    hotel.update(camera.position);
    hotel.triggerRandomLightFlickering(deltaTime);
    hotel.updateWallWritings(timer.getElapsed());

    if (!elevatorDoor.hasSpawned) {
        elevatorDoor.spawn(hotel, camera.position, 100);
    }

    cameraHud.updateObjective(camera, senseTarget, senseModeActive, senseTargetName);

    const wasActivated = activeJunctionBox?.update(camera.position, deltaTime);

    if (wasActivated) {
        soundManager.playSound('junction-on');

        activatedBoxCount += 1;

        setTimeout(() => {
            if (activatedBoxCount === 1) {
                soundManager.playSound('stalkerWhisper2');
            }

            if (activatedBoxCount === 2) {
                soundManager.playSound('i-see-you-whisper');
            }

            if (activatedBoxCount === 3) {
                soundManager.playSound('stalkerWhispersLoud');
            }

            stalker.spawn(hotel, camera.position);
        }, 400);

        junctionSpawnTimeout = setTimeout(() => {
            junctionSpawnTimeout = null;

            if (activatedBoxCount < maxJunctionBoxes) {
                spawnNextJunctionBox();
                return;
            }

            elevatorDoor.setPowered(true);
            senseTarget = elevatorDoor;
            senseTargetName = 'ELEVATOR DOOR';

            cameraHud.setObjective('FIND THE ELEVATOR');
            activeJunctionBox = null;

            showSystemMessage('LIFT ACTIVATED — RETURN TO THE ELEVATOR', 'success');
        }, 900);
    }

    updateInteractionHint();

    const playerWasCaught = stalker.update(camera.position, deltaTime, hotel);
    updateStalkerAudio();

    if (playerWasCaught) {
        respawnPlayer();
    }

    const ghostCaught = ghost.update(camera.position, deltaTime);

    if (ghostCaught && !hasGameEnded) {
        processGameOver();
        return;
    }

    soundManager.update(deltaTime, camera);
    postProcessing.update(deltaTime);
    postProcessing.renderPipeline.render();
}

renderer.setAnimationLoop(tick);
