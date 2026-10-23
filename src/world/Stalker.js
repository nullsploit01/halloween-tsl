import { GLTFLoader } from 'three/addons/Addons.js';
import * as THREE from 'three/webgpu';

const gltfLoader = new GLTFLoader();

export class Stalker {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.agroDistance = options.agroDistance ?? 10;
        this.chaseSpeed = options.chaseSpeed ?? 3;

        this.attackDistance = options.attackDistance ?? 1.2;

        this.model = null;
        this.marker = null;
        this.hasSpawned = false;
        this.isChasing = false;
        this.wasChasing = false;

        this.mixer = null;
        this.actions = {};
        this.currentAction = null;

        this.currentNode = null;
        this.targetNode = null;
        this.previousNode = null;

        this.patrolSpeed = 0.7;
        this.patrolDirection = new THREE.Vector3();
    }

    async load() {
        const gltf = await gltfLoader.loadAsync('./models/nun.glb');
        const visual = gltf.scene;

        visual.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        // Measure original GLB and scale it to an ~1.8 unit human height.
        visual.updateMatrixWorld(true);

        const bounds = new THREE.Box3().setFromObject(visual);
        const size = bounds.getSize(new THREE.Vector3());

        const targetHeight = 2.8;
        visual.scale.multiplyScalar(targetHeight / size.y);

        // Re-measure after scaling, then center X/Z around a clean pivot.
        visual.updateMatrixWorld(true);
        bounds.setFromObject(visual);

        const center = bounds.getCenter(new THREE.Vector3());

        visual.position.x -= center.x;
        visual.position.z -= center.z;

        // Put the bottom of the model exactly on the floor.
        visual.updateMatrixWorld(true);
        bounds.setFromObject(visual);

        visual.position.y -= bounds.min.y;
        // visual.rotation.y = Math.PI;

        // This wrapper is now the true position of the stalker.
        this.model = new THREE.Group();
        this.model.add(visual);
        this.model.visible = false;

        this.mixer = new THREE.AnimationMixer(visual);

        for (const clip of gltf.animations) {
            this.actions[clip.name] = this.mixer.clipAction(clip);
        }

        this.playAnimation('Walk_calm');

        this.scene.add(this.model);

        this.marker = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            new THREE.MeshBasicMaterial({
                color: 0x00ff88,
                transparent: true,
                opacity: 0.35,
                side: THREE.DoubleSide,
            }),
        );

        this.marker.rotation.x = -Math.PI * 0.5;
        this.marker.visible = false;

        this.scene.add(this.marker);
    }

    playAnimation(name, fadeDuration = 0.25) {
        const nextAction = this.actions[name];

        if (!nextAction || nextAction === this.currentAction) return;

        nextAction
            .reset()
            .setEffectiveTimeScale(1)
            .setEffectiveWeight(1)
            .fadeIn(fadeDuration)
            .play();

        if (this.currentAction) {
            this.currentAction.fadeOut(fadeDuration);
        }

        this.currentAction = nextAction;
    }

    trySpawn(hotel, playerPosition) {
        if (this.hasSpawned || !this.model) return;

        const spawnNode = hotel.getStalkerSpawnNode(playerPosition);

        if (!spawnNode) return;

        this.model.position.copy(spawnNode.position);
        this.model.position.y = 0;

        this.marker.position.copy(this.model.position);
        this.marker.position.y = 0.02;

        this.currentNode = spawnNode;
        this.targetNode = null;
        this.previousNode = null;

        this.model.visible = true;
        this.marker.visible = true;
        this.hasSpawned = true;
    }

    update(playerPosition, deltaTime, hotel) {
        if (!this.model || !this.hasSpawned) return;

        this.mixer.update(deltaTime);

        const playerOffset = new THREE.Vector3().subVectors(playerPosition, this.model.position);

        playerOffset.y = 0;

        const distance = playerOffset.length();
        this.isChasing = distance < this.agroDistance;

        // Stop before walking through the player.
        if (distance <= this.attackDistance) {
            this.targetNode = null;
            this.playAnimation('Attack');

            this.marker.position.copy(this.model.position);
            this.marker.position.y = 0.02;

            this.wasChasing = true;
            return;
        }

        if (this.isChasing) {
            this.playAnimation('WalkFast');

            // She was patrolling when she noticed you.
            // Pick the closer end of her current corridor, so she can turn around.
            if (!this.wasChasing && this.targetNode) {
                const distanceToLastNode = this.currentNode.position.distanceTo(playerPosition);

                const distanceToNextNode = this.targetNode.position.distanceTo(playerPosition);

                if (distanceToLastNode < distanceToNextNode) {
                    // Safely reverse through the same corridor.
                    this.targetNode = this.currentNode;
                }
            }

            // At a junction, choose the next real corridor toward the player.
            if (!this.targetNode) {
                const playerNode = hotel.getClosestNode(playerPosition);

                this.targetNode = hotel.getNextNodeToward(this.currentNode, playerNode);

                // The player is closest to the same junction as the nun.
                // Choose the corridor exit that leads nearest to the player.
                if (!this.targetNode && playerNode === this.currentNode) {
                    const exits = [...this.currentNode.neighbors.values()];

                    exits.sort((a, b) => {
                        const distanceA = a.position.distanceToSquared(playerPosition);

                        const distanceB = b.position.distanceToSquared(playerPosition);

                        return distanceA - distanceB;
                    });

                    this.targetNode = exits[0] ?? null;
                }
            }

            this.moveToTarget(this.chaseSpeed, deltaTime);
        } else {
            this.playAnimation('Walk_calm');

            if (!this.targetNode) {
                this.choosePatrolTarget();
            }

            this.moveToTarget(this.patrolSpeed, deltaTime);
        }

        this.marker.position.copy(this.model.position);
        this.marker.position.y = 0.02;

        this.wasChasing = this.isChasing;
    }

    despawn() {
        if (!this.model) return;

        this.model.visible = false;
        this.marker.visible = false;
        this.isChasing = false;
        this.wasChasing = false;
        this.hasSpawned = false;

        this.currentNode = null;
        this.targetNode = null;
        this.previousNode = null;
    }

    choosePatrolTarget() {
        if (!this.currentNode) return;

        let choices = [...this.currentNode.neighbors.values()].filter(
            (node) => node !== this.previousNode,
        );

        // Dead end: she is allowed to turn back.
        if (choices.length === 0) {
            choices = [...this.currentNode.neighbors.values()];
        }

        if (choices.length === 0) return;

        this.targetNode = choices[Math.floor(Math.random() * choices.length)];
    }

    moveToTarget(speed, deltaTime) {
        if (!this.targetNode) return false;

        const direction = new THREE.Vector3().subVectors(
            this.targetNode.position,
            this.model.position,
        );

        direction.y = 0;

        const distance = direction.length();
        const moveDistance = speed * deltaTime;

        if (distance <= moveDistance) {
            this.model.position.x = this.targetNode.position.x;
            this.model.position.z = this.targetNode.position.z;

            this.previousNode = this.currentNode;
            this.currentNode = this.targetNode;
            this.targetNode = null;

            return true;
        }

        direction.normalize();

        this.model.position.addScaledVector(direction, moveDistance);

        const lookTarget = this.model.position.clone().add(direction);

        this.model.lookAt(lookTarget.x, this.model.position.y, lookTarget.z);

        return false;
    }
}
