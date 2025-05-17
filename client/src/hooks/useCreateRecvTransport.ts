import socket from '../lib/socket';
import { createTransport } from './createTransport';
import { types as mediasoupTypes } from "mediasoup-client";

type TransportResponse = {
    id: string;
    iceParameters: mediasoupTypes.IceParameters;
    iceCandidates: mediasoupTypes.IceCandidate[];
    dtlsParameters: mediasoupTypes.DtlsParameters;
};

export const useCreateRecvTransport = () => {

    const createRecTransport = async (roomId: string, direction: "send" | "recv", device: mediasoupTypes.Device) => {

        const response: TransportResponse = await createTransport(roomId, direction);

        if (!device) {
            console.log("Device not found");
            return

        }

        const recvTransport = device.createRecvTransport(response);
        console.log(recvTransport);

        recvTransport.on(
            "connect",
            ({ dtlsParameters }, callback, errback) => {
                socket.emit(
                    "connectTransport",
                    {
                        roomId: roomId,
                        transportId: recvTransport.id,
                        direction: "recv",
                        dtlsParameters,
                    },
                    (res: { error?: string }) => {
                        if (res?.error) {
                            errback(new Error(res.error));
                            return;
                        }
                        callback();
                    }
                );
            }
        );

        return recvTransport;
    };

    return { createRecTransport };
};
