import { types as mediasoupTypes } from "mediasoup";

export const createWebRtcTransport = async (router: mediasoupTypes.Router) => {

    const listenIps = process.env.NODE_ENV === 'production'
        ? [{ ip: '0.0.0.0', announcedIp: 'YOUR_PUBLIC_IP' }]
        : [{ ip: '0.0.0.0' }];


    const transport = await router.createWebRtcTransport({
        listenIps,
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        initialAvailableOutgoingBitrate: 1000000
    });

    console.log(`Created WebRTC Transport: ${transport.id}`);

    transport.on('dtlsstatechange', (state: any) => {
        if (state === 'closed') {
            console.log(`Transport ${transport.id} closed`);
            transport.close();
        }
    });

    return transport;
};
