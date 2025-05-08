import { atom } from 'recoil';

export const currentRoomIdState = atom<string | null>({
    key: 'currentRoomId',
    default: null,
});

export const localStreamState = atom<MediaStream | null>({
    key: 'localStream',
    default: null,
});

export const remoteStreamsState = atom<MediaStream[]>({
    key: 'remoteStreams',
    default: [],   
});
