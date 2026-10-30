import * as THREE from 'three/webgpu';

export function createFluorescentLight({ hallwayHeight, intensity = 18, distance = 9, color = 0xe8d9b5} = {}) {
    const group = new THREE.Group();

    // Visible ceiling fixture.
    const panel = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.045, 0.4),
        new THREE.MeshBasicMaterial({
            color: 0xe4edf2,
            toneMapped: false,
        }),
    );

    panel.position.y = hallwayHeight - 0.08;
    group.add(panel);

    // Actual illumination, handled by clustered lighting.
    const light = new THREE.PointLight(color, intensity, distance, 2);

    light.position.set(0, hallwayHeight - 0.9, 0);
    light.castShadow = false;

    group.add(light);

    return {
        group,
        light,
        panel,
        setEnabled(enabled) {
            light.visible = enabled;
            panel.material.color.set(enabled ? 0xe4edf2 : 0x252525);
        },
    };
}
