import { log } from 'console';
import { createWorker } from 'mediasoup';
import { types as mediasoupTypes } from "mediasoup";
import * as mediasoup from "mediasoup";

let worker: mediasoupTypes.Worker;

export const createMediasoupWorker = async () => {
    worker = await createWorker({
        logLevel: 'debug',
        rtcMinPort: 2000,
        rtcMaxPort: 2020
    });


    console.log(`Worker PID: ${worker.pid}`);
    worker.on('died', () => {
        console.error('Mediasoup Worker died, exiting process...');
        process.exit(1);
    })
}

export const getWorker = () => worker;