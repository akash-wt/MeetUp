import socket from "../lib/socket";
import { Device } from "mediasoup-client";
import { types as mediasoupTypes } from "mediasoup-client";

export function useJoinRoom() {
    
    async function joinRoom(roomId: string) {
        const response: { rtpCapabilities: mediasoupTypes.RtpCapabilities } | { error: string } = await new Promise((resolve) => {
            socket.emit("joinRoom", roomId, resolve);
        });

        if ("error" in response) {
            console.error("joinRoom error:", response.error);
            return null;
        }
        const { rtpCapabilities } = response;
        const device = new Device();
        await device.load({ routerRtpCapabilities: rtpCapabilities });
        return device;
    }

    return { joinRoom };
}
