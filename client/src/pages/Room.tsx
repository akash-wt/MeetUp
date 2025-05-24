import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { useEffect, useRef, useState, useCallback } from "react";
import socket from "../lib/socket";
import { types as mediasoupTypes } from "mediasoup-client";
import { useJoinRoom } from "../hooks/joinRoom";
import { useCreateSendTransport } from "../hooks/useCreateSendTransport";
import { useCreateRecvTransport } from "../hooks/useCreateRecvTransport";
import VideoCall from "../components/VideoCall";
import { useNavigate } from "react-router-dom";
import type { ConsumeResponse } from "../types";


export default function Room() {

    const { roomId } = useParams<{ roomId: string }>();

    const user = localStorage.getItem("user")
    const userData = user ? JSON.parse(user) : null;


    const navigate = useNavigate();

    const [producer, setProducer] = useState<mediasoupTypes.Producer | null>(null);
    const [consumerTransport, setConsumerTransport] = useState<mediasoupTypes.Transport | null>(null);
    const [device, setDevice] = useState<mediasoupTypes.Device | null>(null);

    const [remoteStreams, setRemoteStreams] = useState<{ producerId: string; stream: MediaStream }[]>([]);

    const localVideoRef = useRef<HTMLVideoElement | null>(null);

    const { joinRoom } = useJoinRoom();
    const { createSendTransport } = useCreateSendTransport();
    const { createRecTransport } = useCreateRecvTransport();

    const consumerTransportRef = useRef(consumerTransport);
    const deviceRef = useRef(device);
    consumerTransportRef.current = consumerTransport;
    deviceRef.current = device;

    const consumeRef = useRef<(producerId: string) => void>(null);

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

                newConsumer.resume();

                const remoteStream = new MediaStream();
                remoteStream.addTrack(newConsumer.track);

                setRemoteStreams((prev) => [...prev, { producerId, stream: remoteStream }]);

                console.log("Consumed stream from producer:", producerId);
            }
        );
    }, [roomId, remoteStreams]);

    consumeRef.current = consume;

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

    const initialized = useRef(false);

    useEffect(() => {
        if (initialized.current) return;
        if (!roomId) {
            toast.info("Room not Found!");
            return;
        }
        initialized.current = true;

        async function setup() {

            if (!roomId) {
                {
                    console.log("room not found");
                    return
                }
            }
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


    const handleLeave = () => {
        socket.disconnect();
        producer?.close();
        navigate("/");
    };


    const handleToggleMic = (muted: boolean) => {
        if (localVideoRef.current && localVideoRef.current.srcObject) {
            const stream = localVideoRef.current.srcObject as MediaStream;
            stream.getAudioTracks().forEach((track) => {
                track.enabled = !muted;
            });
        }
    };

    return (
        <VideoCall
            name={userData.name}
            roomId={roomId || ""}
            localVideoRef={localVideoRef as React.RefObject<HTMLVideoElement>}
            remoteStreams={remoteStreams}
            onLeave={handleLeave}
            onToggleMic={handleToggleMic}

        />
    );
}
