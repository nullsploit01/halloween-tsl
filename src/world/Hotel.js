import * as THREE from 'three/webgpu'

const DIRECTIONS = {
    north: { x: 0, z: -1 },
    east: { x: 1, z: 0 },
    south: { x: 0, z: 1 },
    west: { x: -1, z: 0 }
}

const DIRECTION_NAMES = ['north', 'east', 'south', 'west']

function opposite(direction) {
    const index = DIRECTION_NAMES.indexOf(direction)

    return DIRECTION_NAMES[(index + 2) % 4]
}

function relativeDirection(forward, relative) {
    const index = DIRECTION_NAMES.indexOf(forward)

    if (relative === 'left') {
        return DIRECTION_NAMES[(index + 3) % 4]
    }

    if (relative === 'right') {
        return DIRECTION_NAMES[(index + 1) % 4]
    }

    return forward
}

function createBoxWall({ length, height, thickness, axis, material }) {
    const geometry = axis === 'x'
        ? new THREE.BoxGeometry(length, height, thickness)
        : new THREE.BoxGeometry(thickness, height, length)

    const wall = new THREE.Mesh(geometry, material)

    wall.castShadow = true
    wall.receiveShadow = true

    return wall
}

export class Hotel {
    constructor(scene, options = {}) {
        this.scene = scene

        this.hallwayWidth = options.hallwayWidth ?? 6
        this.hallwayHeight = options.hallwayHeight ?? 3
        this.hallwayLength = options.hallwayLength ?? 22
        this.floorThickness = options.floorThickness ?? 0.15
        this.activationDistance = options.activationDistance ?? this.hallwayLength + this.hallwayWidth

        // Replace this with a GLB-cloning factory later if wanted.
        this.wallFactory = options.wallFactory ?? createBoxWall

        this.floorMaterial = new THREE.MeshStandardNodeMaterial({
            color: 0x1a1718,
            roughness: 0.95
        })

        this.wallMaterial = new THREE.MeshStandardNodeMaterial({
            color: 0x30272a,
            roughness: 0.9
        })

        this.nodes = new Map()
        this.corridors = new Map()

        // Nothing is open until the player reaches this first junction.
        this.createNode(0, 0, null, 0)
    }

    update(playerPosition) {
        const nodesToActivate = [...this.nodes.values()].filter((node) => {
            return (
                !node.activated &&
                node.position.distanceTo(playerPosition) < this.activationDistance
            )
        })

        for (const node of nodesToActivate) {
            this.activateNode(node)
        }
    }

    createNode(gridX, gridZ, incomingDirection, straightStreak) {
        const key = `${gridX}:${gridZ}`
        const existingNode = this.nodes.get(key)

        if (existingNode) {
            if (incomingDirection) {
                this.openSide(existingNode, incomingDirection)
            }

            return existingNode
        }

        const group = new THREE.Group()
        group.position.set(
            gridX * this.hallwayLength,
            0,
            gridZ * this.hallwayLength
        )

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
            walls: new Map()
        }

        this.nodes.set(key, node)
        this.scene.add(group)

        this.addJunctionFloor(node)

        for (const direction of DIRECTION_NAMES) {
            this.addJunctionWall(node, direction)
        }

        if (incomingDirection === null) {
            // Start with a proper three-way hotel junction.
            node.plannedExits = ['north', 'east', 'west']
        } else {
            // The path we arrived from must remain open.
            this.openSide(node, incomingDirection)

            const forward = opposite(incomingDirection)

            node.plannedExits = this.chooseExits(
                forward,
                straightStreak
            )
        }

        return node
    }

    chooseExits(forward, straightStreak) {
        // Stops the player from walking forward forever.
        if (straightStreak >= 2) {
            if (Math.random() < 0.65) {
                return [
                    relativeDirection(forward, 'left'),
                    relativeDirection(forward, 'right')
                ]
            }

            return [
                relativeDirection(
                    forward,
                    Math.random() < 0.5 ? 'left' : 'right'
                )
            ]
        }

        const roll = Math.random()

        // T-junction: a choice left/right; a wall straight ahead.
        if (roll < 0.35) {
            return [
                relativeDirection(forward, 'left'),
                relativeDirection(forward, 'right')
            ]
        }

        // A main hallway plus one side route.
        if (roll < 0.65) {
            return [
                forward,
                relativeDirection(forward, 'left')
            ]
        }

        if (roll < 0.9) {
            return [
                forward,
                relativeDirection(forward, 'right')
            ]
        }

        // A forced corner.
        return [
            relativeDirection(
                forward,
                Math.random() < 0.5 ? 'left' : 'right'
            )
        ]
    }

    activateNode(node) {
        node.activated = true

        for (const direction of node.plannedExits) {
            this.connect(node, direction)
        }
    }

    connect(node, direction) {
        const vector = DIRECTIONS[direction]
        const nextX = node.gridX + vector.x
        const nextZ = node.gridZ + vector.z

        const isStraight =
            node.incomingDirection !== null &&
            direction === opposite(node.incomingDirection)

        const childNode = this.createNode(
            nextX,
            nextZ,
            opposite(direction),
            isStraight ? node.straightStreak + 1 : 0
        )

        // Opens both ends and fills the entire gap with a corridor.
        this.openSide(node, direction)
        this.openSide(childNode, opposite(direction))
        this.addCorridor(node, childNode)
    }

    addJunctionFloor(node) {
        const floor = new THREE.Mesh(
            new THREE.BoxGeometry(
                this.hallwayWidth,
                this.floorThickness,
                this.hallwayWidth
            ),
            this.floorMaterial
        )

        // Its upper surface is exactly at world Y = 0.
        floor.position.y = -this.floorThickness * 0.5
        floor.receiveShadow = true

        node.group.add(floor)
    }

    addJunctionWall(node, direction) {
        const isNorthOrSouth =
            direction === 'north' || direction === 'south'

        const wall = this.wallFactory({
            length: this.hallwayWidth,
            height: this.hallwayHeight,
            thickness: 0.2,
            axis: isNorthOrSouth ? 'x' : 'z',
            material: this.wallMaterial
        })

        const halfWidth = this.hallwayWidth * 0.5

        if (direction === 'north') wall.position.z = -halfWidth
        if (direction === 'south') wall.position.z = halfWidth
        if (direction === 'west') wall.position.x = -halfWidth
        if (direction === 'east') wall.position.x = halfWidth

        wall.position.y = this.hallwayHeight * 0.5

        node.group.add(wall)
        node.walls.set(direction, wall)
    }

    openSide(node, direction) {
        const wall = node.walls.get(direction)

        if (!wall) {
            return
        }

        wall.removeFromParent()
        node.walls.delete(direction)
    }

    addCorridor(fromNode, toNode) {
        const corridorKey = [fromNode.key, toNode.key]
            .sort()
            .join('|')

        if (this.corridors.has(corridorKey)) {
            return
        }

        const isVertical = fromNode.gridX === toNode.gridX
        const corridorLength = this.hallwayLength - this.hallwayWidth

        const group = new THREE.Group()

        group.position.copy(fromNode.position)
        group.position.add(toNode.position)
        group.position.multiplyScalar(0.5)

        const floor = new THREE.Mesh(
            new THREE.BoxGeometry(
                isVertical ? this.hallwayWidth : corridorLength,
                this.floorThickness,
                isVertical ? corridorLength : this.hallwayWidth
            ),
            this.floorMaterial
        )

        floor.position.y = -this.floorThickness * 0.5
        floor.receiveShadow = true
        group.add(floor)

        for (const side of [-1, 1]) {
            const wall = this.wallFactory({
                length: corridorLength,
                height: this.hallwayHeight,
                thickness: 0.2,
                axis: isVertical ? 'z' : 'x',
                material: this.wallMaterial
            })

            wall.position.y = this.hallwayHeight * 0.5

            if (isVertical) {
                wall.position.x = side * this.hallwayWidth * 0.5
            } else {
                wall.position.z = side * this.hallwayWidth * 0.5
            }

            group.add(wall)
        }

        this.scene.add(group)
        this.corridors.set(corridorKey, group)
    }
}