import * as THREE from 'three/webgpu'
import { GLTFLoader } from 'three/addons/Addons.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { Inspector } from 'three/addons/inspector/Inspector.js'
import { bloom } from 'three/addons/tsl/display/BloomNode.js'
import { pass } from 'three/tsl'

const canvas = document.querySelector('canvas.threejs')
const scene = new THREE.Scene()

const textureLoader = new THREE.TextureLoader()
const gltfLoader = new GLTFLoader()

const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

// Base camera
const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100)
camera.position.x = 9
camera.position.y = 7.5
camera.position.z = 7
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.target.set(0, 0, 0)
controls.enableDamping = true

const renderer = new THREE.WebGPURenderer({
    canvas: canvas,
    antialias: true
})

renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFShadowMap
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setClearColor(0x000000)
renderer.inspector = new Inspector()
await renderer.init()

/**
 * Post processing
 */
const renderPipeline = new THREE.RenderPipeline(renderer)
const scenePass = pass(scene, camera)
const scenePassColor = scenePass.getTextureNode('output')
const bloomPass = bloom(scenePassColor)
bloomPass.threshold.value = 0
bloomPass.strength.value = 0.05

renderPipeline.outputNode = scenePassColor.add(bloomPass)

const bloomGui = renderer.inspector.createParameters('Bloom').close()
bloomGui.add(bloomPass.threshold, 'value', 0, 2, 0.01).name('threshold')
bloomGui.add(bloomPass.strength, 'value', 0, 2, 0.01).name('strength')

/**
 * Lights
 */
const directionalLight = new THREE.DirectionalLight(0xff9147, 9.2)
directionalLight.castShadow = true
directionalLight.position.set(2, 1.1, -1.75).normalize().multiplyScalar(10)
directionalLight.shadow.camera.top = 10
directionalLight.shadow.camera.right = 10
directionalLight.shadow.camera.bottom = -10
directionalLight.shadow.camera.left = -10
directionalLight.shadow.camera.near = 0.01
directionalLight.shadow.camera.far = 20
directionalLight.shadow.radius = 5
directionalLight.shadow.normalBias = 0.1
scene.add(directionalLight)

const ambientLight = new THREE.AmbientLight(0xb870ff, 2.6)
scene.add(ambientLight)

const lightsGui = renderer.inspector.createParameters('Lights').close()

lightsGui.addColor(directionalLight, 'color').name('directionalColor')
lightsGui.add(directionalLight.position, 'y', 0, 10, 0.01).name('directionalY')
lightsGui.add(directionalLight, 'intensity', 0, 10, 0.01).name('directionalIntensity')
lightsGui.addColor(ambientLight, 'color').name('ambientColor')
lightsGui.add(ambientLight, 'intensity', 0, 5, 0.01).name('ambientIntensity')

{

    // const textureColor = textureLoader.load('./floor-color.jpg')
    // textureColor.colorSpace = THREE.SRGBColorSpace

    const geometry = new THREE.PlaneGeometry(10, 10)

    const material = new THREE.MeshStandardNodeMaterial({ transparent: true })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.rotation.x = - Math.PI * 0.5
    mesh.receiveShadow = true
    scene.add(mesh)
}


/**
 * Animate
 */
const timer = new THREE.Timer()

const tick = () =>
{
    timer.update()

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)
}

renderer.setAnimationLoop(tick)