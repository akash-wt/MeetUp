import socket from "../lib/socket";
import { types as mediasoupTypes } from "mediasoup-client";


type TransportResponse = {
    id: string;
    iceParameters: mediasoupTypes.IceParameters;
    iceCandidates: mediasoupTypes.IceCandidate[];
    dtlsParameters: mediasoupTypes.DtlsParameters;
};

export function createTransport(roomId: string, direction: "send" | "recv"): Promise<TransportResponse> {
    return new Promise((resolve, reject) => {
        socket.emit(
            "createWebRtcTransport",
            { roomId, direction },
            (response: TransportResponse | { error?: string }) => {
                if ("error" in response) {
                    console.error("createWebRtcTransport error:", response.error);
                    reject(new Error(response.error));
                    return;
                }
                resolve(response as TransportResponse);
            }
        );
    });
}



