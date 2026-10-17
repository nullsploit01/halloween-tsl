
import { addLantern } from './lantern';
import { Hotel } from './Hotel.js'

export const addWorld = async (scene, camera) => {
    const hotel = new Hotel(scene);
    const lanternController = await addLantern(camera, scene);

    return { lanternController, hotel };
}