import { useRecoilValue } from 'recoil';
import { currentDevice } from '../store/deviceState';
import socket from '../lib/socket';
import { currentRoomIdState } from '../store/roomState';
import { useTransport } from './useCreateTransport';



export const useCreateRecvTransport = () => {
    const roomId = useRecoilValue(currentRoomIdState);
    const device = useRecoilValue(currentDevice);
    const createRecvTransportOnServer = useTransport(roomId!);


    const createRecvTransport = async () => {
        const transport = await createRecvTransportOnServer();
        console.log("Producer Transport", transport);

        if (
            !device ||
            !transport?.id ||
            !transport.dtlsParameters ||
            !transport.iceCandidates ||
            !transport.iceParameters
        ) {
            console.log("Device or transport not found!");
            return;
        }

        const recvTransport = device.createRecvTransport({
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: JSON.parse(JSON.stringify(transport.dtlsParameters)),
        });

        recvTransport.on("connect", ({ dtlsParameters }, callback, errBack) => {
            try {
                socket.emit("connectTransport", { transportId: recvTransport.id, dtlsParameters }, callback);
            } catch (e) {
                errBack(e instanceof Error ? e : new Error("An error occurred while connecting recv transport"));
            }
        });

        return recvTransport;
    };

    return { createRecvTransport };
};
