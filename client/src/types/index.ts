import type { RefObject } from 'react';
import { types as mediasoupTypes } from "mediasoup-client"

export type RemoteStream = {
    producerId: string;
    stream: MediaStream;
    userName?: string;
    audioEnabled?: boolean;
    videoEnabled?: boolean;
};

export type VideoCallProps = {
    name: string;
    roomId: string
    localVideoRef: RefObject<HTMLVideoElement>;
    remoteStreams: RemoteStream[];
    onLeave: () => void;
    onToggleMic: (muted: boolean) => void;

};


export type ConsumeResponse = {
    id: string;
    kind: mediasoupTypes.MediaKind;
    rtpParameters: mediasoupTypes.RtpParameters;
    error?: string;
};

export type ParticipantView = {
    id: string;
    stream: MediaStream | null;
    name: string;
    isLocal: boolean;
    isMuted: boolean;
    isVideoOff: boolean;
};


export interface RecordingConfig {
    mimeType: string;
    videoBitsPerSecond: number;
    audioBitsPerSecond: number;
    chunkDurationMs: number;
}
