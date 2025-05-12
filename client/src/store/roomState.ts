import { atom } from 'recoil';

export const currentRoomIdState = atom<string | null>({
    key: 'currentRoomIdState',
    default: null,
});

