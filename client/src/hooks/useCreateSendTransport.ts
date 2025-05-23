import socket from '../lib/socket';
import { createTransport } from './createTransport';
import { types as mediasoupTypes } from "mediasoup-client";


type TransportResponse = {
    id: string;
    iceParameters: mediasoupTypes.IceParameters;
    iceCandidates: mediasoupTypes.IceCandidate[];
    dtlsParameters: mediasoupTypes.DtlsParameters;
};

export const useCreateSendTransport = () => {



    async function createSendTransport(roomId: string, direction: "send" | "recv", device: mediasoupTypes.Device) {

        const response: TransportResponse = await createTransport(roomId, direction)

        if (!device) {
            console.log("device not found");
            return;
        }

        console.log(response);

        const sendTransport = device.createSendTransport(response);

        sendTransport.on(
            "connect",
            ({ dtlsParameters }, callback, errback) => {
                socket.emit(
                    "connectTransport",
                    {
                        roomId: roomId,
                        transportId: sendTransport.id,
                        direction: "send",
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

        sendTransport.on(
            "produce",
            async ({ kind, rtpParameters }, callback, errback) => {
                socket.emit(
                    "produce",
                    {
                        roomId: roomId,
                        transportId: sendTransport.id,
                        kind,
                        rtpParameters,
                    },
                    ({ id, error }: { id: string; error: string }) => {
                        if (error) {
                            errback(new Error(error));
                            return;
                        }
                        callback({ id });
                    }
                );
            }
        );
        return sendTransport

    }

    return { createSendTransport };


};
