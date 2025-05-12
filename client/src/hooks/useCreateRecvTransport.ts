import { useRecoilValue } from "recoil";
import socket from "../lib/socket";
import { transportState } from "../store/transportState";
import { currentDevice } from "../store/deviceState";

export const useCreateRecvTransport = () => {

    const transport = useRecoilValue(transportState);
    const device = useRecoilValue(currentDevice);

    if (!device || !transport?.id || !transport.dtlsParameters || !transport.iceCandidates || !transport.iceParameters) {
        console.log("device or transport not found!");
        return;
    }

    const recvTransport = device.createRecvTransport({
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
    });


    recvTransport.on("connect", ({ dtlsParameters }, callback, errBack) => {
        try {
            socket.emit("connectTransport", { transportId: recvTransport.id, dtlsParameters }, callback);
        } catch (e) {
            if (e instanceof Error) {
                errBack(e);
            }
            else {
                errBack(new Error("An error occurred while connecting recv transport"));
            }
        }
    });

    return recvTransport;

}
