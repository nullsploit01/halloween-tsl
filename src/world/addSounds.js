import { SoundManager } from '../core/SoundManager';
import * as THREE from 'three/webgpu';

const soundManager = new SoundManager({
    minEnvironmentInterval: 15,
    maxEnvironmentInterval: 40,
    maxConcurrentEnvironmentSounds: 2,
    masterVolume: 0.8,
});

// Continuous ambience
soundManager.registerSound('creepy', '/sounds/ambience/creepy-2.mp3', {
    volume: 0.3,
    loop: true,
});

soundManager.registerSound('ventilation', '/sounds/ambience/ventilation.mp3', {
    volume: 0.6,
    loop: true,
});

soundManager.registerSound('lightBuzz', '/sounds/ambience/light-buzz.mp3', {
    volume: 0.4,
    loop: true,
});

// Random environmental sounds
soundManager.registerSound('door-creak', '/sounds/environment/door-creak.mp3', {
    volume: 0.25,
    positional: true,
    weight: 3,
    cooldown: 20,
});

soundManager.registerSound('look-behind-you', '/sounds/environment/look-behind-you.mp3', {
    volume: 0.35,
    positional: true,
    weight: 1,
    cooldown: 45,
});

soundManager.registerSound('i-see-you-whisper', '/sounds/environment/i-see-you-whisper.mp3', {
    volume: 0.2,
    positional: true,
    weight: 1,
    cooldown: 60,
});

// General sound effects
soundManager.registerSound('woosh', '/sounds/general/woosh.mp3', {
    volume: 0.2,
    positional: false,
});

soundManager.setEnvironmentSources([
    new THREE.Vector3(0, 2, -12),
    new THREE.Vector3(5, 1.5, -20),
    new THREE.Vector3(-5, 1.5, -18),
    new THREE.Vector3(12, 1.5, 0),
]);

export { soundManager };
