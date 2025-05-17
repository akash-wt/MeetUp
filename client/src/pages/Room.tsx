import { useParams, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useEffect, useRef, useState, useCallback } from "react";
import socket from "../lib/socket";
import { types as mediasoupTypes } from "mediasoup-client";
import { useJoinRoom } from "../hooks/joinRoom";
import { useCreateSendTransport } from "../hooks/useCreateSendTransport";
import { useCreateRecvTransport } from "../hooks/useCreateRecvTransport";

type ConsumeResponse = {
    id: string;
    kind: mediasoupTypes.MediaKind;
    rtpParameters: mediasoupTypes.RtpParameters;
    error?: string;
};

export default function Room() {
    const location = useLocation();
    const { roomId } = useParams<{ roomId: string }>();
    const name = (location.state as { name?: string })?.name || "user";

    const [producer, setProducer] = useState<mediasoupTypes.Producer | null>(null);
    const [producerTransport, setProducerTransport] = useState<mediasoupTypes.Transport | null>(null);
    const [consumerTransport, setConsumerTransport] = useState<mediasoupTypes.Transport | null>(null);
    const [device, setDevice] = useState<mediasoupTypes.Device | null>(null);

    const [remoteStreams, setRemoteStreams] = useState<{ producerId: string; stream: MediaStream }[]>([]);

    const localVideoRef = useRef<HTMLVideoElement | null>(null);

    const { joinRoom } = useJoinRoom();
    const { createSendTransport } = useCreateSendTransport();
    const { createRecTransport } = useCreateRecvTransport();

    // To avoid stale closures inside consume callback
    const consumerTransportRef = useRef(consumerTransport);
    const deviceRef = useRef(device);
    consumerTransportRef.current = consumerTransport;
    deviceRef.current = device;

    // Ref for consume function to call inside socket callbacks
    const consumeRef = useRef<(producerId: string) => void>();

    const consume = useCallback(async (producerId: string) => {
        const consumerTransport = consumerTransportRef.current;
        const device = deviceRef.current;

        if (!consumerTransport || !device) {
            console.error("Consumer transport or device missing");
            return;
        }

        if (remoteStreams.find((s) => s.producerId === producerId)) {
            console.log(`Already consuming producer ${producerId}`);
            return;
        }

        socket.emit(
            "consume",
            {
                roomId,
                transportId: consumerTransport.id,
                producerId,
                rtpCapabilities: device.rtpCapabilities,
            },
            async (consumeResponse: ConsumeResponse) => {
                if (consumeResponse.error) {
                    console.error("Consume error:", consumeResponse.error);
                    return;
                }

                const { id, kind, rtpParameters } = consumeResponse;

                const newConsumer = await consumerTransport.consume({
                    id,
                    producerId,
                    kind,
                    rtpParameters,
                });

                await newConsumer.resume();

                const remoteStream = new MediaStream();
                remoteStream.addTrack(newConsumer.track);

                setRemoteStreams((prev) => [...prev, { producerId, stream: remoteStream }]);

                console.log("Consumed stream from producer:", producerId);
            }
        );
    }, [roomId, remoteStreams]);

    consumeRef.current = consume;

    // Setup socket event listeners once
    useEffect(() => {
        const handleNewProducer = ({ producerId }: { producerId: string }) => {
            console.log("New producer detected:", producerId);
            consumeRef.current?.(producerId);
        };

        const handleProducerLeft = ({ producerId }: { producerId: string }) => {
            console.log("Producer left:", producerId);
            setRemoteStreams((prev) => prev.filter(({ producerId: id }) => id !== producerId));
        };

        socket.on("connect", () => console.log("Connected to server"));
        socket.on("disconnect", () => console.log("Disconnected from server"));
        socket.on("newProducer", handleNewProducer);
        socket.on("producerLeft", handleProducerLeft);

        return () => {
            socket.off("connect");
            socket.off("disconnect");
            socket.off("newProducer", handleNewProducer);
            socket.off("producerLeft", handleProducerLeft);
        };
    }, []);

    // Run setup only once per roomId
    const initialized = useRef(false);

    useEffect(() => {
        if (initialized.current) return;
        if (!roomId) {
            toast.info("Room not Found!");
            return;
        }
        initialized.current = true;

        async function setup() {
            const joinedDevice = await joinRoom(roomId);
            if (!joinedDevice) {
                console.error("Device not found");
                return;
            }
            setDevice(joinedDevice);

            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            const sendTransport = await createSendTransport(roomId, "send", joinedDevice);
            if (sendTransport) setProducerTransport(sendTransport);

            const videoTrack = stream.getVideoTracks()[0];
            if (sendTransport && videoTrack) {
                const produced = await sendTransport.produce({ track: videoTrack });
                if (produced) setProducer(produced);
            }

            const recvTransport = await createRecTransport(roomId, "recv", joinedDevice);
            if (recvTransport) setConsumerTransport(recvTransport);

            if (recvTransport) {
                socket.emit("getProducers", roomId, ({ producerIds }: { producerIds: string[] }) => {
                    producerIds.forEach((id) => {
                        if (id !== producer?.id) consumeRef.current?.(id);
                    });
                });
            }
        }

        setup();
    }, [roomId, joinRoom, createSendTransport, createRecTransport, producer]);

    return (
        <div>
            <div>Name: {name}</div>
            <div>Room Id: {roomId}</div>

            <div>
                <h2>Local Video</h2>
                <video ref={localVideoRef} autoPlay playsInline muted style={{ width: "300px" }} />

                <div>
                    <h2>Remote Videos</h2>
                    {remoteStreams.map(({ producerId, stream }) => (
                        <video
                            key={producerId}
                            autoPlay
                            playsInline
                            style={{ width: "300px", margin: "0 10px" }}
                            ref={(videoEl) => {
                                if (videoEl) {
                                    videoEl.srcObject = stream;
                                }
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
