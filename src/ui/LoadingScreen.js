import {
    color,
    float,
    length,
    mix,
    mx_fractal_noise_float,
    mx_noise_float,
    sin,
    smoothstep,
    time,
    uv,
    vec2,
} from 'three/tsl';
import * as THREE from 'three/webgpu';

export class LoadingScreen {
    constructor(renderer) {
        this.renderer = renderer;
        this.isReady = false;
        this.hasEntered = false;
        this.onEnterCallback = null;

        this.scene = new THREE.Scene();

        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);

        this.camera.position.z = 1;

        this.material = new THREE.MeshBasicNodeMaterial();
        this.material.toneMapped = false;

        const screenUV = uv();

        const drift = vec2(time.mul(0.018), time.mul(-0.011));

        const warp = mx_noise_float(screenUV.mul(2.8).add(drift), 1, 0);

        const fogUV = screenUV
            .mul(vec2(3.2, 4.8))
            .add(drift)
            .add(vec2(warp.mul(0.22), warp.mul(0.12)));

        const fogNoise = mx_fractal_noise_float(fogUV, 4, 2, 0.5, 1);

        const fogMask = smoothstep(-0.35, 0.55, fogNoise);

        const lowerFog = smoothstep(0.0, 0.9, float(1).sub(screenUV.y));

        const fog = fogMask
            .mul(lowerFog)
            .mul(1.2);

        const baseColor = mix(
            color('#030203'),
            color('#3b1018'),
            fog
        );

        const redMist = color('#781522').mul(fog.mul(0.3));

        const grainNoise = mx_noise_float(screenUV.mul(900).add(drift.mul(100)), 1, 0);

        const grain = grainNoise.mul(0.025);

        const scanlines = sin(screenUV.y.mul(1100)).mul(0.5).add(0.5);

        const scanlineMask = mix(float(0.94), float(1), scanlines);

        const distanceFromCenter = length(screenUV.sub(vec2(0.5, 0.5)));

        const vignette = smoothstep(0.25, 0.85, distanceFromCenter);

        const vignetteMask = float(1).sub(vignette.mul(0.82));

        const flicker = sin(time.mul(13)).mul(0.012).add(0.988);

        this.material.colorNode = baseColor
            .add(redMist)
            .add(color('#ffffff').mul(grain))
            .mul(scanlineMask)
            .mul(vignetteMask)
            .mul(flicker);

        this.background = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);

        this.scene.add(this.background);

        this.element = document.createElement('div');
        this.element.className = 'loading-screen';

        this.element.innerHTML = `
            <div class="loading-content">
                <div class="loading-title">LORN</div>

                <div class="loading-subtitle">
                    SHE HAS BEEN WAITING
                </div>

                <div class="loading-status">
                    INITIALIZING...
                </div>

                <div class="loading-progress">
                    <div class="loading-progress-fill"></div>
                </div>

                <div class="loading-percent">0%</div>

                <button class="loading-enter" disabled>
                    ENTER IF YOU MUST
                </button>

                <div class="loading-instructions">
                    <div class="instructions-heading">CONTROLS</div>

                    <div class="instructions-list">
                        <div><kbd>W A S D</kbd><span>Move</span></div>
                        <div><kbd>SHIFT</kbd><span>Run</span></div>
                        <div><kbd>ALT + SHIFT</kbd><span>Sneak</span></div>
                        <div><kbd>MOUSE</kbd><span>Look</span></div>
                        <div><kbd>E</kbd><span>Interact</span></div>
                        <div><kbd>L</kbd><span>Lantern</span></div>
                        <div><kbd>N</kbd><span>Night Vision</span></div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.element);

        this.status = this.element.querySelector('.loading-status');

        this.progressFill = this.element.querySelector('.loading-progress-fill');

        this.percent = this.element.querySelector('.loading-percent');

        this.enterButton = this.element.querySelector('.loading-enter');

        this.enterButton.addEventListener('click', () => {
            if (!this.isReady || this.hasEntered) return;

            this.hasEntered = true;
            this.onEnterCallback?.();
        });

        this.resize();

        this.resizeHandler = () => this.resize();

        window.addEventListener('resize', this.resizeHandler);
    }

    resize() {
        const aspect = window.innerWidth / window.innerHeight;

        this.camera.left = -aspect;
        this.camera.right = aspect;
        this.camera.top = 1;
        this.camera.bottom = -1;

        this.camera.updateProjectionMatrix();

        this.background.scale.set(aspect, 1, 1);
    }

    start() {
        this.renderer.setAnimationLoop(() => {
            this.renderer.render(this.scene, this.camera);
        });
    }

    stop() {
        this.renderer.setAnimationLoop(null);
    }

    setProgress(value, message = 'LOADING...') {
        const progress = THREE.MathUtils.clamp(value, 0, 100);

        this.progressFill.style.width = `${progress}%`;
        this.percent.textContent = `${Math.round(progress)}%`;
        this.status.textContent = message;
    }

    ready() {
        this.isReady = true;

        this.element.classList.add('is-ready');

        this.setProgress(100, 'SOMETHING STIRS IN THE DARK');

        this.enterButton.disabled = false;
        this.enterButton.classList.add('is-ready');
    }

    onEnter(callback) {
        this.onEnterCallback = callback;
    }

    hide() {
        this.element.classList.add('is-hidden');

        this.element.addEventListener('transitionend', () => this.element.remove(), { once: true });
    }

    dispose() {
        this.stop();

        window.removeEventListener('resize', this.resizeHandler);

        this.background.geometry.dispose();
        this.material.dispose();
    }
}
