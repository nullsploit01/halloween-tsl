import { createStartingRoom } from './createStartingRoom.js';
import { Hotel } from './Hotel.js';
import { addLantern } from './lantern';
import { WallCollisions } from './WallCollisions.js';

export const addWorld = async (scene, camera) => {
    const wallCollisions = new WallCollisions();

    const hotel = new Hotel(scene, {
        hallwayWidth: 7,
        hallwayHeight: 4.5,
        hallwayLength: 28,
        wallCollisions,
    });

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

    const { lantern, lanternLight } = await addLantern(camera, scene);

    return { lantern, lanternLight, hotel };
};
