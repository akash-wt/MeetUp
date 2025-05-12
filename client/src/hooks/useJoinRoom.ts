import socket from "../lib/socket";
import { getMediasoupDevice } from "../lib/mediasoup";
import useCreateRoomId from "../hooks/useCreateRoomId";
import { types as mediasoupTypes } from "mediasoup-client";
import { useSetRecoilState } from "recoil";
import { currentRoomIdState } from "../store/roomState";
import { currentDevice } from "../store/deviceState";
import { userPeer } from "../store/peerState";

export function useJoinRoom() {
    const roomId = useCreateRoomId();
    const roomState = useSetRecoilState(currentRoomIdState);
    const deviceState = useSetRecoilState(currentDevice);
    const userPeerState = useSetRecoilState(userPeer);


    async function createRoom() {
        if (!socket.id) {
            console.error("socket id is undefined in useJoinRoom");
            return;
        }
        else if (socket.id) {
            userPeerState(socket.id);
        }

        socket.emit("joinRoom", roomId, async (rtpCapabilities: mediasoupTypes.RtpCapabilities) => {
            const device = await getMediasoupDevice(rtpCapabilities);
            deviceState(device);
            roomState(roomId);
        });

    }

    return createRoom;
}

