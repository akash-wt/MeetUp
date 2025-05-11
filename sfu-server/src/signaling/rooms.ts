// import { router } from 'mediasoup';
import { getWorker } from './worker';
import { types as mediasoupTypes } from "mediasoup";
import { mediaCodecs } from '../config';

const rooms = new Map<string, mediasoupTypes.Router>();

export const createRoom = async (roomId: string) => {
    if (rooms.has(roomId)) return rooms.get(roomId);
    const worker = getWorker();
    const router = await worker.createRouter({ mediaCodecs });
    rooms.set(roomId, router);
    console.log(`Room created: ${roomId}`);
    return router;
};

export const getRoom = (roomId: string) => rooms.get(roomId);
