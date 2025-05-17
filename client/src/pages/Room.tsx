import { useParams, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import socket from "../lib/socket";
import { types as mediasoupTypes } from "mediasoup-client";
import { useJoinRoom } from "../hooks/joinRoom";
import { useCreateSendTransport } from "../hooks/useCreateSendTransport";
import { useCreateRecvTransport } from "../hooks/useCreateRecvTransport";

export default function Room() {

    const location = useLocation();
    const { name } = location.state || "user";
    const { roomId } = useParams();

    const [producer, setProducer] = useState<mediasoupTypes.Producer | null>(null);
    const [consumer, setConsumer] = useState<mediasoupTypes.Consumer | null>(null);
    const [producerTransport, setProducerTransport] = useState<mediasoupTypes.Transport | null>(null);
    const [consumerTransport, setConsumerTransport] = useState<mediasoupTypes.Transport | null>(null);

    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
    const { joinRoom } = useJoinRoom();


    const { createSendTransport } = useCreateSendTransport();
    const { createRecTransport } = useCreateRecvTransport();


    socket.on("connect", () => console.log("Connected to server"));

    socket.on("disconnect", () => {
        console.log("Disconnected from server");
    });

    useEffect(() => {
        if (!roomId) {
            toast.info("Room not Found!");
        }


        async function init() {

            const device: mediasoupTypes.Device | null = await joinRoom(roomId || "test-123");
            console.log(device);


            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }
            if (!device) {
                console.log("device not found ");
                return
            }

            const sendTransport = await createSendTransport(roomId!, "send", device);
            if (sendTransport) {
                setProducerTransport(sendTransport);
            }

            const track = stream.getVideoTracks()[0];

            const producer = await sendTransport?.produce({ track });
            if (producer) {
                setProducer(producer);
            }
            const recvTransport = await createRecTransport(roomId!, "recv",device);

            if (recvTransport) {
                setConsumerTransport(recvTransport);
            }

            if (!recvTransport?.id && !producer?.id) {
                console.log("recvT not found ");
                return;
            }


            socket.emit(
                "consume",
                {
                    roomId: roomId,
                    transportId: recvTransport?.id,
                    producerId: producer?.id,
                    rtpCapabilities: device.rtpCapabilities,
                },

                async (consumeResponse: any) => {
                    if (consumeResponse.error) {
                        console.error("consume error:", consumeResponse.error);
                        return;
                    }

                    const { id, kind, rtpParameters, producerId } =
                        consumeResponse;


                    if (!recvTransport) {
                        console.log("recvT not found");

                        return

                    }
                    const consumer = await recvTransport.consume({
                        id,
                        producerId,
                        kind,
                        rtpParameters,
                    });

                    setConsumer(consumer);
                    consumer.resume()

                    const remoteStream = new MediaStream();
                    remoteStream.addTrack(consumer.track);

                    if (remoteVideoRef.current) {
                        remoteVideoRef.current.srcObject = remoteStream;
                    }

                }
            );

        }
        init();

    }, [roomId])

    return (
        <div>
            <div>Name {name}</div>
            <div>Room Id {roomId}</div>

            <div>
                <h2>Local Video</h2>
                <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: "300px" }}
                />

                <h2>Remote Video</h2>
                <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    style={{ width: "300px" }}
                />
            </div>
        </div>
    )
}