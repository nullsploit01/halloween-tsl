import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { film } from 'three/addons/tsl/display/FilmNode.js';
import { sobel } from 'three/addons/tsl/display/SobelOperatorNode.js';
import { grayscale, mix, pass, uniform, vec3 } from 'three/tsl';
import * as THREE from 'three/webgpu';

export function createPostProcessing({ renderer, scene, camera }) {
  const renderPipeline = new THREE.RenderPipeline(renderer);

  const scenePass = pass(scene, camera);
  const sceneColor = scenePass.getTextureNode('output');

  const bloomPass = bloom(sceneColor);
  bloomPass.threshold.value = 0;
  bloomPass.strength.value = 0.08;

  const normalView = sceneColor.add(bloomPass);

  const sobelAmount = uniform(0);
  let sobelTarget = 0;
  let sobelReleaseAt = 0;

  const sobelView = sobel(sceneColor);

  const normalToSobel = mix(normalView, sobelView, sobelAmount);

  const nightVisionEnabled = uniform(0);
  const grainIntensity = uniform(0);

  const nightVisionColor = grayscale(normalView.rgb)
    .mul(vec3(0.12, 1.15, 0.2))
    .mul(1.5);

  const nightVisionView = film(nightVisionColor, grainIntensity);

  renderPipeline.outputNode = mix(normalToSobel, nightVisionView, nightVisionEnabled);

  return {
    renderPipeline,

    setSobel(enabled) {
      sobelTarget = enabled ? 1 : 0;
      sobelReleaseAt = 0;
    },

    triggerSobel(duration = 0.8) {
      sobelTarget = 1;
      sobelReleaseAt = performance.now() * 0.001 + duration;
    },

    setNightVision(enabled) {
      nightVisionEnabled.value = enabled ? 1 : 0;
      grainIntensity.value = enabled ? 0.22 : 0;
    },

    update(deltaTime) {
      const now = performance.now() * 0.001;

      if (sobelReleaseAt !== 0 && now >= sobelReleaseAt) {
        sobelTarget = 0;
        sobelReleaseAt = 0;
      }

      const transitionSpeed = 7;

      sobelAmount.value +=
        (sobelTarget - sobelAmount.value) * (1 - Math.exp(-transitionSpeed * deltaTime));
    },
  };
}
