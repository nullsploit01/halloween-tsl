
import * as THREE from 'three/webgpu';

const doorMaterial = new THREE.MeshStandardNodeMaterial({
    color: 0x49372b,
    roughness: 0.78,
    metalness: 0.0,
});

const frameMaterial = new THREE.MeshStandardNodeMaterial({
    color: 0x30251f,
    roughness: 0.82,
    metalness: 0.0,
});

const panelMaterial = new THREE.MeshStandardNodeMaterial({
    color: 0x392a22,
    roughness: 0.85,
    metalness: 0.0,
});

const handleMaterial = new THREE.MeshStandardNodeMaterial({
    color: 0x9b8052,
    roughness: 0.3,
    metalness: 0.65,
});

export function createHotelDoor(roomNumber = '214') {
    const door = new THREE.Group();

    const width = 1.35;
    const height = 3.0;
    const depth = 0.09;
    const frameWidth = 0.075;

    // Main door slab.
    const slab = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, depth),
        doorMaterial,
    );

    slab.position.y = height / 2;
    slab.castShadow = true;
    slab.receiveShadow = true;
    door.add(slab);

    // Frame posts.
    for (const x of [
        -width / 2 - frameWidth / 2,
        width / 2 + frameWidth / 2,
    ]) {
        const post = new THREE.Mesh(
            new THREE.BoxGeometry(frameWidth, height + 0.08, 0.14),
            frameMaterial,
        );

        post.position.set(x, height / 2, 0);
        post.castShadow = true;
        door.add(post);
    }

    // Frame header.
    const header = new THREE.Mesh(
        new THREE.BoxGeometry(width + frameWidth * 2, 0.09, 0.14),
        frameMaterial,
    );

    header.position.y = height + 0.04;
    door.add(header);

    // Two subtle raised/recessed-looking decorative panels.
    for (const { y, h } of [
        { y: 1.68, h: 0.72 },
        { y: 0.67, h: 0.78 },
    ]) {
        const panel = new THREE.Mesh(
            new THREE.BoxGeometry(width - 0.22, h, 0.018),
            panelMaterial,
        );

        panel.position.set(0, y, depth / 2 + 0.009);
        door.add(panel);

        // Fine border around each panel.
        const borderMaterial = frameMaterial;
        const borderDepth = 0.025;
        const borderThickness = 0.025;

        for (const side of [-1, 1]) {
            const border = new THREE.Mesh(
                new THREE.BoxGeometry(
                    borderThickness,
                    h + borderThickness,
                    borderDepth,
                ),
                borderMaterial,
            );

            border.position.set(
                side * (width / 2 - 0.11),
                y,
                depth / 2 + 0.018,
            );

            door.add(border);
        }
    }

    // Handle and backplate.
    const handlePlate = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, 0.18, 0.025),
        frameMaterial,
    );

    handlePlate.position.set(0.39, 1.0, depth / 2 + 0.02);
    door.add(handlePlate);

    const handle = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 12, 8),
        handleMaterial,
    );

    handle.position.set(0.39, 1.0, depth / 2 + 0.06);
    door.add(handle);

    // Room-number plaque above the handle area.
    const plaque = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.12, 0.025),
        handleMaterial,
    );

    plaque.position.set(0, 2.05, depth / 2 + 0.02);
    door.add(plaque);

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#9b8052';
    ctx.fillRect(0, 0, 128, 64);

    ctx.fillStyle = '#211912';
    ctx.font = 'bold 34px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(roomNumber), 64, 33);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const number = new THREE.Mesh(
        new THREE.PlaneGeometry(0.24, 0.09),
        new THREE.MeshBasicNodeMaterial({
            map: texture,
            toneMapped: false,
        }),
    );

    number.position.set(0, 2.05, depth / 2 + 0.036);
    door.add(number);

    return door;
}
