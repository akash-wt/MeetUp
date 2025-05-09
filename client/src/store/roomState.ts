import { atom } from 'recoil';
import { types as mediasoupTypes } from 'mediasoup-client';

export const currentRoomIdState = atom<string | null>({
    key: 'currentRoomIdState',
    default: null,
});

export const rtpCapabilitiesState = atom<mediasoupTypes.RtpCapabilities | null>({
    key: 'rtpCapabilitiesState',
    default: null,
});
