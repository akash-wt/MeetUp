import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import * as mediasoupClient from "mediasoup-client";
import { nanoid } from "nanoid";

const SERVER_URL = "http://localhost:5080";
const ROOM_ID = nanoid(5);

export default function Room() {
    const [socket, setSocket] = useState(null);
    const [device, setDevice] = useState(null);
    const [producer, setProducer] = useState(null);
    const [consumer, setConsumer] = useState(null);
    const [producerTransport, setProducerTransport] = useState(null);
    const [consumerTransport, setConsumerTransport] = useState(null);

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);

    useEffect(() => {
        let isMounted = true;
       
        
        const socket = io(SERVER_URL);
        setSocket(socket);

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

            // Join room and get RTP capabilities from server router
            socket.emit("joinRoom", ROOM_ID, async (response) => {
                if (response.error) {
                    console.error("joinRoom error:", response.error);
                    return;
                }
                const { rtpCapabilities } = response;

                // Create mediasoup device and load RTP capabilities
                const device = new mediasoupClient.Device();
                await device.load({ routerRtpCapabilities: rtpCapabilities });
                if (!isMounted) return;
                setDevice(device);

                // Get user media (video only here)
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: false,
                });
                if (!isMounted) return;
                localVideoRef.current.srcObject = stream;

                // Create Producer Transport (send)
                socket.emit(
                    "createWebRtcTransport",
                    { roomId: ROOM_ID, direction: "send" },
                    async (transportOptions) => {
                        if (transportOptions.error) {
                            console.error("createWebRtcTransport (send) error:", transportOptions.error);
                            return;
                        }

                        const sendTransport = device.createSendTransport(transportOptions);

                        sendTransport.on("connect", ({ dtlsParameters }, callback, errback) => {
                            socket.emit(
                                "connectTransport",
                                {
                                    roomId: ROOM_ID,
                                    transportId: sendTransport.id,
                                    direction: "send",
                                    dtlsParameters,
                                },
                                (res) => {
                                    if (res?.error) {
                                        errback(res.error);
                                        return;
                                    }
                                    callback();
                                }
                            );
                        });

                        sendTransport.on("produce", async ({ kind, rtpParameters }, callback, errback) => {
                            socket.emit(
                                "produce",
                                {
                                    roomId: ROOM_ID,
                                    transportId: sendTransport.id,
                                    kind,
                                    rtpParameters,
                                },
                                ({ id, error }) => {
                                    if (error) {
                                        errback(error);
                                        return;
                                    }
                                    callback({ id });
                                }
                            );
                        });

                        if (!isMounted) return;
                        setProducerTransport(sendTransport);

                        // Produce video track
                        const track = stream.getVideoTracks()[0];
                        const producer = await sendTransport.produce({ track });
                        if (!isMounted) return;
                        setProducer(producer);

                        // Now create Consumer Transport (recv)
                        socket.emit(
                            "createWebRtcTransport",
                            { roomId: ROOM_ID, direction: "recv" },
                            async (recvTransportOptions) => {
                                if (recvTransportOptions.error) {
                                    console.error("createWebRtcTransport (recv) error:", recvTransportOptions.error);
                                    return;
                                }

                                const recvTransport = device.createRecvTransport(recvTransportOptions);

                                recvTransport.on("connect", ({ dtlsParameters }, callback, errback) => {
                                    socket.emit(
                                        "connectTransport",
                                        {
                                            roomId: ROOM_ID,
                                            transportId: recvTransport.id,
                                            direction: "recv",
                                            dtlsParameters,
                                        },
                                        (res) => {
                                            if (res?.error) {
                                                errback(res.error);
                                                return;
                                            }
                                            callback();
                                        }
                                    );
                                });

                                if (!isMounted) return;
                                setConsumerTransport(recvTransport);

                                // Consume the producer we just created (loopback)
                                socket.emit(
                                    "consume",
                                    {
                                        roomId: ROOM_ID,
                                        transportId: recvTransport.id,
                                        producerId: producer.id,
                                        rtpCapabilities: device.rtpCapabilities,
                                    },
                                    async (consumeResponse) => {
                                        if (consumeResponse.error) {
                                            console.error("consume error:", consumeResponse.error);
                                            return;
                                        }

                                        const { id, kind, rtpParameters, producerId } = consumeResponse;

                                        const consumer = await recvTransport.consume({
                                            id,
                                            producerId,
                                            kind,
                                            rtpParameters,
                                        });
                                        if (!isMounted) return;
                                        setConsumer(consumer);

                                        const remoteStream = new MediaStream();
                                        remoteStream.addTrack(consumer.track);
                                        remoteVideoRef.current.srcObject = remoteStream;

                                        // Tell server to resume this consumer
                                        socket.emit("consumerResume", { roomId: ROOM_ID, consumerId: consumer.id }, () => { });
                                    }
                                );
                            }
                        );
                    }
                );
            });
        }

        init();

        return () => {
            isMounted = false;
            cleanUp();
            socket.disconnect();
            setSocket(null);
            setDevice(null);
            setProducer(null);
            setConsumer(null);
            setProducerTransport(null);
            setConsumerTransport(null);
        };
    }, []);

    return (
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
    );
}
