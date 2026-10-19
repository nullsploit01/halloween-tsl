import { GLTFLoader } from 'three/addons/Addons.js';
import * as THREE from 'three/webgpu';

const gltfLoader = new GLTFLoader();

export class Stalker {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.agroDistance = options.agroDistance ?? 10;
    this.chaseSpeed = options.chaseSpeed ?? 3;

    this.model = null;
    this.marker = null;
    this.hasSpawned = false;
    this.isChasing = false;

    this.mixer = null
    this.actions = {}
    this.currentAction = null

    this.patrolSpeed = 0.7
    this.patrolDirection = new THREE.Vector3()
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

    const targetHeight = 1.8;
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

    // This wrapper is now the true position of the stalker.
    this.model = new THREE.Group();
    this.model.add(visual);
    this.model.visible = false;

    this.mixer = new THREE.AnimationMixer(visual)

    for (const clip of gltf.animations) {
        this.actions[clip.name] = this.mixer.clipAction(clip)
    }

    this.playAnimation('Walk_calm')

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
        const nextAction = this.actions[name]

        if (!nextAction || nextAction === this.currentAction) return

        nextAction
            .reset()
            .setEffectiveTimeScale(1)
            .setEffectiveWeight(1)
            .fadeIn(fadeDuration)
            .play()

        if (this.currentAction) {
            this.currentAction.fadeOut(fadeDuration)
        }

        this.currentAction = nextAction
    }

  trySpawn(hotel, playerPosition) {
    // There can only ever be one spawn.
    if (this.hasSpawned || !this.model) return;

    const spawnPosition = hotel.getStalkerSpawnPosition(playerPosition);

    if (!spawnPosition) return;

    this.model.position.copy(spawnPosition);
    this.model.position.y = 0;
    this.marker.position.copy(spawnPosition);
    this.marker.position.y = 0.02;
    this.marker.visible = true;
    this.model.visible = true;
    this.hasSpawned = true;

    const directions = [
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(-1, 0, 0),
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(0, 0, -1)
    ]

    this.patrolDirection.copy(
        directions[Math.floor(Math.random() * directions.length)]
    )
  }

  update(playerPosition, deltaTime) {
        if (!this.model || !this.hasSpawned) return

        this.mixer.update(deltaTime)

        const distance = this.model.position.distanceTo(playerPosition)
        this.isChasing = distance < this.agroDistance

        if (this.isChasing) {
            this.playAnimation('WalkFast')

            const direction = new THREE.Vector3()
                .subVectors(playerPosition, this.model.position)

            direction.y = 0
            direction.normalize()

            this.model.position.addScaledVector(
                direction,
                this.chaseSpeed * deltaTime
            )

            this.model.lookAt(
                playerPosition.x,
                this.model.position.y,
                playerPosition.z
            )
        } else {
            this.playAnimation('Walk_calm')

            this.model.position.addScaledVector(
                this.patrolDirection,
                this.patrolSpeed * deltaTime
            )

            const lookTarget = this.model.position
                .clone()
                .add(this.patrolDirection)

            this.model.lookAt(lookTarget)
        }

        this.marker.position.copy(this.model.position)
        this.marker.position.y = 0.02
    }

  despawn() {
    if (!this.model) return;

    this.model.visible = false;
    this.marker.visible = false;
    this.isChasing = false;
    this.hasSpawned = false;
  }
}
