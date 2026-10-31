
import { Howl, Howler } from 'howler';
import * as THREE from 'three/webgpu';

export class SoundManager {
    constructor({
        minEnvironmentInterval = 15,
        maxEnvironmentInterval = 40,
        maxConcurrentEnvironmentSounds = 2,
        masterVolume = 1,
    } = {}) {
        this.sounds = new Map();
        this.activeSounds = new Map();

        this.masterVolume = masterVolume;
        this.enabled = true;

        this.minEnvironmentInterval = minEnvironmentInterval;
        this.maxEnvironmentInterval = maxEnvironmentInterval;
        this.maxConcurrentEnvironmentSounds = maxConcurrentEnvironmentSounds;

        this.environmentSources = [];
        this.activeEnvironmentSounds = new Set();

        this.environmentTimer = 0;
        this.nextEnvironmentTime = this.randomEnvironmentInterval();

        this.elapsedTime = 0;
        this.lastEnvironmentSound = null;

        this.listenerPosition = new THREE.Vector3();
        this.listenerForward = new THREE.Vector3();
        this.listenerUp = new THREE.Vector3();
        this.listenerQuaternion = new THREE.Quaternion();

        Howler.volume(masterVolume);
    }

    // SOUND REGISTRATION

    registerSound(name, src, options = {}) {
        if (this.sounds.has(name)) {
            this.unregisterSound(name);
        }

        const howl = new Howl({
            src: Array.isArray(src) ? src : [src],
            preload: true,
            volume: options.volume ?? 1,
            loop: options.loop ?? false,
            rate: options.rate ?? 1,
            html5: options.html5 ?? false,
            pannerAttr: {
                panningModel: 'HRTF',
                distanceModel: 'inverse',
                refDistance: options.refDistance ?? 2,
                rolloffFactor: options.rolloffFactor ?? 1,
                maxDistance: options.maxDistance ?? 25,
            },
        });

        this.sounds.set(name, {
            howl,
            volume: options.volume ?? 1,
            loop: options.loop ?? false,
            positional: options.positional ?? false,
            weight: options.weight ?? 1,
            cooldown: options.cooldown ?? 0,
            lastPlayed: -Infinity,
        });

        return howl;
    }

    unregisterSound(name) {
        const sound = this.sounds.get(name);

        if (!sound) return;

        sound.howl.stop();
        sound.howl.unload();

        this.sounds.delete(name);
    }

    // GENERIC PLAYBACK

    playSound(name, options = {}) {
        if (!this.enabled) return null;

        const sound = this.sounds.get(name);

        if (!sound) {
            console.warn(`Sound "${name}" is not registered.`);
            return null;
        }

        if (
            options.respectCooldown &&
            this.elapsedTime - sound.lastPlayed < sound.cooldown
        ) {
            return null;
        }

        if (options.positional && !options.position) {
            console.warn(`Sound "${name}" requires a position.`);
            return null;
        }

        const id = sound.howl.play();

        const volume = options.volume ?? sound.volume;
        const rate = options.rate ?? sound.howl.rate();

        sound.howl.volume(options.fadeIn ? 0 : volume, id);
        sound.howl.rate(rate, id);
        sound.howl.loop(options.loop ?? sound.loop, id);

        if (options.positional) {
            sound.howl.pos(
                options.position.x,
                options.position.y,
                options.position.z,
                id
            );
        }

        if (options.stereo !== undefined) {
            sound.howl.stereo(options.stereo, id);
        }

        if (options.seek !== undefined) {
            sound.howl.seek(options.seek, id);
        }

        if (options.fadeIn) {
            sound.howl.fade(0, volume, options.fadeIn, id);
        }

        if (options.onEnd) {
            sound.howl.once('end', options.onEnd, id);
        }

        const activeId = `${name}:${id}`;

        this.activeSounds.set(activeId, {
            name,
            id,
            howl: sound.howl,
        });

        sound.lastPlayed = this.elapsedTime;

        sound.howl.once('end', () => {
            this.activeSounds.delete(activeId);
            this.activeEnvironmentSounds.delete(activeId);
        }, id);

        if (options.environment) {
            this.activeEnvironmentSounds.add(activeId);
            this.lastEnvironmentSound = name;
        }

        return id;
    }

    // SOUND CONTROL

    stopSound(name, id) {
        const sound = this.sounds.get(name);

        if (!sound) return;

        if (id !== undefined) {
            sound.howl.stop(id);
            this.activeSounds.delete(`${name}:${id}`);
            this.activeEnvironmentSounds.delete(`${name}:${id}`);
        } else {
            sound.howl.stop();

            for (const [activeId, active] of this.activeSounds) {
                if (active.name === name) {
                    this.activeSounds.delete(activeId);
                    this.activeEnvironmentSounds.delete(activeId);
                }
            }
        }
    }

    fadeSound(name, id, from, to, duration) {
        const sound = this.sounds.get(name);

        if (!sound) return;

        sound.howl.fade(from, to, duration, id);
    }

    // ENVIRONMENTAL RANDOM PLAYBACK

    setEnvironmentSources(positions) {
        this.environmentSources = positions.map(position =>
            position.clone
                ? position.clone()
                : new THREE.Vector3(position.x, position.y, position.z)
        );
    }

    randomEnvironmentInterval() {
        return THREE.MathUtils.randFloat(
            this.minEnvironmentInterval,
            this.maxEnvironmentInterval
        );
    }

    playRandomEnvironmentSound() {
        if (
            !this.enabled ||
            !this.environmentSources.length ||
            this.activeEnvironmentSounds.size >= this.maxConcurrentEnvironmentSounds
        ) {
            return null;
        }

        const available = [...this.sounds.entries()]
            .filter(([name, sound]) => {
                return (
                    sound.positional &&
                    sound.weight > 0 &&
                    this.elapsedTime - sound.lastPlayed >= sound.cooldown &&
                    name !== this.lastEnvironmentSound
                );
            });

        if (!available.length) return null;

        const totalWeight = available.reduce(
            (sum, [, sound]) => sum + sound.weight,
            0
        );

        let random = Math.random() * totalWeight;
        let selected = available[available.length - 1];

        for (const entry of available) {
            random -= entry[1].weight;

            if (random <= 0) {
                selected = entry;
                break;
            }
        }

        const [name] = selected;

        const position = this.environmentSources[
            THREE.MathUtils.randInt(0, this.environmentSources.length - 1)
        ];

        return this.playSound(name, {
            positional: true,
            position,
            volume: selected[1].volume * THREE.MathUtils.randFloat(0.65, 1),
            environment: true,
        });
    }

    // 3D LISTENER

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

    // UPDATE

    update(deltaTime, camera) {
        if (!this.enabled) return;

        this.updateListener(camera);

        this.elapsedTime += deltaTime;
        this.environmentTimer += deltaTime;

        if (this.environmentTimer >= this.nextEnvironmentTime) {
            this.playRandomEnvironmentSound();

            this.environmentTimer = 0;
            this.nextEnvironmentTime = this.randomEnvironmentInterval();
        }
    }

    // GLOBAL CONTROLS

    setMasterVolume(volume) {
        this.masterVolume = THREE.MathUtils.clamp(volume, 0, 1);
        Howler.volume(this.masterVolume);
    }

    setEnabled(enabled) {
        this.enabled = enabled;

        if (!enabled) {
            this.stopAll();
        } else {
            this.environmentTimer = 0;
            this.nextEnvironmentTime = this.randomEnvironmentInterval();
        }
    }

    stopAll() {
        for (const sound of this.sounds.values()) {
            sound.howl.stop();
        }

        this.activeSounds.clear();
        this.activeEnvironmentSounds.clear();
    }

    pauseAll() {
        Howler.pause();
    }

    resumeAll() {
        if (this.enabled) {
            Howler.resume();
        }
    }

    dispose() {
        this.stopAll();

        for (const sound of this.sounds.values()) {
            sound.howl.unload();
        }

        this.sounds.clear();
        this.environmentSources = [];
    }
}
