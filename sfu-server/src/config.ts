import { types as mediasoupTypes } from "mediasoup"

export const mediaCodecs: mediasoupTypes.RtpCodecCapability[] = [
    {
        kind: "audio",
        mimeType: "audio/opus",
        clockRate: 48000,
        channels: 2,
    },
    {
        kind: "video",
        mimeType: "video/VP8",
        clockRate: 90000,
        parameters: {},
    },
]


export const webRtcTransport_options: mediasoupTypes.WebRtcTransportOptions = {
    listenIps:[
                {
                    ip: process.env.WEBRTC_LISTEN_IP || '127.0.0.1',
                    announcedIp: process.env.WEBRTC_ANNOUNCED_IP || '127.0.0.1',
                },
            ],

    enableUdp: true,
    enableTcp: true,
    preferUdp: true,

};

