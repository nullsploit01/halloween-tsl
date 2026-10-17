import { GLTFLoader } from 'three/addons/Addons.js'
import * as THREE from 'three/webgpu'

const gltfLoader = new GLTFLoader()


export const addLantern = async (scene) => {
    const model = await gltfLoader.loadAsync('./models/lantern.glb')
    const lantern = model.scene

    lantern.scale.setScalar(0.01)
    lantern.position.y = 3
    lantern.rotation.y = -Math.PI * 0.5

    lantern.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true
            child.receiveShadow = true
        }
    })

    scene.add(lantern)

    const pressedKeys = new Set()
    const moveSpeed = 3

    const onKeyDown = (event) => pressedKeys.add(event.code)
    const onKeyUp = (event) => pressedKeys.delete(event.code)
    const clearKeys = () => pressedKeys.clear()

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', clearKeys)

    return {
        lantern,

        update(deltaTime) {
            const direction = new THREE.Vector3(
                Number(pressedKeys.has('KeyD')) - Number(pressedKeys.has('KeyA')),
                0,
                Number(pressedKeys.has('KeyS')) - Number(pressedKeys.has('KeyW'))
            )

            if (direction.lengthSq() > 0) {
                direction.normalize()
                lantern.position.addScaledVector(direction, moveSpeed * deltaTime)
            }
        },

        destroy() {
            window.removeEventListener('keydown', onKeyDown)
            window.removeEventListener('keyup', onKeyUp)
            window.removeEventListener('blur', clearKeys)
            scene.remove(lantern)
        }
    }
}