import { createStartingRoom } from './createStartingRoom.js';
import { Hotel } from './Hotel.js';
import { JunctionBox } from './JunctionBox.js';
import { addLantern } from './lantern';
import { addNightVisionCamera } from './nightVisionCamera.js';
import { WallCollisions } from './WallCollisions.js';

export const addWorld = async (scene, camera, onProgress = () => {}) => {
    const wallCollisions = new WallCollisions();

    onProgress(5, 'PREPARING HOTEL...');

    await Promise.all([
        document.fonts.load('190px "BloodieCurse-Regular"'),
        document.fonts.load('190px "Scary Witch"'),
        document.fonts.load('190px "Shade Whisper"'),
        document.fonts.load('190px "SlimeRage-Splatter"'),
    ]);

    onProgress(20, 'LOADING HOTEL STRUCTURE...');

    const hotel = new Hotel(scene, {
        hallwayWidth: 4,
        hallwayHeight: 4.5,
        hallwayLength: 28,
        wallCollisions,
    });

    const junctionBox = new JunctionBox();

    hotel.openStartEntrance('south');

    const startingRoom = createStartingRoom({
        scene,
        entrancePosition: hotel.getStartNode().position,
        direction: 'south',
        wallCollisions,
        ...hotel.getRoomConfig(),
    });

    camera.position.copy(startingRoom.spawnPosition);
    camera.lookAt(startingRoom.doorwayLookAt);

    onProgress(50, 'PREPARING LIGHTING...');

    const lantern = await addLantern(camera, scene);

    onProgress(70, 'PREPARING NIGHT VISION...');

    const nightVisionCamera = await addNightVisionCamera(camera);

    onProgress(85, 'HOTEL STRUCTURE READY...');

    return {
        hotel,
        junctionBox,
        nightVisionCamera,
        lantern: lantern.lantern,
        lanternLight: lantern.lanternLight,
        setLanternVisible: lantern.setVisible,
    };
};
