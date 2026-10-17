
import { addLantern } from './lantern';
import { Hotel } from './Hotel.js'

export const addWorld = async (scene, camera) => {
    const hotel = new Hotel(scene);
    const lantern = await addLantern(camera, scene);

    return { lantern, hotel };
}