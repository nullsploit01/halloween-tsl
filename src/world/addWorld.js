import { createStartingRoom } from './createStartingRoom.js';
import { Hotel } from './Hotel.js';
import { JunctionBox } from './JunctionBox.js';
import { addLantern } from './lantern';
import { WallCollisions } from './WallCollisions.js';
import { addNightVisionCamera } from './nightVisionCamera.js';

export const addWorld = async (scene, camera) => {
    const wallCollisions = new WallCollisions();
    await Promise.all([
        document.fonts.load('190px "Special Elite"'),
        document.fonts.load('190px "Caveat"'),
        document.fonts.load('190px "Permanent Marker"'),
    ]);
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

    const lantern = await addLantern(camera, scene);
    const nightVisionCamera = await addNightVisionCamera(camera);

    return {
        hotel,
        junctionBox,
        nightVisionCamera,
        lantern: lantern.lantern,
        lanternLight: lantern.lanternLight,
        setLanternVisible: lantern.setVisible,
    };
};
