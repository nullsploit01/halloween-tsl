import * as THREE from 'three/webgpu'
import { createTiledFloorGeometry } from './createTiledFloorGeometry.js'

const DIRECTIONS = {
    south: { x: 0, z: 1, rotation: 0 },
    north: { x: 0, z: -1, rotation: Math.PI },
    east: { x: 1, z: 0, rotation: Math.PI * 0.5 },
    west: { x: -1, z: 0, rotation: -Math.PI * 0.5 }
}

export function createStartingRoom({
    scene,
    entrancePosition,
    direction = 'south',
    wallFactory,
    floorMaterial,
    wallMaterial,
    ceilingMaterial,
    hallwayWidth,
    hallwayHeight,
    floorThickness,
    ceilingThickness,
    roomDepth = 8
}) {
    const config = DIRECTIONS[direction]
    const group = new THREE.Group()

    group.rotation.y = config.rotation
    group.position.copy(entrancePosition)
    group.position.x +=
        config.x * (hallwayWidth * 0.5 + roomDepth * 0.5)
    group.position.z +=
        config.z * (hallwayWidth * 0.5 + roomDepth * 0.5)

    const floor = new THREE.Mesh(
        createTiledFloorGeometry(
            hallwayWidth,
            floorThickness,
            roomDepth
        ),
        floorMaterial
    )

    floor.position.y = -floorThickness * 0.5
    floor.receiveShadow = true
    group.add(floor)

    const ceiling = new THREE.Mesh(
        new THREE.BoxGeometry(
            hallwayWidth,
            ceilingThickness,
            roomDepth
        ),
        ceilingMaterial
    )

    ceiling.position.y = hallwayHeight + ceilingThickness * 0.5
    group.add(ceiling)

    for (const side of [-1, 1]) {
        const wall = wallFactory({
            length: roomDepth,
            height: hallwayHeight,
            axis: 'z',
            material: wallMaterial
        })

        wall.position.x = side * hallwayWidth * 0.5
        wall.position.y = hallwayHeight * 0.5
        group.add(wall)
    }

    const frontWall = wallFactory({
        length: hallwayWidth,
        height: hallwayHeight,
        axis: 'x',
        material: wallMaterial
    })

    frontWall.position.z = -roomDepth * 0.5
    frontWall.position.y = hallwayHeight * 0.5

    group.add(frontWall)

    const backWall = wallFactory({
        length: hallwayWidth,
        height: hallwayHeight,
        axis: 'x',
        material: wallMaterial
    })

    backWall.position.z = roomDepth * 0.5
    backWall.position.y = hallwayHeight * 0.5
    group.add(backWall)

    scene.add(group)
    group.updateMatrixWorld(true)

    return {
        group,
        spawnPosition: group.localToWorld(
            new THREE.Vector3(0, 1.7, roomDepth * 0.2)
        ),
        doorwayLookAt: group.localToWorld(
            new THREE.Vector3(0, 1.7, -roomDepth * 0.5)
        )
    }
}