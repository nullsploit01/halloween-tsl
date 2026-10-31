import * as THREE from 'three/webgpu';

export function createLightFlicker(
    light,
    panel,
    { baseIntensity, enabled = true, flickerChance = 0.65 } = {},
) {
    let active = enabled;
    let elapsed = 0;

    let nextEvent = Math.random() * 3 + 2;

    let flickerType = 'none';
    let flickerTime = 0;
    let flickerDuration = 0;

    let pulseTimer = 0;
    let pulseState = true;

    const canFlicker = Math.random() < flickerChance;

    const basePanelColor = new THREE.Color(0xe4edf2);
    const darkPanelColor = new THREE.Color(0x252525);

    function applyIntensity(factor) {
        light.intensity = baseIntensity * factor;

        panel.material.color.copy(basePanelColor).multiplyScalar(factor);
    }

    function update(deltaTime) {
        if (!active || !canFlicker) return;

        elapsed += deltaTime;

        if (flickerType === 'none' && elapsed >= nextEvent) {
            const random = Math.random();

            if (random < 0.35) {
                flickerType = 'subtle';
                flickerDuration = 0.3 + Math.random() * 0.5;
            } else if (random < 0.8) {
                flickerType = 'glitch';
                flickerDuration = 0.5 + Math.random() * 1.0;
            } else {
                flickerType = 'blackout';
                flickerDuration = 0.3 + Math.random() * 0.7;
            }

            flickerTime = 0;
            pulseTimer = 0;
            pulseState = true;
        }

        if (flickerType === 'none') return;

        flickerTime += deltaTime;
        pulseTimer += deltaTime;

        const progress = flickerTime / flickerDuration;

        let factor = 1;

        if (flickerType === 'subtle') {
            factor = 0.65 + Math.random() * 0.35;
        }

        if (flickerType === 'glitch') {
            if (pulseTimer >= 0.04 + Math.random() * 0.07) {
                pulseTimer = 0;
                pulseState = !pulseState;
            }

            factor = pulseState ? 1 : 0.02;
        }

        if (flickerType === 'blackout') {
            factor = progress < 0.8 ? 0 : 1;
        }

        applyIntensity(factor);

        if (flickerTime >= flickerDuration) {
            flickerType = 'none';
            elapsed = 0;

            // Another event can happen soon.
            nextEvent = 1.5 + Math.random() * 5;

            applyIntensity(1);
        }
    }

    function setEnabled(value) {
        active = value;
        light.visible = value;
        panel.visible = true;

        if (!value) {
            flickerType = 'none';
            elapsed = 0;

            light.intensity = 0;
            panel.material.color.copy(darkPanelColor);
        } else {
            flickerType = 'none';
            elapsed = 0;
            nextEvent = Math.random() * 2 + 1;

            applyIntensity(1);
        }
    }

    function triggerFlicker(type = 'glitch') {
        if (!active) return;

        flickerType = type;
        flickerTime = 0;

        flickerDuration = type === 'glitch' ? 0.8 + Math.random() * 1.8 : 0.3 + Math.random() * 0.5;
    }

    return {
        update,
        setEnabled,
        canFlicker,
        triggerFlicker,
    };
}

export function createFluorescentLight({
    hallwayHeight,
    intensity = 18,
    distance = 9,
    color = 0xe8d9b5,
    flickerChance = 0.35,
} = {}) {
    const group = new THREE.Group();

    // Visible ceiling fixture.
    const panel = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.045, 0.4),
        new THREE.MeshBasicMaterial({
            color: 0x9e2020,
            toneMapped: false,
        }),
    );

    panel.position.y = hallwayHeight - 0.08;
    group.add(panel);

    // Actual clustered illumination.
    const light = new THREE.PointLight(color, intensity, distance, 2);

    light.position.set(0, hallwayHeight - 0.9, 0);
    light.castShadow = false;

    group.add(light);

    const flicker = createLightFlicker(light, panel, {
        baseIntensity: intensity,
        flickerChance,
    });

    return {
        group,
        light,
        panel,

        update(deltaTime) {
            flicker.update(deltaTime);
        },

        setEnabled(enabled) {
            flicker.setEnabled(enabled);
        },

        triggerFlicker(type = 'glitch') {
            flicker.triggerFlicker(type);
        },
    };
}
