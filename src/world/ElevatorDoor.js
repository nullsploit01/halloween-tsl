import * as THREE from 'three/webgpu';

export class ElevatorDoor {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.hasSpawned = false;
        this.node = null;

        const metal = new THREE.MeshStandardNodeMaterial({
            color: 0x202426,
            roughness: 0.35,
            metalness: 0.9,
        });

        const doorMaterial = new THREE.MeshStandardNodeMaterial({
            color: 0x101415,
            roughness: 0.48,
            metalness: 0.8,
        });

        this.indicatorMaterial = new THREE.MeshBasicMaterial({
            color: 0x211313, // dark red / unpowered
        });

        // Double doors.
        const leftDoor = new THREE.Mesh(new THREE.BoxGeometry(1.02, 2.5, 0.12), doorMaterial);

        const rightDoor = leftDoor.clone();

        leftDoor.position.set(-0.52, 1.25, 0.05);
        rightDoor.position.set(0.52, 1.25, 0.05);

        // Simple frame.
        const leftFrame = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.7, 0.2), metal);

        const rightFrame = leftFrame.clone();

        const topFrame = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.16, 0.2), metal);

        leftFrame.position.set(-1.16, 1.35, 0);
        rightFrame.position.set(1.16, 1.35, 0);
        topFrame.position.set(0, 2.62, 0);

        const indicator = new THREE.Mesh(
            new THREE.BoxGeometry(0.38, 0.12, 0.06),
            this.indicatorMaterial,
        );

        indicator.position.set(0, 2.78, 0.14);

        this.group.add(leftDoor, rightDoor, leftFrame, rightFrame, topFrame, indicator);

        const glow = new THREE.PointLight(0x7dff9b, 1.5, 4, 2);
        glow.position.set(0, 2.5, 0.45);

        this.group.add(glow);

        this.glow = new THREE.PointLight(0x7dff9b, 1.5, 4, 2);
        this.glow.position.set(0, 2.5, 0.45);
        this.glow.visible = false;

        this.group.add(this.glow);
    }

    spawn(hotel, playerPosition, maxDistance = 100) {
        if (this.hasSpawned) return false;

        const oppositeDirection = {
            north: 'south',
            south: 'north',
            east: 'west',
            west: 'east',
        };

        const candidates = [];

        for (const node of hotel.nodes.values()) {
            const distance = node.position.distanceTo(playerPosition);

            // A dead-end has exactly one route leading into it.
            if (node.neighbors.size !== 1) continue;
            if (!node.incomingDirection) continue;
            if (distance < 25 || distance > maxDistance) continue;

            // The elevator belongs on the wall at the very end of that path.
            const elevatorWallDirection = oppositeDirection[node.incomingDirection];

            const wall = node.walls.get(elevatorWallDirection);

            // It must be a real wall that has not been opened/removed.
            if (!wall || wall.parent !== node.group) continue;

            candidates.push({
                node,
                wall,
                direction: elevatorWallDirection,
            });
        }

        if (candidates.length === 0) {
            return false;
        }

        const { node, wall } = candidates[Math.floor(Math.random() * candidates.length)];
        hotel.reserveElevatorNode(node);
        const wallPosition = new THREE.Vector3();
        const nodePosition = new THREE.Vector3();
        const inwardDirection = new THREE.Vector3();

        wall.updateWorldMatrix(true, false);
        node.group.updateWorldMatrix(true, false);

        wall.getWorldPosition(wallPosition);
        node.group.getWorldPosition(nodePosition);

        // Always point the elevator from its wall toward the centre of its junction.
        inwardDirection.subVectors(nodePosition, wallPosition);

        inwardDirection.y = 0;
        inwardDirection.normalize();

        // Our elevator model faces local +Z, so rotate +Z toward the hallway.
        const rotationY = Math.atan2(inwardDirection.x, inwardDirection.z);

        // Move a little into the hallway, so it sits in front of the wall.
        wallPosition.addScaledVector(inwardDirection, 0.08);

        this.group.position.set(wallPosition.x, nodePosition.y, wallPosition.z);

        this.group.rotation.set(0, rotationY, 0);

        // Use world placement instead of inheriting any unexpected node transform.
        this.scene.add(this.group);

        this.node = node;
        this.hasSpawned = true;

        return true;
    }

    setPowered(powered) {
        if (!this.hasSpawned) return;

        this.indicatorMaterial.color.setHex(powered ? 0x7dff9b : 0x211313);

        this.glow.visible = powered;
    }
}
