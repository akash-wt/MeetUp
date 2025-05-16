import { useRecoilValue } from 'recoil';
import { currentDevice } from '../store/deviceState';
import socket from '../lib/socket';
import { useState } from 'react';
import { currentRoomIdState } from '../store/roomState';
import { useTransport } from './useCreateTransport';


export const useCreateSendTransport = () => {
    const roomId = useRecoilValue(currentRoomIdState);
    const device = useRecoilValue(currentDevice);
    const [producerId, setProducerId] = useState<string | null>(null);
    const createSendTransportOnServer = useTransport(roomId!);

    const createSendTransport = async () => {
        const transport = await createSendTransportOnServer();
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

        const sendTransport = device.createSendTransport({
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: JSON.parse(JSON.stringify(transport.dtlsParameters)),
        });
        console.log("sendTransport ", sendTransport.id);

        sendTransport.on("connect", ({ dtlsParameters }, callback, errBack) => {
            try {

                console.log(sendTransport.id);

                socket.emit("connectTransport", { roomId, transportId: sendTransport.id, dtlsParameters }, () => {
                    console.log("Send transport connected successfully.");
                    callback();
                });
            } catch (e) {
                errBack(e instanceof Error ? e : new Error("An error occurred while connecting send transport"));
            }
        });


        sendTransport.on("produce", ({ kind, rtpParameters }, callback, errBack) => {
            try {
                socket.emit(
                    "produce",
                    { roomId, transportId: sendTransport.id, kind, rtpParameters },
                    ({ id }: { id: string }) => {
                        callback({ id });
                        setProducerId(id);
                    }
                );
            } catch (e) {
                errBack(e instanceof Error ? e : new Error("An error occurred while producing"));
            }
        });

        return sendTransport;
    };

    return { producerId, createSendTransport };
};
