import { GLTFLoader } from 'three/addons/Addons.js'
import * as THREE from 'three/webgpu'

const gltfLoader = new GLTFLoader()


export async function addLantern(camera) {
    const gltf = await gltfLoader.loadAsync('./models/lantern.glb')
    const lantern = gltf.scene

    lantern.scale.setScalar(0.01)

    lantern.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true
            child.receiveShadow = true
        }
    })

    // Adding it to the camera makes it a held lantern.
    camera.add(lantern)

    // Local position: right/left, up/down, forward/back from the camera.
    lantern.position.set(0.45, -0.65, -1.5)

    // Keep your model-specific correction.
    lantern.rotation.set(0, -Math.PI * 0.5, 0)

    return lantern
}