import * as THREE from 'three/webgpu';

export class WallCollisions {
    constructor() {
        this.walls = new Map();

        this.start = new THREE.Vector3();
        this.end = new THREE.Vector3();
        this.testPosition = new THREE.Vector3();
    }

    add(wall, axis, length) {
        this.walls.set(wall, { wall, axis, length });
    }

    remove(wall) {
        this.walls.delete(wall);
    }

    isBlocked(position, radius) {
        for (const { wall, axis, length } of this.walls.values()) {
            wall.updateWorldMatrix(true, false);

            if (axis === 'x') {
                this.start.set(-length * 0.5, 0, 0);
                this.end.set(length * 0.5, 0, 0);
            } else {
                this.start.set(0, 0, -length * 0.5);
                this.end.set(0, 0, length * 0.5);
            }

            wall.localToWorld(this.start);
            wall.localToWorld(this.end);

            const lineX = this.end.x - this.start.x;
            const lineZ = this.end.z - this.start.z;

            const lineLengthSq = lineX * lineX + lineZ * lineZ;

            let t =
                ((position.x - this.start.x) * lineX + (position.z - this.start.z) * lineZ) /
                lineLengthSq;

            t = THREE.MathUtils.clamp(t, 0, 1);

            const closestX = this.start.x + lineX * t;
            const closestZ = this.start.z + lineZ * t;

            const dx = position.x - closestX;
            const dz = position.z - closestZ;

            if (dx * dx + dz * dz < radius * radius) {
                return true;
            }
        }

        return false;
    }

    move(position, movement, radius = 0.35) {
        // Test X first, then Z. This creates wall sliding.
        this.testPosition.copy(position);
        this.testPosition.x += movement.x;

        if (!this.isBlocked(this.testPosition, radius)) {
            position.x = this.testPosition.x;
        }

        this.testPosition.copy(position);
        this.testPosition.z += movement.z;

        if (!this.isBlocked(this.testPosition, radius)) {
            position.z = this.testPosition.z;
        }
    }
}
