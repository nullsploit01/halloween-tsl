import * as THREE from 'three/webgpu'
import { bloom } from 'three/addons/tsl/display/BloomNode.js'
import { pass } from 'three/tsl'

export function createPostProcessing({ renderer, scene, camera }) {
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

    return { renderPipeline, bloomPass }
}