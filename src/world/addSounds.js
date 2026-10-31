import { SoundManager } from "../core/SoundManager";

const soundManager = new SoundManager({
    minEnvironmentInterval: 15,
    maxEnvironmentInterval: 40,
    maxConcurrentEnvironmentSounds: 2,
    masterVolume: 0.8,
});

soundManager.addAmbience(
    'creepy',
    '/sounds/ambience/creepy-1.mp3',
    0.3
);

soundManager.addAmbience(
    'ventilation',
    '/sounds/ambience/ventilation.mp3',
    0.6
);

soundManager.addAmbience(
    'lightBuzz',
    '/sounds/ambience/light-buzz.mp3',
    0.4
);

soundManager.addEnvironmentSound({
    name: 'door-creak',
    src: '/sounds/environment/door-creak.mp3',
    volume: 0.25,
    weight: 3,
    cooldown: 20,
});

soundManager.addEnvironmentSound({
    name: 'look-behind-you',
    src: '/sounds/environment/look-behind-you.mp3',
    volume: 0.35,
    weight: 1,
    cooldown: 45,
});

soundManager.addEnvironmentSound({
    name: 'i-see-you-whisper',
    src: '/sounds/environment/i-see-you-whisper.mp3',
    volume: 0.2,
    weight: 1,
    cooldown: 60,
});

soundManager.setEnvironmentSources([
    new THREE.Vector3(0, 2, -12),
    new THREE.Vector3(5, 1.5, -20),
    new THREE.Vector3(-5, 1.5, -18),
    new THREE.Vector3(12, 1.5, 0),
]);

export { soundManager };