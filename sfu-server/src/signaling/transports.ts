import { types as mediasoupTypes } from "mediasoup";
import { webRtcTransport_options } from "../config";

export const createWebRtcTransport = async (router: mediasoupTypes.Router) => {

    // const transport = await router.createWebRtcTransport({
    //     ...webRtcTransport_options
    // });
    const transport = await router.createWebRtcTransport({
        listenIps: [{ ip: "192.168.240.135" }],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
    });

    transport.on("icestatechange", (state) =>
        console.log(`Transport ${transport.id} ICE state: ${state}`)
    );
    
    console.log(`Created WebRTC Transport: ${transport.id}`);

    transport.on('dtlsstatechange', (state: mediasoupTypes.DtlsState) => {
        if (state === 'closed') {
            console.log(`Transport ${transport.id} closed`);
            transport.close();
        }
    });

    return transport;
};
