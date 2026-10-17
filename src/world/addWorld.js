
import * as THREE from 'three/webgpu';
import { addGround } from './ground';
import { addLantern } from './lantern';


export const addWorld = async (scene) => {
    addGround(scene);
    const lanternController = await addLantern(scene);

    return { lanternController };
}