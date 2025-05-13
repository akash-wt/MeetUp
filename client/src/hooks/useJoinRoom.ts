import socket from "../lib/socket";
import { getMediasoupDevice } from "../lib/mediasoup";
import useCreateRoomId from "../hooks/useCreateRoomId";
import { types as mediasoupTypes } from "mediasoup-client";
import { useSetRecoilState } from "recoil";
import { currentRoomIdState } from "../store/roomState";
import { currentDevice } from "../store/deviceState";


export function useJoinRoom() {
    const roomId = useCreateRoomId();
    const roomState = useSetRecoilState(currentRoomIdState);
    const deviceState = useSetRecoilState(currentDevice);

    async function joinRoom() {
        return new Promise<mediasoupTypes.Device>((resolve, reject) => {
            if (!socket.id) {
                console.error("socket id is undefined in useJoinRoom");
                reject("No socket id");
                return;
            }
            socket.emit("joinRoom", roomId, async (rtpCapabilities: mediasoupTypes.RtpCapabilities) => {
                try {
                    const device = await getMediasoupDevice(rtpCapabilities);
                    deviceState(device);
                    roomState(roomId);
                    resolve(device);
                } catch (err) {
                    reject(err);
                }
            });
        });
    }

    return joinRoom;
}

