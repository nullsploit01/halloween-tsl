import * as THREE from 'three/webgpu';

export function createCameraHud({ battery = 100, batteryDrainPerSecond = 0.4 } = {}) {
    const element = document.createElement('div');

    element.className = 'camera-hud';
    element.innerHTML = `
        <div class="camera-hud__top">
            <div class="camera-hud__status">
                <span class="camera-hud__rec"><i></i> REC</span>
                <span class="camera-hud__clock">00:00</span>
            </div>
        </div>

        <div class="camera-hud__bottom">
            <span class="camera-hud__battery">BAT 100%</span>
        </div>
    `;

    const signal = document.createElement('div');

    signal.className = 'objective-signal';
    signal.innerHTML = `
        <div class="sense-indicator">
            <span class="objective-signal__arrow">▲</span>
        </div>

        <span class="objective-signal__label">TRACE</span>
        <span class="objective-signal__distance">--m</span>
    `;

    document.body.append(element, signal);

    const clockElement = element.querySelector('.camera-hud__clock');
    const batteryElement = element.querySelector('.camera-hud__battery');

    const signalArrow = signal.querySelector('.objective-signal__arrow');
    const signalDistance = signal.querySelector('.objective-signal__distance');
    const signalLabel = signal.querySelector('.objective-signal__label');

    const targetPosition = new THREE.Vector3();
    const directionToTarget = new THREE.Vector3();
    const cameraForward = new THREE.Vector3();

    let elapsedSeconds = 0;
    let currentBattery = battery;
    let visible = false;

    function updateObjective(camera, junctionBox, isSensing) {
        if (!isSensing || !junctionBox?.hasSpawned) {
            signal.style.display = 'none';
            return;
        }

        junctionBox.group.getWorldPosition(targetPosition);

        directionToTarget.subVectors(targetPosition, camera.position);
        directionToTarget.y = 0;

        const distance = directionToTarget.length();

        if (distance > 100) {
            signal.style.display = 'none';
            return;
        }

        signal.style.display = 'block';

        camera.getWorldDirection(cameraForward);
        cameraForward.y = 0;
        cameraForward.normalize();

        directionToTarget.normalize();

        const angle = Math.atan2(
            cameraForward.x * directionToTarget.z - cameraForward.z * directionToTarget.x,

            cameraForward.x * directionToTarget.x + cameraForward.z * directionToTarget.z,
        );

        const absoluteAngle = Math.abs(angle);

        let relativeDirection = 'AHEAD';

        if (absoluteAngle > Math.PI * 0.75) {
            relativeDirection = 'BEHIND';
        } else if (angle > Math.PI * 0.25) {
            relativeDirection = 'RIGHT';
        } else if (angle < -Math.PI * 0.25) {
            relativeDirection = 'LEFT';
        }

        signalLabel.textContent = `TRACE // ${relativeDirection}`;

        const signalStrength = THREE.MathUtils.clamp(1 - (distance - 5) / (100 - 5), 0.15, 1);

        signalArrow.style.transform = `rotate(${angle}rad) scale(${0.8 + signalStrength * 0.35})`;

        signalDistance.textContent = `${Math.ceil(distance)}m`;

        signal.style.opacity = signalStrength;
        signal.style.setProperty('--signal-strength', signalStrength);
    }

    return {
        updateObjective,

        setVisible(enabled) {
            visible = enabled;
            element.style.display = visible ? 'block' : 'none';
        },

        update(deltaTime) {
            if (!visible) return;

            elapsedSeconds += deltaTime;
            currentBattery = Math.max(0, currentBattery - batteryDrainPerSecond * deltaTime);

            const minutes = Math.floor(elapsedSeconds / 60);
            const seconds = Math.floor(elapsedSeconds % 60);

            clockElement.textContent =
                `${String(minutes).padStart(2, '0')}:` + String(seconds).padStart(2, '0');

            batteryElement.textContent = `BAT ${Math.ceil(currentBattery)}%`;
        },

        setBatteryDrainPerSecond(value) {
            batteryDrainPerSecond = Math.max(0, value);
        },

        get battery() {
            return currentBattery;
        },
    };
}
