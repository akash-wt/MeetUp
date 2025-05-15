import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import mediasoup from "mediasoup";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });
const PORT = 5080; 

let worker;
const rooms = {};

const startWorker = async () => {
    worker = await mediasoup.createWorker();
    worker.on("died", () => {
        console.error("Mediasoup Worker died");
        process.exit(1);
    });
};
startWorker();

const createRoom = async (roomId) => {
    if (rooms[roomId]) return rooms[roomId];
    const mediaCodecs = [
        {
            kind: "audio",
            mimeType: "audio/opus",
            clockRate: 48000,
            channels: 2,
        },
        {
            kind: "video",
            mimeType: "video/VP8",
            clockRate: 90000,
            parameters: {},
        },
    ];
    const router = await worker.createRouter({ mediaCodecs });
    rooms[roomId] = router;
    return router;
};

const createWebRtcTransport = async (router) => {
    const transport = await router.createWebRtcTransport({
        listenIps: [{ ip: "192.168.240.135", announcedIp: null }],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
    });

    transport.on("icestatechange", (state) =>
        console.log(`Transport ${transport.id} ICE state: ${state}`)
    );

    transport.on("dtlsstatechange", (state) => {
        if (state === "closed") transport.close();
    });

    return transport;
};

io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Store per-socket mediasoup data
    socket.data = {
        roomId: null,
        router: null,
        producerTransport: null,
        consumerTransport: null,
        producer: null,
        consumer: null,
    };

    socket.on("joinRoom", async (roomId, callback) => {
        try {
            if (!roomId) return callback({ error: "No roomId provided" });

            let router = rooms[roomId];
            if (!router) {
                router = await createRoom(roomId);
                console.log(`Room created: ${roomId}`);
            } else {
                console.log(`Room exists: ${roomId}`);
            }

            socket.data.roomId = roomId;
            socket.data.router = router;

            callback({ rtpCapabilities: router.rtpCapabilities });
        } catch (err) {
            callback({ error: err.message });
        }
    });

    socket.on("createWebRtcTransport", async (payload, callback) => {
        try {
            const router = socket.data.router;
            if (!router) return callback({ error: "No router for this socket" });

            const transport = await createWebRtcTransport(router);

            if (payload.direction === "send") {
                socket.data.producerTransport = transport;
            } else {
                socket.data.consumerTransport = transport;
            }

            callback({
                id: transport.id,
                iceParameters: transport.iceParameters,
                iceCandidates: transport.iceCandidates,
                dtlsParameters: transport.dtlsParameters,
            });
        } catch (err) {
            callback({ error: err.message });
        }
    });

    socket.on("connectTransport", async (payload, callback) => {
        try {
            if (payload.direction === "recv") {
                if (!socket.data.consumerTransport)
                    return callback({ error: "No consumer transport" });
                await socket.data.consumerTransport.connect({
                    dtlsParameters: payload.dtlsParameters,
                });
            } else {
                if (!socket.data.producerTransport)
                    return callback({ error: "No producer transport" });
                await socket.data.producerTransport.connect({
                    dtlsParameters: payload.dtlsParameters,
                });
            }
            callback();
        } catch (err) {
            callback({ error: err.message });
        }
    });

    socket.on("produce", async (payload, callback) => {
        try {
            if (!socket.data.producerTransport)
                return callback({ error: "No producer transport" });

            const producer = await socket.data.producerTransport.produce({
                kind: payload.kind,
                rtpParameters: payload.rtpParameters,
            });

            socket.data.producer = producer;
            console.log(`Producer created: ${producer.id}`);

            callback({ id: producer.id });
        } catch (err) {
            callback({ error: err.message });
        }
    });

    socket.on("consume", async (payload, callback) => {
        try {
            const router = socket.data.router;
            if (!router) return callback({ error: "No router" });
            if (!socket.data.consumerTransport)
                return callback({ error: "No consumer transport" });

            if (
                !router.canConsume({
                    producerId: payload.producerId,
                    rtpCapabilities: payload.rtpCapabilities,
                })
            ) {
                return callback({ error: "Cannot consume this producer" });
            }

            const consumer = await socket.data.consumerTransport.consume({
                producerId: payload.producerId,
                rtpCapabilities: payload.rtpCapabilities,
                paused: true,
            });

            await consumer.resume();

            socket.data.consumer = consumer;

            callback({
                id: consumer.id,
                producerId: payload.producerId,
                kind: consumer.kind,
                rtpParameters: consumer.rtpParameters,
            });
        } catch (err) {
            callback({ error: err.message });
        }
    });

    socket.on("disconnect", () => {
        console.log(`Client disconnected: ${socket.id}`);

        // Cleanup
        if (socket.data.producer) socket.data.producer.close();
        if (socket.data.consumer) socket.data.consumer.close();
        if (socket.data.producerTransport) socket.data.producerTransport.close();
        if (socket.data.consumerTransport) socket.data.consumerTransport.close();
    });
});

httpServer.listen(PORT, () => {
    console.log(`SFU signaling server running on port ${PORT}`);
});
