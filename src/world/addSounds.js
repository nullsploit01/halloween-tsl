import { SoundManager } from '../core/SoundManager';
import * as THREE from 'three/webgpu';

const soundManager = new SoundManager({
    minEnvironmentInterval: 15,
    maxEnvironmentInterval: 40,
    maxConcurrentEnvironmentSounds: 2,
    masterVolume: 0.8,
});

// Continuous ambience
soundManager.registerSound('creepy', '/sounds/ambience/creepy.mp3', {
    volume: 0.9,
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

soundManager.registerSound('look-behind-you-loud', '/sounds/environment/look-behind-you.mp3', {
    volume: 0.75,
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

soundManager.registerSound('walking', '/sounds/footsteps/walking.mp3', {
    volume: 0.2,
    positional: false,
});

soundManager.registerSound('running', '/sounds/footsteps/running.mp3', {
    volume: 0.2,
    positional: false,
});

soundManager.registerSound('heavyFootsteps', '/sounds/footsteps/heavy.mp3', {
    volume: 0.7,
    positional: false,
});

soundManager.registerSound('slow-walking', '/sounds/footsteps/slow-walking.mp3', {
    volume: 0.2,
    positional: false,
});

soundManager.registerSound('stalkerRunning', '/sounds/stalker/running.mp3', {
    volume: 0.4,
    positional: true,
});

soundManager.registerSound('stalkerWhisper', '/sounds/stalker/whisper.mp3', {
    volume: 0.2,
    positional: true,
});

soundManager.registerSound('stalkerWhisper2', '/sounds/stalker/whisper-2.mp3', {
    volume: 0.5,
    positional: true,
});

soundManager.registerSound('stalkerWhispers', '/sounds/stalker/whispers.mp3', {
    volume: 0.2,
    positional: true,
});

soundManager.registerSound('stalkerWhispersLoud', '/sounds/stalker/whispers.mp3', {
    volume: 0.7,
    positional: true,
});

soundManager.registerSound('junction-on', '/sounds/general/junction-on.mp3', {
    volume: 0.4,
    positional: false,
});

soundManager.registerSound('junction-press', '/sounds/general/junction-press.mp3', {
    volume: 0.4,
    positional: false,
});

export { soundManager };
