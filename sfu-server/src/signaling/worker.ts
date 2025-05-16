import { createWorker } from 'mediasoup';
import { types as mediasoupTypes } from 'mediasoup';

let worker: mediasoupTypes.Worker | undefined = undefined;

export const getWorker = async (): Promise<mediasoupTypes.Worker> => {

    if (worker) return worker;

    worker = await createWorker({
        logLevel: 'debug',
        rtcMinPort: 2000,
        rtcMaxPort: 2020,
    });

    console.log(`Worker PID: ${worker.pid}`);

    worker.on('died', () => {
        console.error('Mediasoup Worker died, exiting process...');
        process.exit(1);
    });

    return worker;
};

