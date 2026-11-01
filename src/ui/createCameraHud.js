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
        <div class="trace">
            <div class="trace-compass">
                <span class="trace-arrow">▲</span>
            </div>

            <div class="trace-info">
                <span class="trace-target">ELEVATOR DOOR</span>
                <span class="trace-direction">AHEAD</span>
            </div>

            <div class="trace-distance">
                <span class="trace-distance__value">31</span>
                <span class="trace-distance__unit">M</span>
            </div>
        </div>
    `;

    document.body.append(element, signal);

    const clockElement = element.querySelector('.camera-hud__clock');
    const batteryElement = element.querySelector('.camera-hud__battery');

    const signalArrow = signal.querySelector('.trace-arrow');
    const signalDistance = signal.querySelector('.trace-distance__value');
    const signalLabel = signal.querySelector('.trace-target');
    const signalDirection = signal.querySelector('.trace-direction');

    const targetPosition = new THREE.Vector3();
    const directionToTarget = new THREE.Vector3();
    const cameraForward = new THREE.Vector3();

    let elapsedSeconds = 0;
    let currentBattery = battery;
    let visible = false;

    function updateObjective(camera, target, isSensing, targetName = 'UNKNOWN') {
        if (!isSensing || !target) {
            signal.style.display = 'none';
            return;
        }

        // Supports a THREE.Group directly, or objects containing group/model.
        const targetObject = target.isObject3D ? target : (target.group ?? target.model);

        if (!targetObject || targetObject.visible === false) {
            signal.style.display = 'none';
            return;
        }

        targetObject.getWorldPosition(targetPosition);

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

        signalLabel.textContent = targetName.toUpperCase();
        signalDirection.textContent = relativeDirection;
        signalDistance.textContent = Math.ceil(distance);

        const signalStrength = THREE.MathUtils.clamp(1 - (distance - 5) / (100 - 5), 0.15, 1);

        signalArrow.style.transform = `rotate(${angle}rad)`;

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
