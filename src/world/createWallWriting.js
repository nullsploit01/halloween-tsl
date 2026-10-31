
import * as THREE from 'three/webgpu';

const WITCH_PHRASES = [
    "SHE IS STILL HERE",
    "DO NOT LET HER SEE YOU",
    "SHE WALKS THESE HALLS",
    "SHE KNOWS WHEN YOU ARE AWAKE",
    "NEVER FOLLOW HER VOICE",
    "SHE DOES NOT SLEEP",
    "SHE IS NOT ONE OF THE GUESTS",
    "DO NOT LOOK AT HER FACE",
    "SHE COMES WHEN THE LIGHTS DIE",
    "SHE IS CLOSER THAN YOU THINK",
    "IF YOU HEAR HER, HIDE",
    "SHE KNOWS YOUR ROOM",
    "DO NOT LET HER IN",
    "SHE IS WAITING IN THE DARK",
    "WE SAW HER IN THE MIRROR",
];

const HOTEL_PHRASES = [
    "WELCOME BACK, GUEST",
    "YOUR ROOM IS NOT EMPTY",
    "DO NOT ENTER ROOM 09",
    "THE ELEVATOR IS OUT OF SERVICE",
    "PLEASE REMAIN IN YOUR ROOM",
    "CHECKOUT IS NOT AVAILABLE",
    "DO NOT USE THE SERVICE ELEVATOR",
    "THE NIGHT STAFF NEVER LEAVES",
    "SOME ROOMS MUST REMAIN LOCKED",
    "YOUR KEY WILL NOT SAVE YOU",
    "THE RECEPTION IS CLOSED",
    "DO NOT KNOCK AFTER MIDNIGHT",
    "GUESTS MUST NOT WANDER AT NIGHT",
    "THE CORRIDORS HAVE CHANGED",
    "THERE ARE NO VACANT ROOMS",
];

const GUEST_PHRASES = [
    "I HEARD HER OUTSIDE MY ROOM",
    "SHE WAS AT THE END OF THE HALL",
    "I LOCKED THE DOOR. SHE CAME IN",
    "THE LIGHTS KEEP GOING OUT",
    "I SAW HER ON THE STAIRS",
    "SHE WAS STANDING BESIDE MY BED",
    "I CANNOT FIND THE RECEPTION",
    "EVERY DOOR LEADS BACK HERE",
    "I HEARD FOOTSTEPS ABOVE ME",
    "SHE WAS WEARING MY FACE",
    "I SHOULD HAVE LEFT LAST NIGHT",
    "THE ELEVATOR BROUGHT ME BACK",
    "I CAN HEAR HER SCRATCHING",
    "SHE KNOWS I AM HIDING",
    "IF YOU FIND THIS, LEAVE",
];

const SHORT_PHRASES = [
    "SHE IS HERE",
    "HIDE",
    "NOT ROOM 09",
    "KEEP QUIET",
    "DONT OPEN",
    "SHE HEARS YOU",
    "RUN",
    "LOCK THE DOOR",
    "NOT SAFE",
    "TOO LATE",
    "STAY INSIDE",
    "NO EXIT",
    "SHE FOUND ME",
    "LIGHTS OUT",
    "DONT TURN",
];

const PHRASE_GROUPS = {
    witch: WITCH_PHRASES,
    hotel: HOTEL_PHRASES,
    guest: GUEST_PHRASES,
    short: SHORT_PHRASES,
};

function getRandomPhrase() {
    const groups = Object.keys(PHRASE_GROUPS);

    const weights = [0.35, 0.25, 0.30, 0.10];

    const roll = Math.random();

    let cumulative = 0;

    for (let i = 0; i < groups.length; i++) {
        cumulative += weights[i];

        if (roll <= cumulative) {
            const phrases = PHRASE_GROUPS[groups[i]];

            return phrases[
                Math.floor(Math.random() * phrases.length)
            ];
        }
    }

    return "SHE IS HERE";
}

const WRITING_STYLES = [
    {
        font: 'BloodieCurse-Regular',
        color: '#bcb3a0',
        weight: 'normal',
        opacity: 0.78,
        size: 0.85,
        rotation: 0.012,
    },
    {
        font: 'Scary Witch',
        color: '#c1b49c',
        weight: '700',
        opacity: 0.85,
        size: 1.1,
        rotation: 0.045,
    },
    {
        font: 'Shade Whisper',
        color: '#a49a87',
        weight: 'normal',
        opacity: 0.72,
        size: 0.95,
        rotation: 0.025,
    },
    {
        font: 'SlimeRage-Splatter',
        color: '#743b34',
        weight: 'normal',
        opacity: 0.85,
        size: 1.0,
        rotation: 0.018,
    },
];


export function createWallWriting({
    text = null,
    width = 2.4,
    height = 0.55,
    color = null,
    styleIndex = null,
} = {}) {
    const phrase = text ?? getRandomPhrase();

    const selectedStyle = styleIndex !== null
        ? WRITING_STYLES[styleIndex]
        : WRITING_STYLES[
            Math.floor(Math.random() * WRITING_STYLES.length)
        ];

    const writingColor = color ?? selectedStyle.color;

    const canvas = document.createElement('canvas');

    canvas.width = 2048;
    canvas.height = 512;

    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const rotation = THREE.MathUtils.randFloat(
        -selectedStyle.rotation,
        selectedStyle.rotation
    );

    ctx.save();

    ctx.translate(1024, 256);
    ctx.rotate(rotation);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let fontSize = 190 * selectedStyle.size;

    const setFont = (size) => {
        ctx.font = `${selectedStyle.weight} ${size}px "${selectedStyle.font}"`;
    };

    setFont(fontSize);

    while (
        ctx.measureText(phrase).width > 1850 &&
        fontSize > 55
    ) {
        fontSize -= 4;
        setFont(fontSize);
    }

    ctx.fillStyle = writingColor;
    ctx.globalAlpha = selectedStyle.opacity;

    ctx.shadowColor = writingColor;
    ctx.shadowBlur = 1.5;

    ctx.fillText(phrase, 0, 0);

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.16;

    for (let i = 0; i < 90; i++) {
        const x = THREE.MathUtils.randFloat(-900, 900);
        const y = THREE.MathUtils.randFloat(-130, 130);

        ctx.fillRect(
            x,
            y,
            THREE.MathUtils.randFloat(1, 5),
            THREE.MathUtils.randFloat(1, 3)
        );
    }

    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);

    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;

    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 1,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
    });

    const geometry = new THREE.PlaneGeometry(width, height);

    const mesh = new THREE.Mesh(geometry, material);

    mesh.userData.phrase = phrase;
    mesh.userData.texture = texture;
    mesh.userData.phase = Math.random() * Math.PI * 2;

    mesh.userData.baseOpacity = THREE.MathUtils.randFloat(
        0.65,
        0.95
    );

    mesh.userData.flickerSpeed = THREE.MathUtils.randFloat(5, 12);
    mesh.userData.flickerThreshold = THREE.MathUtils.randFloat(0.96, 0.995);

    mesh.userData.flickerEnabled = Math.random() < 0.35;
    mesh.userData.style = selectedStyle.font;

    mesh.userData.animationOffset = Math.random() * 10;

    return mesh;
}


export function updateWallWriting(writing, elapsedTime) {
    const data = writing.userData;

    const time = elapsedTime + data.phase;

    let opacity =
        data.baseOpacity +
        Math.sin(time * 1.1) * 0.06;

    if (data.flickerEnabled) {
        const flicker = Math.sin(time * data.flickerSpeed);

        if (flicker > data.flickerThreshold) {
            opacity *= 0.25;
        }
    }

    writing.material.opacity = THREE.MathUtils.clamp(
        opacity,
        0,
        1
    );
}

// --------------------------------------------------
// DISPOSE WALL WRITING
// --------------------------------------------------

export function disposeWallWriting(writing) {
    writing.geometry.dispose();
    writing.material.map?.dispose();
    writing.material.dispose();
}
