import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import * as mediasoupClient from "mediasoup-client";

const SERVER_URL = "http://localhost:5080";
const ROOM_ID = "test-room";

export default function Room() {
    const [socket, setSocket] = useState(null);
    const [device, setDevice] = useState(null);
    const [producer, setProducer] = useState(null);
    const [consumer, setConsumer] = useState(null);
    const [producerTransport, setProducerTransport] = useState(null);
    const [consumerTransport, setConsumerTransport] = useState(null);
    const localVideoRef = useRef();
    const remoteVideoRef = useRef();

    useEffect(() => {
        async function init() {
            const socket = io(SERVER_URL);
            setSocket(socket);

            socket.on("connect", () => console.log("Connected to server"));

            // Join room and get router RTP capabilities
            socket.emit("joinRoom", ROOM_ID, async ({ rtpCapabilities, error }) => {
                if (error) {
                    console.error(error);
                    return;
                }

                // Create mediasoup device
                const device = new mediasoupClient.Device();
                await device.load({ routerRtpCapabilities: rtpCapabilities });
                setDevice(device);

                // Get user media (webcam)
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                localVideoRef.current.srcObject = stream;

                // Create producer transport
                socket.emit("createWebRtcTransport", { roomId: ROOM_ID, direction: "send" }, async (transportOptions) => {
                    if (transportOptions.error) {
                        console.error(transportOptions.error);
                        return;
                    }

                    const transport = device.createSendTransport(transportOptions);

                    transport.on("connect", ({ dtlsParameters }, callback, errback) => {
                        socket.emit("connectTransport", { roomId: ROOM_ID, dtlsParameters, direction: "send" }, (res) => {
                            if (res?.error) return errback(res.error);
                            callback();
                        });
                    });

                    transport.on("produce", async ({ kind, rtpParameters }, callback, errback) => {
                        socket.emit("produce", { roomId: ROOM_ID, kind, rtpParameters }, ({ id, error }) => {
                            if (error) return errback(error);
                            callback({ id });
                        });
                    });

                    setProducerTransport(transport);

                    // Produce video track
                    const track = stream.getVideoTracks()[0];
                    const producer = await transport.produce({ track });
                    setProducer(producer);

                    // Now create consumer transport to consume our own video (loopback)
                    socket.emit("createWebRtcTransport", { roomId: ROOM_ID, direction: "recv" }, async (consumerTransportOptions) => {
                        if (consumerTransportOptions.error) {
                            console.error(consumerTransportOptions.error);
                            return;
                        }

                        const recvTransport = device.createRecvTransport(consumerTransportOptions);

                        recvTransport.on("connect", ({ dtlsParameters }, callback, errback) => {
                            socket.emit("connectTransport", { roomId: ROOM_ID, dtlsParameters, direction: "recv" }, (res) => {
                                if (res?.error) return errback(res.error);
                                callback();
                            });
                        });

                        setConsumerTransport(recvTransport);

                        // Consume the producer we just created
                        socket.emit("consume", {
                            roomId: ROOM_ID,
                            producerId: producer.id,
                            rtpCapabilities: device.rtpCapabilities,
                        }, async ({ id, kind, rtpParameters, producerId, error }) => {
                            if (error) {
                                console.error(error);
                                return;
                            }

                            const consumer = await recvTransport.consume({ id, producerId, kind, rtpParameters });
                            setConsumer(consumer);

                            const remoteStream = new MediaStream();
                            remoteStream.addTrack(consumer.track);
                            remoteVideoRef.current.srcObject = remoteStream;
                            socket.emit("consumerResume", { roomId: ROOM_ID, consumerId: consumer.id }, () => { });
                        });
                    });
                });
            });
        }

        init();

        return () => {
            if (socket) socket.disconnect();
        };
    }, []);

    return (
        <div>
            <h2>Mediasoup Simple Producer & Consumer</h2>
            <div>
                <h3>Local Video (Producer)</h3>
                <video ref={localVideoRef} autoPlay playsInline  style={{ width: 320, height: 240, backgroundColor: "#000" }} />
            </div>
            <div>
                <h3>Remote Video (Consumer)</h3>
                <video ref={remoteVideoRef} autoPlay playsInline style={{ width: 320, height: 240, backgroundColor: "#000" }} />
            </div>
        </div>
    );
}
