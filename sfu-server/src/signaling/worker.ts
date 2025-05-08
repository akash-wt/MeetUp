import { createWorker } from 'mediasoup';
import { types as mediasoupTypes } from "mediasoup";

let worker: mediasoupTypes.Worker;

export const createMediasoupWorker = async () => {
    worker = await createWorker({
        logLevel: 'debug',
        rtcMaxPort: 49999,
        rtcMinPort: 40000
    });

    console.log(`Worker PID: ${worker.pid}`);

    worker.on('died', () => {
        console.error('Mediasoup Worker died, exiting process...');
        process.exit(1);
    })
}
 
export const getWorker = () => worker;