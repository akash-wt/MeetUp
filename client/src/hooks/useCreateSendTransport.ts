import { Device } from "mediasoup-client";
import socket from "../lib/socket";
import { useState } from "react";
import { types as mediasoupTypes } from "mediasoup-client";

interface transportOptionsType {
    id: string;
    iceParameters: mediasoupTypes.IceParameters;
    iceCandidates: mediasoupTypes.IceCandidate[];
    dtlsParameters: mediasoupTypes.DtlsParameters;
    error: string;
}
interface CallbackResponse {
    error?: string;
}


const useCreateSendTransport = (device: Device | null, roomId: string) => {
    const [sendTransport, setSendTransport] =
        useState<mediasoupTypes.Transport | null>(null);

    const createSendTransport = () => {
        if (!device) {
            console.log("device not fount in sendTansport");
            return;
        }

        socket.emit(
            "createWebRtcTransport",
            { roomId },
            (transportOptions: transportOptionsType) => {
                if (transportOptions.error) {
                    console.error("Failed to create transport:", transportOptions.error);
                    return;
                }

                const transport = device.createSendTransport(transportOptions);

                transport.on("connect", ({ dtlsParameters }) => {
                    socket.emit(
                        "connectTransport",
                        {
                            roomId,
                            transportId: transportOptions.id,
                            dtlsParameters,
                        },
                        (response: CallbackResponse) => {
                            if (response?.error) {
                                console.error("Transport connection error:", response.error);

                            }
                        }
                    );
                });

                transport.on(
                    "produce",
                    ({ kind, rtpParameters }) => {

                        socket.emit(
                            "produce",
                            {
                                roomId,
                                transportId: transport.id,
                                kind,
                                rtpParameters,
                            },
                            (response: CallbackResponse) => {
                                if (response.error) {
                                    console.error("Produce error:", response.error);

                                }
                            }
                        );
                    }
                );

                setSendTransport(transport);
            }
        );
    };

    return { sendTransport, createSendTransport };
};

export default useCreateSendTransport;
