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
    }

    trySpawn(hotel, playerPosition) {
        if (this.hasSpawned) return;

        const candidates = [...hotel.nodes.values()].filter((node) => {
            const distance = node.position.distanceTo(playerPosition);

            return node.activated && node.walls.size > 0 && distance > 6 && distance < 20;
        });

        if (candidates.length === 0) return;

        const node = candidates[Math.floor(Math.random() * candidates.length)];

        const directions = [...node.walls.keys()];
        const direction = directions[Math.floor(Math.random() * directions.length)];

        const offset = hotel.hallwayWidth * 0.5 - 0.08;

        const placement = {
            // Box faces inward, toward the centre of the junction.
            north: { x: 0, z: -offset, rotationY: 0 },
            south: { x: 0, z: offset, rotationY: Math.PI },

            // These were reversed.
            east: { x: offset, z: 0, rotationY: -Math.PI * 0.5 },
            west: { x: -offset, z: 0, rotationY: Math.PI * 0.5 },
        }[direction];

        this.group.position.set(placement.x, 1.25, placement.z);

        this.group.rotation.y = placement.rotationY;

        // Attach it to the junction, so it stays in the correct world location.
        node.group.add(this.group);

        this.node = node;
        this.hasSpawned = true;
    }
}
