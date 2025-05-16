import { getWorker } from './worker';
import { types as mediasoupTypes } from "mediasoup";
import { mediaCodecs } from '../config';

const rooms = new Map<string, mediasoupTypes.Router>();

export const GetRoom = async (roomId: string): Promise<mediasoupTypes.Router> => {

    if (rooms.has(roomId)) return rooms.get(roomId)!;

    const worker = await getWorker();
    const router = await worker.createRouter({ mediaCodecs });
    rooms.set(roomId, router);

    console.log(`Room created: ${roomId}`);
    return router;
};
