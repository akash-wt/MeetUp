import { useRecoilValue } from "recoil";
import socket from "../lib/socket";
import { transportState } from "../store/transportState";
import { currentDevice } from "../store/deviceState";
import { useState } from "react";
import { currentRoomIdState } from "../store/roomState";

export const useCreateSendTransport = () => {
    
    const transport = useRecoilValue(transportState);
    const device = useRecoilValue(currentDevice);
    const [producerId, setProducerId] = useState<string | null>(null);
    const roomId = useRecoilValue(currentRoomIdState);

    if (!device || !transport?.id || !transport.dtlsParameters || !transport.iceCandidates || !transport.iceParameters) {
        console.log("device or transport not found!");
        return;
    }
    const sendTransport = device.createSendTransport({
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
    });



    sendTransport.on("connect", ({ dtlsParameters }, callback, errBack) => {
        try {
            socket.emit("connectTransport", { transportId: sendTransport.id, dtlsParameters }, callback);
        } catch (e) {

            if (e instanceof Error) {
                errBack(e);
            }
            else {

                errBack(new Error("An error occurred while connecting send transport"));
            }
        }
    });

    sendTransport.on("produce", ({ kind, rtpParameters }, callback, errBack) => {
        try {
            socket.emit("produce", { roomId, transportId: sendTransport.id, kind, rtpParameters }, ({ id }: { id: string }) => {
                callback({ id });
                setProducerId(id)
                console.log("Producer ID:", id);
            });
        } catch (e) {

            if (e instanceof Error) {
                errBack(e);
            }
            else {
                errBack(new Error("An error occurred while producing"));
            }
        }
    });
    return { sendTransport, producerId };
}