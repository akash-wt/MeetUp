import { atom } from 'recoil';





export const connectedPeers = atom<string[] | null>({
    key: 'connectedPeers',
    default: null,
});
