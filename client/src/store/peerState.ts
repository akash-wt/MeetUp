import { atom } from 'recoil';


export const userPeer = atom<string | null>({
    key: 'userPeer',
    default: null,
});


export const connectedPeers = atom<string[] | null>({
    key: 'connectedPeers',
    default: null,
});
