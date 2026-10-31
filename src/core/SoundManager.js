
import { Howl, Howler } from 'howler';
import * as THREE from 'three/webgpu';

export class SoundManager {
    constructor({
        minEnvironmentInterval = 15,
        maxEnvironmentInterval = 40,
        maxConcurrentEnvironmentSounds = 2,
        masterVolume = 1,
    } = {}) {
        this.masterVolume = masterVolume;
        Howler.volume(masterVolume);

        // Ambience
        this.ambiences = new Map();
        this.currentAmbience = null;

        // Environmental sounds
        this.environmentSounds = [];
        this.environmentSources = [];
        this.activeEnvironmentSounds = new Set();

        this.minEnvironmentInterval = minEnvironmentInterval;
        this.maxEnvironmentInterval = maxEnvironmentInterval;
        this.maxConcurrentEnvironmentSounds =
            maxConcurrentEnvironmentSounds;

        this.environmentTimer = 0;
        this.nextEnvironmentTime = this.randomEnvironmentInterval();

        this.elapsedTime = 0;
        this.lastEnvironmentSound = null;

        this.enabled = true;

        // Reusable listener vectors
        this.listenerPosition = new THREE.Vector3();
        this.listenerForward = new THREE.Vector3();
        this.listenerUp = new THREE.Vector3();
        this.listenerQuaternion = new THREE.Quaternion();
    }

    // --------------------------------------------------
    // AMBIENCE
    // --------------------------------------------------

    addAmbience(name, src, volume = 0.3) {
        const howl = new Howl({
            src: [src],
            loop: true,
            volume,
            preload: true,
        });

        this.ambiences.set(name, {
            howl,
            volume,
        });
    }

    playAmbience(name, fadeDuration = 2000) {
        if (!this.enabled) return;

        const next = this.ambiences.get(name);

        if (!next) {
            console.warn(`Ambience not found: ${name}`);
            return;
        }

        if (this.currentAmbience?.name === name) return;

        // Fade out previous ambience.
        if (this.currentAmbience) {
            const previous = this.currentAmbience;

            previous.howl.fade(
                previous.howl.volume(previous.id),
                0,
                fadeDuration,
                previous.id
            );

            previous.howl.once('fade', () => {
                previous.howl.stop(previous.id);
            }, previous.id);
        }

        // Start new ambience.
        const id = next.howl.play();

        next.howl.volume(0, id);

        next.howl.fade(
            0,
            next.volume,
            fadeDuration,
            id
        );

        this.currentAmbience = {
            name,
            howl: next.howl,
            id,
        };
    }

    stopAmbience(fadeDuration = 2000) {
        if (!this.currentAmbience) return;

        const current = this.currentAmbience;

        current.howl.fade(
            current.howl.volume(current.id),
            0,
            fadeDuration,
            current.id
        );

        current.howl.once('fade', () => {
            current.howl.stop(current.id);
        }, current.id);

        this.currentAmbience = null;
    }

    // --------------------------------------------------
    // ENVIRONMENTAL SOUNDS
    // --------------------------------------------------

    addEnvironmentSound({
        name,
        src,
        volume = 0.4,
        weight = 1,
        cooldown = 30,
    }) {
        const howl = new Howl({
            src: [src],
            volume,
            preload: true,
            pannerAttr: {
                panningModel: 'HRTF',
                distanceModel: 'inverse',
                refDistance: 2,
                rolloffFactor: 1,
                maxDistance: 25,
            },
        });

        this.environmentSounds.push({
            name,
            howl,
            volume,
            weight,
            cooldown,
            lastPlayed: -Infinity,
        });
    }

    setEnvironmentSources(positions) {
        this.environmentSources = positions.map(position =>
            position.clone
                ? position.clone()
                : new THREE.Vector3(
                    position.x,
                    position.y,
                    position.z
                )
        );
    }

    randomEnvironmentInterval() {
        return THREE.MathUtils.randFloat(
            this.minEnvironmentInterval,
            this.maxEnvironmentInterval
        );
    }

    chooseEnvironmentSound() {
        const available = this.environmentSounds.filter(sound => {
            const cooldownFinished =
                this.elapsedTime - sound.lastPlayed >= sound.cooldown;

            return (
                cooldownFinished &&
                sound.name !== this.lastEnvironmentSound
            );
        });

        if (!available.length) return null;

        const totalWeight = available.reduce(
            (sum, sound) => sum + sound.weight,
            0
        );

        let random = Math.random() * totalWeight;

        for (const sound of available) {
            random -= sound.weight;

            if (random <= 0) return sound;
        }

        return available[available.length - 1];
    }

    playEnvironmentSound(name = null) {
        if (
            !this.enabled ||
            !this.environmentSources.length ||
            this.activeEnvironmentSounds.size >=
                this.maxConcurrentEnvironmentSounds
        ) {
            return;
        }

        const sound = name
            ? this.environmentSounds.find(s => s.name === name)
            : this.chooseEnvironmentSound();

        if (!sound) return;

        if (
            this.elapsedTime - sound.lastPlayed < sound.cooldown
        ) {
            return;
        }

        const sourceIndex = THREE.MathUtils.randInt(
            0,
            this.environmentSources.length - 1
        );

        const position = this.environmentSources[sourceIndex];

        const volume = sound.volume *
            THREE.MathUtils.randFloat(0.65, 1);

        const id = sound.howl.play();

        sound.howl.volume(volume, id);

        sound.howl.pos(
            position.x,
            position.y,
            position.z,
            id
        );

        const activeId = `${sound.name}:${id}`;

        this.activeEnvironmentSounds.add(activeId);

        sound.howl.once('end', () => {
            this.activeEnvironmentSounds.delete(activeId);
        }, id);

        sound.lastPlayed = this.elapsedTime;
        this.lastEnvironmentSound = sound.name;
    }

    // --------------------------------------------------
    // 3D LISTENER
    // --------------------------------------------------

    updateListener(camera) {
        if (!camera) return;

        camera.getWorldPosition(this.listenerPosition);
        camera.getWorldDirection(this.listenerForward);
        camera.getWorldQuaternion(this.listenerQuaternion);

        this.listenerUp
            .set(0, 1, 0)
            .applyQuaternion(this.listenerQuaternion);

        Howler.pos(
            this.listenerPosition.x,
            this.listenerPosition.y,
            this.listenerPosition.z
        );

        Howler.orientation(
            this.listenerForward.x,
            this.listenerForward.y,
            this.listenerForward.z,
            this.listenerUp.x,
            this.listenerUp.y,
            this.listenerUp.z
        );
    }

    // --------------------------------------------------
    // UPDATE
    // --------------------------------------------------

    update(deltaTime, camera) {
        if (!this.enabled) return;

        this.updateListener(camera);

        this.elapsedTime += deltaTime;
        this.environmentTimer += deltaTime;

        if (this.environmentTimer >= this.nextEnvironmentTime) {
            this.playEnvironmentSound();

            this.environmentTimer = 0;
            this.nextEnvironmentTime =
                this.randomEnvironmentInterval();
        }
    }

    // --------------------------------------------------
    // GLOBAL CONTROLS
    // --------------------------------------------------

    setMasterVolume(volume) {
        this.masterVolume = THREE.MathUtils.clamp(volume, 0, 1);
        Howler.volume(this.masterVolume);
    }

    setEnabled(enabled) {
        this.enabled = enabled;

        if (!enabled) {
            this.stopAmbience(0);

            for (const sound of this.environmentSounds) {
                sound.howl.stop();
            }

            this.activeEnvironmentSounds.clear();
        } else {
            this.environmentTimer = 0;
            this.nextEnvironmentTime =
                this.randomEnvironmentInterval();
        }
    }

    stopAll() {
        this.stopAmbience(0);

        for (const sound of this.environmentSounds) {
            sound.howl.stop();
        }

        this.activeEnvironmentSounds.clear();
    }

    dispose() {
        this.stopAll();

        for (const { howl } of this.ambiences.values()) {
            howl.unload();
        }

        for (const sound of this.environmentSounds) {
            sound.howl.unload();
        }

        this.ambiences.clear();
        this.environmentSounds = [];
        this.environmentSources = [];
    }
}
