import * as THREE from 'three/webgpu';

export function createJunctionBoxHud() {
    const element = document.createElement('div');

    element.className = 'junction-box-hud';
    element.innerHTML = `
        <div class="junction-box-hud__spinner"></div>
        <div class="junction-box-hud__text"></div>
        <div class="junction-box-hud__progress">
            <i></i>
        </div>
    `;

    document.body.append(element);

    const text = element.querySelector('.junction-box-hud__text');
    const progress = element.querySelector('.junction-box-hud__progress i');
    const worldPosition = new THREE.Vector3();
    const cameraDirection = new THREE.Vector3();

    return {
        update(camera, box) {
            if (!box || box.state === 'on' || !box.isPlayerNearby(camera.position)) {
                element.style.display = 'none';
                return;
            }

            box.group.getWorldPosition(worldPosition);
            worldPosition.y += 1.25;

            camera.getWorldDirection(cameraDirection);

            if (cameraDirection.dot(worldPosition.sub(camera.position)) <= 0) {
                element.style.display = 'none';
                return;
            }

            worldPosition.add(camera.position).project(camera);

            element.style.display = 'block';
            element.style.left = `${(worldPosition.x * 0.5 + 0.5) * innerWidth}px`;
            element.style.top = `${(-worldPosition.y * 0.5 + 0.5) * innerHeight}px`;

            if (box.state === 'off') {
                text.textContent = 'PRESS [E] — RESTORE POWER';
                progress.style.width = '0%';
                return;
            }

            const percent = Math.round(box.activationProgress * 100);

            text.textContent = `RESTORING POWER ${percent}%`;
            progress.style.width = `${percent}%`;
        },
    };
}
