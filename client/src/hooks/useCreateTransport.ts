import socket from "../lib/socket";
import { types as mediasoupTypes } from "mediasoup-client";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { transportState } from "../store/transportState";

type TransportResponse = Partial<{
    id: string;
    iceParameters: mediasoupTypes.IceParameters;
    iceCandidates: mediasoupTypes.IceCandidate[];
    dtlsParameters: mediasoupTypes.DtlsParameters;
    peerId: string;
}>;


export function useTransport(roomId: string, userPeerId: string) {
    const CurrTransportValue = useRecoilValue(transportState);
    const crrTransportState = useSetRecoilState(transportState);


    const createTransport = (): Promise<TransportResponse | null> => {
        return new Promise((resolve, reject) => {
            if (CurrTransportValue) {
                resolve(CurrTransportValue);
                return CurrTransportValue
            }
            else if (!CurrTransportValue) {
                socket.emit("createWebRtcTransport", { roomId, peerId: userPeerId }, (trnasport: TransportResponse) => {
                    if (trnasport.id) {
                        crrTransportState(trnasport);
                        console.log("Trasnport created ", trnasport);

                        resolve(trnasport);
                        return trnasport
                    }
                    else {
                        reject("Transport creation failed");
                    }
                });
            }
        });
    }

    return createTransport;
}


