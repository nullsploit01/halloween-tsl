import { createTiledFloorGeometry } from './createTiledFloorGeometry';
import * as THREE from 'three/webgpu';

const textureLoader = new THREE.TextureLoader();

const floorColorTexture = await textureLoader.loadAsync('./textures/white_marble/texture.jpg');

floorColorTexture.colorSpace = THREE.SRGBColorSpace;
floorColorTexture.repeat.set(0.25, 0.25);

for (const texture of [floorColorTexture]) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
}

const DIRECTIONS = {
    north: { x: 0, z: -1 },
    east: { x: 1, z: 0 },
    south: { x: 0, z: 1 },
    west: { x: -1, z: 0 },
};

const DIRECTION_NAMES = ['north', 'east', 'south', 'west'];

function opposite(direction) {
    const index = DIRECTION_NAMES.indexOf(direction);

    return DIRECTION_NAMES[(index + 2) % 4];
}

function relativeDirection(forward, relative) {
    const index = DIRECTION_NAMES.indexOf(forward);

    if (relative === 'left') {
        return DIRECTION_NAMES[(index + 3) % 4];
    }

    if (relative === 'right') {
        return DIRECTION_NAMES[(index + 1) % 4];
    }

    return forward;
}

function createBoxWall({ length, height, axis, material }) {
    const geometry = new THREE.PlaneGeometry(length, height);

    // A plane starts along X/Y. Rotate it when the wall runs along Z.
    if (axis === 'z') {
        geometry.rotateY(Math.PI * 0.5);
    }

    const wall = new THREE.Mesh(geometry, material);

    wall.castShadow = true;
    wall.receiveShadow = false;

    return wall;
}

export class Hotel {
    constructor(scene, options = {}) {
        this.scene = scene;

        this.ceilingThickness = 0.15;
        this.hallwayWidth = options.hallwayWidth ?? 6;
        this.hallwayHeight = options.hallwayHeight ?? 3;
        this.hallwayLength = options.hallwayLength ?? 22;
        this.floorThickness = options.floorThickness ?? 0.15;
        this.activationDistance =
            options.activationDistance ?? this.hallwayLength + this.hallwayWidth;

        // Replace this with a GLB-cloning factory later if wanted.
        this.wallFactory = options.wallFactory ?? createBoxWall;

        this.floorMaterial = new THREE.MeshStandardNodeMaterial({
            color: 0xffffff,
            roughness: 0.25,
            metalness: 0.75,
            map: floorColorTexture,
        });

        this.ceilingMaterial = new THREE.MeshStandardNodeMaterial({
            color: 0x96958b,
            roughness: 0.95,
        });

        this.wallMaterial = new THREE.MeshStandardNodeMaterial({
            color: 0x77776f,
            normalScale: new THREE.Vector2(0.35, 0.35),
            side: THREE.DoubleSide,
            roughness: 0.9,
        });

        this.nodes = new Map();
        this.corridors = new Map();

        this.wallCollisions = options.wallCollisions ?? null;

        // Nothing is open until the player reaches this first junction.
        this.startNode = this.createNode(0, 0, null, 0);
    }

    getStalkerSpawnPosition(playerPosition) {
        const minimumDistance = 24;
        const maximumDistance = 45;

        const candidates = [...this.nodes.values()].filter((node) => {
            const distance = node.position.distanceTo(playerPosition);

            return node.activated && distance > minimumDistance && distance < maximumDistance;
        });

        if (candidates.length === 0) return null;

        const node = candidates[Math.floor(Math.random() * candidates.length)];

        return node.position.clone();
    }

    addCeiling(parent, width, length) {
        const ceiling = new THREE.Mesh(
            new THREE.BoxGeometry(width, this.ceilingThickness, length),
            this.ceilingMaterial,
        );

        // Walls run from Y = 0 to Y = hallwayHeight.
        ceiling.position.y = this.hallwayHeight + this.ceilingThickness * 0.5;

        ceiling.receiveShadow = true;

        parent.add(ceiling);
    }

    update(playerPosition) {
        const nodesToActivate = [...this.nodes.values()].filter((node) => {
            return (
                !node.activated &&
                node.position.distanceTo(playerPosition) < this.activationDistance
            );
        });

        for (const node of nodesToActivate) {
            this.activateNode(node);
        }
    }

    createNode(gridX, gridZ, incomingDirection, straightStreak) {
        const key = `${gridX}:${gridZ}`;
        const existingNode = this.nodes.get(key);

        if (existingNode) {
            if (incomingDirection) {
                this.openSide(existingNode, incomingDirection);
            }

            return existingNode;
        }

        const group = new THREE.Group();
        group.position.set(gridX * this.hallwayLength, 0, gridZ * this.hallwayLength);

        const node = {
            key,
            gridX,
            gridZ,
            group,
            position: group.position,
            incomingDirection,
            straightStreak,
            activated: false,
            plannedExits: [],
            walls: new Map(),
            neighbors: new Map(),
        };

        this.nodes.set(key, node);
        this.scene.add(group);

        this.addJunctionFloor(node);

        for (const direction of DIRECTION_NAMES) {
            this.addJunctionWall(node, direction);
        }

        if (incomingDirection === null) {
            // Start with a proper three-way hotel junction.
            node.plannedExits = ['north', 'east', 'west'];
        } else {
            // The path we arrived from must remain open.
            this.openSide(node, incomingDirection);

            const forward = opposite(incomingDirection);

            node.plannedExits = this.chooseExits(forward, straightStreak);
        }

        return node;
    }

    chooseExits(forward, straightStreak) {
        // Stops the player from walking forward forever.
        if (straightStreak >= 2) {
            if (Math.random() < 0.65) {
                return [relativeDirection(forward, 'left'), relativeDirection(forward, 'right')];
            }

            return [relativeDirection(forward, Math.random() < 0.5 ? 'left' : 'right')];
        }

        const roll = Math.random();

        // T-junction: a choice left/right; a wall straight ahead.
        if (roll < 0.35) {
            return [relativeDirection(forward, 'left'), relativeDirection(forward, 'right')];
        }

        // A main hallway plus one side route.
        if (roll < 0.65) {
            return [forward, relativeDirection(forward, 'left')];
        }

        if (roll < 0.9) {
            return [forward, relativeDirection(forward, 'right')];
        }

        // A forced corner.
        return [relativeDirection(forward, Math.random() < 0.5 ? 'left' : 'right')];
    }

    activateNode(node) {
        node.activated = true;

        for (const direction of node.plannedExits) {
            this.connect(node, direction);
        }
    }

    connect(node, direction) {
        const vector = DIRECTIONS[direction];
        const nextX = node.gridX + vector.x;
        const nextZ = node.gridZ + vector.z;

        const isStraight =
            node.incomingDirection !== null && direction === opposite(node.incomingDirection);

        const childNode = this.createNode(
            nextX,
            nextZ,
            opposite(direction),
            isStraight ? node.straightStreak + 1 : 0,
        );

        // Opens both ends and fills the entire gap with a corridor.
        this.openSide(node, direction);
        this.openSide(childNode, opposite(direction));
        this.addCorridor(node, childNode);

        node.neighbors.set(direction, childNode);
        childNode.neighbors.set(opposite(direction), node);
    }

    addJunctionFloor(node) {
        const floor = new THREE.Mesh(
            createTiledFloorGeometry(this.hallwayWidth, this.floorThickness, this.hallwayWidth),
            this.floorMaterial,
        );

        // Its upper surface is exactly at world Y = 0.
        floor.position.y = -this.floorThickness * 0.5;
        floor.receiveShadow = true;

        node.group.add(floor);

        this.addCeiling(node.group, this.hallwayWidth, this.hallwayWidth);
    }

    addJunctionWall(node, direction) {
        const isNorthOrSouth = direction === 'north' || direction === 'south';

        const wall = this.wallFactory({
            length: this.hallwayWidth,
            height: this.hallwayHeight,
            thickness: 0.2,
            axis: isNorthOrSouth ? 'x' : 'z',
            material: this.wallMaterial,
        });

        const halfWidth = this.hallwayWidth * 0.5;

        if (direction === 'north') wall.position.z = -halfWidth;
        if (direction === 'south') wall.position.z = halfWidth;
        if (direction === 'west') wall.position.x = -halfWidth;
        if (direction === 'east') wall.position.x = halfWidth;

        wall.position.y = this.hallwayHeight * 0.5;

        node.group.add(wall);

        this.registerWall(wall, isNorthOrSouth ? 'x' : 'z', this.hallwayWidth);

        node.walls.set(direction, wall);
    }

    openSide(node, direction) {
        const wall = node.walls.get(direction);

        if (!wall) {
            return;
        }

        this.wallCollisions?.remove(wall);

        wall.removeFromParent();
        node.walls.delete(direction);
    }

    addCorridor(fromNode, toNode) {
        const corridorKey = [fromNode.key, toNode.key].sort().join('|');

        if (this.corridors.has(corridorKey)) {
            return;
        }

        const isVertical = fromNode.gridX === toNode.gridX;
        const corridorLength = this.hallwayLength - this.hallwayWidth;

        const group = new THREE.Group();

        group.position.copy(fromNode.position);
        group.position.add(toNode.position);
        group.position.multiplyScalar(0.5);

        const floor = new THREE.Mesh(
            createTiledFloorGeometry(
                isVertical ? this.hallwayWidth : corridorLength,
                this.floorThickness,
                isVertical ? corridorLength : this.hallwayWidth,
            ),
            this.floorMaterial,
        );

        floor.position.y = -this.floorThickness * 0.5;
        floor.receiveShadow = true;
        group.add(floor);

        this.addCeiling(
            group,
            isVertical ? this.hallwayWidth : corridorLength,
            isVertical ? corridorLength : this.hallwayWidth,
        );

        for (const side of [-1, 1]) {
            const wall = this.wallFactory({
                length: corridorLength,
                height: this.hallwayHeight,
                thickness: 0.2,
                axis: isVertical ? 'z' : 'x',
                material: this.wallMaterial,
            });

            wall.position.y = this.hallwayHeight * 0.5;

            if (isVertical) {
                wall.position.x = side * this.hallwayWidth * 0.5;
            } else {
                wall.position.z = side * this.hallwayWidth * 0.5;
            }

            group.add(wall);

            this.registerWall(wall, isVertical ? 'z' : 'x', corridorLength);
        }

        this.scene.add(group);
        this.corridors.set(corridorKey, group);
    }

    getStalkerSpawnNode(playerPosition) {
        const minimumDistance = 24;
        const maximumDistance = 45;

        const candidates = [...this.nodes.values()].filter((node) => {
            const distance = node.position.distanceTo(playerPosition);

            return node.activated && distance > minimumDistance && distance < maximumDistance;
        });

        if (candidates.length === 0) return null;

        return candidates[Math.floor(Math.random() * candidates.length)];
    }

    getClosestNode(position) {
        let closestNode = null;
        let closestDistance = Infinity;

        for (const node of this.nodes.values()) {
            const distance = node.position.distanceTo(position);

            if (distance < closestDistance) {
                closestDistance = distance;
                closestNode = node;
            }
        }

        return closestNode;
    }

    getNextNodeToward(startNode, targetNode) {
        if (!startNode || !targetNode || startNode === targetNode) {
            return null;
        }

        const queue = [startNode];
        const previous = new Map([[startNode.key, null]]);

        while (queue.length > 0) {
            const current = queue.shift();

            if (current === targetNode) break;

            for (const neighbor of current.neighbors.values()) {
                if (previous.has(neighbor.key)) continue;

                previous.set(neighbor.key, current);
                queue.push(neighbor);
            }
        }

        if (!previous.has(targetNode.key)) return null;

        let step = targetNode;

        while (previous.get(step.key) !== startNode) {
            step = previous.get(step.key);
        }

        return step;
    }

    getStartNode() {
        return this.startNode;
    }

    openStartEntrance(direction = 'south') {
        this.openSide(this.startNode, direction);
    }

    getRoomConfig() {
        return {
            wallFactory: this.wallFactory,
            floorMaterial: this.floorMaterial,
            wallMaterial: this.wallMaterial,
            ceilingMaterial: this.ceilingMaterial,
            hallwayWidth: this.hallwayWidth,
            hallwayHeight: this.hallwayHeight,
            floorThickness: this.floorThickness,
            ceilingThickness: this.ceilingThickness,
        };
    }

    registerWall(wall, axis, length) {
        this.wallCollisions?.add(wall, axis, length);
    }

    movePlayer(position, movement, radius = 0.35) {
        this.wallCollisions?.move(position, movement, radius);
    }
}
