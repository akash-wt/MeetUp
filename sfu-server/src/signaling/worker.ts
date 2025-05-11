import { createWorker } from 'mediasoup';
import { types as mediasoupTypes } from "mediasoup";
import os from "os"

let worker: mediasoupTypes.Worker;

export const createMediasoupWorker = async () => {


    worker = await createWorker({
        logLevel: 'debug',
        rtcMinPort: 6002,
        rtcMaxPort: 6202
    });


    const numWorkers = os.cpus().length;
    console.log(numWorkers + " worker can be created");

    console.log(`Worker PID: ${worker.pid}`);

    worker.on('died', () => {
        console.error('Mediasoup Worker died, exiting process...');
        process.exit(1);
    })
}

export const getWorker = () => worker;