// import { router } from 'mediasoup';
import { getWorker } from './worker';
import { types as mediasoupTypes } from "mediasoup";

type RouterType = mediasoupTypes.Router;

const rooms = new Map<string, RouterType>();

const mediaCodecs:mediasoupTypes.RtpCodecCapability[] = [
    {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2,
    },
    {
        kind: 'video',
        mimeType: 'video/VP8',
        clockRate: 90000,
        parameters: {
            'x-google-start-bitrate': 1000,
        },
    },
]

export const createRoom = async (roomId: string) => {
    if (rooms.has(roomId)) return rooms.get(roomId);

    const worker = getWorker();
    const router = await worker.createRouter({ mediaCodecs });

    rooms.set(roomId, router);
    console.log(`Room created: ${roomId}`);

    return router;
};


export const getRoom = (roomId: string) => rooms.get(roomId);
