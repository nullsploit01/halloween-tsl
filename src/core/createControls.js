import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createOrbitControls(camera, canvas) {
  const controls = new OrbitControls(camera, canvas);

  controls.target.set(0, 0, 0);
  controls.enableDamping = true;

  return controls;
}
