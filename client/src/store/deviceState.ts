import { atom } from 'recoil';
import { types as mediasoupTypes } from 'mediasoup-client';

export const currentDevice = atom<mediasoupTypes.Device | null>({
    key: 'currentDevice',
    default: null,
});
