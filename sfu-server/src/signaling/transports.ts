import { types as mediasoupTypes } from "mediasoup";
import { webRtcTransport_options } from "../config";

export const createWebRtcTransport = async (router: mediasoupTypes.Router) => {

    const transport = await router.createWebRtcTransport({
        ...webRtcTransport_options
    });

    console.log(`Created WebRTC Transport: ${transport.id}`);
    
    transport.on('dtlsstatechange', (state: mediasoupTypes.DtlsState) => {
        if (state === 'closed') {
            console.log(`Transport ${transport.id} closed`);
            transport.close();
        }
    });

    return transport;
};
