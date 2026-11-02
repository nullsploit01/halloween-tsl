import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three/webgpu';

export class GhostRush {
    constructor(
        scene,
        {
            modelPath = '/models/creep.glb',
            speed = 24,
            spawnDistance = 30,
            attackDistance = 1.5,
            modelScale = 1,
            heightOffset = 1.25,
            rotationOffset = 0,
        } = {},
    ) {
        this.scene = scene;
        this.loader = new GLTFLoader();

        this.speed = 5;
        this.maxSpeed = 24;
        this.acceleration = 3;
        this.finalRushDistance = 10;
        this.spawnDistance = spawnDistance;
        this.attackDistance = attackDistance;
        this.modelScale = modelScale;
        this.heightOffset = heightOffset;
        this.rotationOffset = rotationOffset;

        this.group = new THREE.Group();
        this.group.visible = false;
        this.scene.add(this.group);

        this.model = null;
        this.mixer = null;
        this.runAction = null;

        this.isLoaded = false;
        this.isActive = false;
        this.hasAttacked = false;

        this.direction = new THREE.Vector3();
        this.target = new THREE.Vector3();
        this.spawnPosition = new THREE.Vector3();

        this.laodpromise = this.load(modelPath);
    }

    async load(modelPath) {
        try {
            const gltf = await this.loader.loadAsync(modelPath);

            this.model = gltf.scene;
            this.model.scale.setScalar(this.modelScale);

            this.group.add(this.model);

            // Enable shadows.
            this.model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            this.mixer = new THREE.AnimationMixer(this.model);
            const creepyClip = THREE.AnimationClip.findByName(gltf.animations, 'creepy');

            if (creepyClip) {
                this.runAction = this.mixer.clipAction(creepyClip);
                this.runAction.setLoop(THREE.LoopRepeat, Infinity);
                this.runAction.play();
            }

            this.isLoaded = true;
            console.log('Ghost rush model loaded.');
        } catch (error) {
            console.error('Failed to load ghost model:', error);
        }
    }

    trigger(playerPosition, elevatorPosition) {
        if (!this.isLoaded || this.isActive || this.hasAttacked) {
            return false;
        }

        // Direction from elevator to player.
        this.direction.subVectors(playerPosition, elevatorPosition);

        this.direction.y = 0;

        if (this.direction.lengthSq() < 0.001) {
            return false;
        }

        this.direction.normalize();

        // Spawn beyond the player, away from the elevator.
        this.spawnPosition.copy(playerPosition);
        this.spawnPosition.addScaledVector(this.direction, this.spawnDistance);

        this.spawnPosition.y = playerPosition.y - this.heightOffset;

        this.group.position.copy(this.spawnPosition);
        this.group.visible = true;

        this.isActive = true;
        this.hasAttacked = false;

        if (this.runAction) {
            this.runAction.reset();
            this.runAction.play();
        }

        return true;
    }

    update(playerPosition, deltaTime) {
        if (!this.isActive) return false;

        // Aim toward the player's current position.
        this.target.copy(playerPosition);
        this.target.y = playerPosition.y - this.heightOffset;

        this.direction.subVectors(this.target, this.group.position);

        const distance = this.direction.length();

        // Ghost reached the player.
        if (distance <= this.attackDistance) {
            this.isActive = false;
            this.hasAttacked = true;
            this.group.visible = false;

            return true;
        }

        this.direction.normalize();

        // Face the player.
        this.group.rotation.y =
            Math.atan2(this.direction.x, this.direction.z) + Math.PI + this.rotationOffset;

        // Rush at full speed.
        // Speed based on distance from the player.
        let currentSpeed;

        if (distance > 10) {
            // Slow initial approach.
            currentSpeed = 5;
        } else if (distance > 3) {
            // Gradually accelerate.
            const progress = 1 - (distance - 3) / 7;

            currentSpeed = THREE.MathUtils.lerp(5, 24, progress);
        } else {
            // Extremely slow movement near the camera.
            const progress = distance / 3;

            currentSpeed = THREE.MathUtils.lerp(0.5, 3, progress);
        }

        const step = Math.min(currentSpeed * deltaTime, distance);

        this.group.position.addScaledVector(this.direction, step);

        // Update animation.
        this.mixer?.update(deltaTime);

        return false;
    }

    reset() {
        this.isActive = false;
        this.hasAttacked = false;
        this.group.visible = false;

        this.runAction?.stop();
    }

    dispose() {
        this.reset();
        this.scene.remove(this.group);

        this.mixer?.stopAllAction();
        this.mixer?.uncacheRoot(this.model);
    }
}
