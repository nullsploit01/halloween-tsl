import * as THREE from 'three/webgpu'

export function createTiledFloorGeometry(
    width,
    thickness,
    length,
    tileSize = 2
) {
    const geometry = new THREE.BoxGeometry(width, thickness, length)
    const uvs = geometry.attributes.uv

    for (let i = 0; i < uvs.count; i++) {
        uvs.setXY(
            i,
            uvs.getX(i) * (width / tileSize),
            uvs.getY(i) * (length / tileSize)
        )
    }

    uvs.needsUpdate = true

    return geometry
}