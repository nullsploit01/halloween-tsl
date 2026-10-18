import * as THREE from 'three/webgpu'
import { bloom } from 'three/addons/tsl/display/BloomNode.js'
import { film } from 'three/addons/tsl/display/FilmNode.js'
import {
    pass,
    uniform,
    vec3,
    mix,
    grayscale
} from 'three/tsl'

export function createPostProcessing({ renderer, scene, camera }) {
    const renderPipeline = new THREE.RenderPipeline(renderer)

    const scenePass = pass(scene, camera)
    const sceneColor = scenePass.getTextureNode('output')

    const bloomPass = bloom(sceneColor)
    bloomPass.threshold.value = 0
    bloomPass.strength.value = 0.08

    const normalView = sceneColor.add(bloomPass)

    const nightVisionEnabled = uniform(0)
    const grainIntensity = uniform(0)

    const nightVisionColor = grayscale(normalView.rgb)
        .mul(vec3(0.12, 1.15, 0.2))
        .mul(1.5)

    const nightVisionView = film(
        nightVisionColor,
        grainIntensity
    )

    renderPipeline.outputNode = mix(
        normalView,
        nightVisionView,
        nightVisionEnabled
    )

    return {
        renderPipeline,

        setNightVision(enabled) {
            nightVisionEnabled.value = enabled ? 1 : 0
            grainIntensity.value = enabled ? 0.22 : 0
        }
    }
}