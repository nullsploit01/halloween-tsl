import * as THREE from 'three/webgpu';

export class JunctionBox {
    constructor() {
        this.group = new THREE.Group();
        this.hasSpawned = false;
        this.node = null;

        const body = new THREE.Mesh(
            new THREE.BoxGeometry(0.6, 0.8, 0.12),
            new THREE.MeshStandardNodeMaterial({
                color: 0x4a1717,
                roughness: 0.75,
                metalness: 0.35,
            }),
        );

        const warningLight = new THREE.Mesh(
            new THREE.SphereGeometry(0.055, 16, 16),
            new THREE.MeshBasicMaterial({
                color: 0xff2a1a,
            }),
        );

        warningLight.position.set(0, 0.22, 0.07);

        this.group.add(body, warningLight);

        const beacon = new THREE.PointLight(0xff1a1a, 4, 10, 2);

        beacon.position.set(0, 0.1, 0.3);

        this.group.add(beacon);

        this.state = 'off'; // off | activating | on
        this.activationTime = 0;
        this.activationDuration = 4;
        this.interactionDistance = 3.0;

        this.warningLight = warningLight;
        this.beacon = beacon;
        this.worldPosition = new THREE.Vector3();
    }

    spawn(hotel, playerPosition, maxDistance = 100) {
        if (this.hasSpawned) return false;

        const minimumDistance = 10;
        const candidates = [];

        for (const node of hotel.nodes.values()) {
            const distance = node.position.distanceTo(playerPosition);

            if (!node.activated || distance < minimumDistance || distance > maxDistance) {
                continue;
            }

            for (const [direction, wall] of node.walls) {
                // Ignore walls already removed for a corridor.
                if (wall.parent !== node.group) continue;

                // Do not place a box on an elevator-reserved wall.
                if (node.reservedWalls?.has(direction)) continue;

                candidates.push({ node, direction });
            }
        }

        if (candidates.length === 0) {
            console.warn('No valid junction-box wall exists within range yet.');
            return false;
        }

        const { node, direction } = candidates[Math.floor(Math.random() * candidates.length)];

        // Prevent procedural generation from ever opening this wall.
        hotel.reserveWall(node, direction);

        const offset = hotel.hallwayWidth * 0.5 - 0.08;

        const placement = {
            north: { x: 0, z: -offset, rotationY: 0 },
            south: { x: 0, z: offset, rotationY: Math.PI },
            east: { x: offset, z: 0, rotationY: -Math.PI * 0.5 },
            west: { x: -offset, z: 0, rotationY: Math.PI * 0.5 },
        }[direction];

        this.group.position.set(placement.x, 1.25, placement.z);
        this.group.rotation.y = placement.rotationY;

        node.group.add(this.group);

        this.node = node;
        this.hasSpawned = true;

        return true;
    }

    isPlayerNearby(playerPosition) {
        this.group.getWorldPosition(this.worldPosition);

        return this.worldPosition.distanceTo(playerPosition) <= this.interactionDistance;
    }

    beginActivation(playerPosition) {
        if (!this.hasSpawned || this.state !== 'off' || !this.isPlayerNearby(playerPosition)) {
            return false;
        }

        this.state = 'activating';
        this.activationTime = 0;

        return true;
    }

    update(playerPosition, deltaTime) {
        if (this.state !== 'activating') return false;

        // Leaving the box cancels the restoration.
        if (!this.isPlayerNearby(playerPosition)) {
            this.state = 'off';
            this.activationTime = 0;
            return false;
        }

        this.activationTime += deltaTime;

        const progress = Math.min(this.activationTime / this.activationDuration, 1);

        // Red → amber while restoring.
        this.warningLight.material.color.setHex(0xff9d26);
        this.beacon.color.setHex(0xff8a18);
        this.beacon.intensity = 2 + Math.sin(performance.now() * 0.02) * 1.5;

        if (progress < 1) return false;

        this.state = 'on';
        this.warningLight.material.color.setHex(0x7dff9b);
        this.beacon.color.setHex(0x56ff7a);
        this.beacon.intensity = 2.5;

        return true; // Activation completed this frame.
    }

    get activationProgress() {
        return Math.min(this.activationTime / this.activationDuration, 1);
    }
}
