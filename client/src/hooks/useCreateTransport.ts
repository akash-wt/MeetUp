import socket from "../lib/socket";
import { types as mediasoupTypes } from "mediasoup-client";


type TransportResponse = Partial<{
    id: string;
    iceParameters: mediasoupTypes.IceParameters;
    iceCandidates: mediasoupTypes.IceCandidate[];
    dtlsParameters: mediasoupTypes.DtlsParameters;
}>;


export function useTransport(roomId: string) {

    const createTransport = (): Promise<TransportResponse | null> => {
        return new Promise((resolve, reject) => {
            socket.emit("createWebRtcTransport", { roomId }, (trnasport: TransportResponse) => {
                if (trnasport.id) {
                    resolve(trnasport);
                    return trnasport
                }
                else {
                    reject("Transport creation failed");
                }
            });
        });
    }

    return createTransport;
}


