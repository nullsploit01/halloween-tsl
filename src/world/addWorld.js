import { Hotel } from './Hotel.js';
import { addLantern } from './lantern';

export const addWorld = async (scene, camera) => {
  const hotel = new Hotel(scene, {
    hallwayWidth: 7,
    hallwayHeight: 4.5,
    hallwayLength: 28,
  });
  const { lantern, lanternLight } = await addLantern(camera, scene);

  return { lantern, lanternLight, hotel };
};
