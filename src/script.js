import * as THREE from 'three/webgpu'
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'

import { createCamera } from './core/createCamera.js'
import { createPostProcessing } from './core/createPostProcessing.js'
import { createRenderer } from './core/createRenderer.js'
import { createScene } from './core/createScene.js'
import { addLighting } from './core/lighting.js'
import { Sizes } from './core/Sizes.js'
import { addWorld } from './world/addWorld.js'

const canvas = document.querySelector('canvas.threejs')

const sizes = new Sizes()
const scene = createScene()
const camera = createCamera(sizes)

// Player height, rather than the former scene-preview camera position.
camera.position.set(0, 1.7, 0)

const renderer = await createRenderer(canvas, sizes)
const controls = new PointerLockControls(camera, document.body)

createPostProcessing({ renderer, scene, camera })
addLighting({ scene, renderer })

const { hotel } = await addWorld(scene, camera)

canvas.addEventListener('click', () => {
    controls.lock()
})

sizes.onResize(() => {
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(sizes.pixelRatio)
})

const keys = new Set()
const moveSpeed = 4
const timer = new THREE.Timer()

window.addEventListener('keydown', (event) => keys.add(event.code))
window.addEventListener('keyup', (event) => keys.delete(event.code))
window.addEventListener('blur', () => keys.clear())

function tick() {
    timer.update()

    const deltaTime = timer.getDelta()

    if (controls.isLocked) {
        if (keys.has('KeyW')) controls.moveForward(moveSpeed * deltaTime)
        if (keys.has('KeyS')) controls.moveForward(-moveSpeed * deltaTime)
        if (keys.has('KeyA')) controls.moveRight(-moveSpeed * deltaTime)
        if (keys.has('KeyD')) controls.moveRight(moveSpeed * deltaTime)
    }

    hotel.update(camera.position)

    renderer.render(scene, camera)
}

renderer.setAnimationLoop(tick)