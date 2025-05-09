import { useSetRecoilState } from "recoil";
import { currentRoomIdState } from "../store/roomState";
import socket from "../lib/socket";
import { getMediasoupDevice } from "../lib/mediasoup";
import useCreateRoom from "./useCreateRoom";

const useJoinRoom = () => {
    const roomId = useCreateRoom();
    console.log(roomId);


    const joinRoom = async (roomId: string) => {
        
        return new Promise(async (resolve, reject) => {
            socket.emit("joinRoom", roomId, async (response) => {
                if ("error" in response) {
                    reject(response.error);
                    return;
                }



                const device = await getMediasoupDevice(response.rtpCapabilities);
                resolve(device);
            });
        });
    };

    return joinRoom;
};

export default useJoinRoom;
