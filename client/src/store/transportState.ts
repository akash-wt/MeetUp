import { atom } from 'recoil';

import { types as mediasoupTypes } from "mediasoup-client";

type TransportResponse = Partial<{
    id: string;
    iceParameters: mediasoupTypes.IceParameters;
    iceCandidates: mediasoupTypes.IceCandidate[];
    dtlsParameters: mediasoupTypes.DtlsParameters;
    peerId: string;
}>;



export const transportState = atom<TransportResponse | null>({
    key: 'transportState',
    default: null,
});

