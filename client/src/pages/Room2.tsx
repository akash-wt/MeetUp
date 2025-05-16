import { useParams, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import socket from "../lib/socket";
import { types as mediasoupTypes } from "mediasoup-client";
import * as mediasoupClient from "mediasoup-client";


export default function Room2() {
    const location = useLocation();
    const { name } = location.state || "user";
    const { roomId } = useParams();

    // const [device, setDevice] = useState(null);
    const [producer, setProducer] = useState<mediasoupTypes.Producer | null>(
        null
    );
    const [consumer, setConsumer] = useState<mediasoupTypes.Consumer | null>(
        null
    );
    const [producerTransport, setProducerTransport] =
        useState<mediasoupTypes.Transport | null>(null);
    const [consumerTransport, setConsumerTransport] =
        useState<mediasoupTypes.Transport | null>(null);
    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

    if (!roomId) {
        toast.info("Room not Found! ");
    }

    useEffect(() => {
        let isMounted = true;

        async function cleanUp() {
            try {
                if (producerTransport) await producerTransport.close();
                if (consumerTransport) await consumerTransport.close();
                if (producer) await producer.close();
                if (consumer) await consumer.close();
            } catch (err) {
                console.warn("Error during cleanup:", err);
            }
        }

        async function init() {
            socket.on("connect", () => console.log("Connected to server"));

            socket.on("disconnect", () => {
                console.log("Disconnected from server");
            });

            socket.emit(
                "joinRoom",
                roomId,
                async (
                    response:
                        | { rtpCapabilities: mediasoupTypes.RtpCapabilities }
                        | { error: string }
                ) => {
                    if ("error" in response) {
                        console.error("joinRoom error:", response.error);
                        return;
                    }
                    const { rtpCapabilities } = response;

                    const device = new mediasoupClient.Device();
                    await device.load({ routerRtpCapabilities: rtpCapabilities });

                    if (!isMounted) return;


                    const stream = await navigator.mediaDevices.getUserMedia({
                        video: true,
                        audio: false,
                    });

                    if (!isMounted) return;

                    if (localVideoRef.current) {
                        localVideoRef.current.srcObject = stream;
                    }
                    socket.emit(
                        "createWebRtcTransport",
                        { roomId: roomId, direction: "send" },
                        async (
                            response:
                                | {
                                    id: string;
                                    iceParameters: mediasoupTypes.IceParameters;
                                    iceCandidates: mediasoupTypes.IceCandidate[];
                                    dtlsParameters: mediasoupTypes.DtlsParameters;
                                }
                                | { error?: string }
                        ) => {
                            if ("error" in response) {
                                console.error(
                                    "createWebRtcTransport (send) error:",
                                    response.error
                                );
                                return;
                            }

                            //@ts-expect-error asdnak
                            const sendTransport = device.createSendTransport(response);

                            sendTransport.on(
                                "connect",
                                ({ dtlsParameters }, callback, errback) => {
                                    socket.emit(
                                        "connectTransport",
                                        {
                                            roomId: roomId,
                                            transportId: sendTransport.id,
                                            direction: "send",
                                            dtlsParameters,
                                        },

                                        (res: any) => {
                                            if (res?.error) {
                                                errback(res.error);
                                                return;
                                            }
                                            callback();
                                        }
                                    );
                                }
                            );

                            sendTransport.on(
                                "produce",
                                async ({ kind, rtpParameters }, callback, errback) => {
                                    socket.emit(
                                        "produce",
                                        {
                                            roomId: roomId,
                                            transportId: sendTransport.id,
                                            kind,
                                            rtpParameters,
                                        },
                                        ({ id, error }: { id: string; error: any }) => {
                                            if (error) {
                                                errback(error);
                                                return;
                                            }
                                            callback({ id });
                                        }
                                    );
                                }
                            );

                            if (!isMounted) return;

                            //   if (!sendTransport) {
                            //     console.log("send transport not found");
                            //     return;
                            //   }
                            setProducerTransport(sendTransport);

                            // Produce video track
                            const track = stream.getVideoTracks()[0];

                            const producer = await sendTransport.produce({ track });
                            if (!isMounted) return;

                            setProducer(producer);

                            // Now create Consumer Transport (recv)
                            socket.emit(
                                "createWebRtcTransport",
                                { roomId: roomId, direction: "recv" },
                                async (recvTransportOptions: any) => {
                                    if (recvTransportOptions.error) {
                                        console.error(
                                            "createWebRtcTransport (recv) error:",
                                            recvTransportOptions.error
                                        );
                                        return;
                                    }

                                    const recvTransport = device.createRecvTransport(recvTransportOptions);

                                    recvTransport.on(
                                        "connect",
                                        ({ dtlsParameters }, callback, errback) => {
                                            socket.emit(
                                                "connectTransport",
                                                {
                                                    roomId: roomId,
                                                    transportId: recvTransport.id,
                                                    direction: "recv",
                                                    dtlsParameters,
                                                },
                                                (res: any) => {
                                                    if (res?.error) {
                                                        errback(res.error);
                                                        return;
                                                    }
                                                    callback();
                                                }
                                            );
                                        }
                                    );

                                    if (!isMounted) return;
                                    setConsumerTransport(recvTransport);

                                    // Consume the producer we just created (loopback)
                                    socket.emit(
                                        "consume",
                                        {
                                            roomId: roomId,
                                            transportId: recvTransport.id,
                                            producerId: producer.id,
                                            rtpCapabilities: device.rtpCapabilities,
                                        },
                                        async (consumeResponse: any) => {
                                            if (consumeResponse.error) {
                                                console.error("consume error:", consumeResponse.error);
                                                return;
                                            }

                                            const { id, kind, rtpParameters, producerId } =
                                                consumeResponse;

                                            const consumer = await recvTransport.consume({
                                                id,
                                                producerId,
                                                kind,
                                                rtpParameters,
                                            });
                                            if (!isMounted) return;
                                            setConsumer(consumer);
                                            consumer.resume()
                                            const remoteStream = new MediaStream();
                                            remoteStream.addTrack(consumer.track);

                                            if (remoteVideoRef.current) {
                                                remoteVideoRef.current.srcObject = remoteStream;
                                            }

                                            // Tell server to resume this consumer
                                            // socket.emit(
                                            //     "consumerResume",
                                            //     { roomId: roomId, consumerId: consumer.id },
                                            //     () => { }
                                            // );
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );
        }

        init();

        return () => {
            isMounted = false;
            cleanUp();
            socket.disconnect();
            setProducer(null);
            setConsumer(null);
            setProducerTransport(null);
            setConsumerTransport(null);
        };
    }, []);

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
    );
}
