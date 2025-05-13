import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import { createMediasoupWorker } from "./signaling/worker";
import { createRoom, getRoom } from "./signaling/rooms";
import { createWebRtcTransport } from "./signaling/transports";
import { types as mediasoupTypes } from "mediasoup";
import { log } from "console";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });
const PORT = process.env.PORT || 5000;

createMediasoupWorker();

type Peer = {
    transports: mediasoupTypes.WebRtcTransport[];
    producers: mediasoupTypes.Producer[];
    consumers: mediasoupTypes.Consumer[];
};

const peers = new Map<string, Peer>();
const roomPeers = new Map<string, Map<string, Peer>>();

io.on("connection", async (socket) => {
    console.log(`Socket Client connected: ${socket.id}`);


    socket.on(
        "joinRoom",
        async (
            roomId: string,
            callback: (response: { rtpCapabilities: mediasoupTypes.RtpCapabilities } | { error: string }) => void
        ) => {
            try {
                if (!roomId) {
                    console.log("not roomId found in joinRoom");
                    return

                }
                let router = getRoom(roomId);
                if (!router) {
                    router = await createRoom(roomId);
                }

                let roomMap = roomPeers.get(roomId);
                if (!roomMap) {
                    roomMap = new Map();
                    roomPeers.set(roomId, roomMap);
                }
                roomMap.set(socket.id, {
                    transports: [],
                    producers: [],
                    consumers: [],
                });


                console.log(`Client ${socket.id} joined room ${roomId}`);

                callback({ rtpCapabilities: router!.rtpCapabilities });
            } catch (err: any) {
                callback({ error: err.message });
            }
        }
    );

    socket.on(
        "createWebRtcTransport",
        async (
            payload: { roomId: string },
            callback: (
                response: Partial<{
                    id: string;
                    iceParameters: any;
                    iceCandidates: any[];
                    dtlsParameters: any;
                }> & {
                    error?: string;
                }
            ) => void
        ) => {
            try {
                const router = getRoom(payload.roomId);
                if (!router) return callback({ error: "Room not found" });

                const transport = await createWebRtcTransport(router);
                
                const peer = roomPeers.get(payload.roomId)?.get(socket.id);
                if (!peer) return callback({ error: "Peer not found" });

                peer.transports.push(transport);

                callback({
                    id: transport.id,
                    iceParameters: transport.iceParameters,
                    iceCandidates: transport.iceCandidates,
                    dtlsParameters: transport.dtlsParameters,
                });
            } catch (err: any) {
                console.error("createWebRtcTransport error:", err);
                callback({ error: err.message });
            }
        }
    );


    socket.on(
        "connectTransport",
        async (
            payload: { roomId: string; transportId: string; dtlsParameters: mediasoupTypes.DtlsParameters },
            callback: (response?: { error: string }) => void
        ) => {
            const peer = roomPeers.get(payload.roomId)?.get(socket.id);
            if (!peer) return callback({ error: "Peer not found" });

            const transport = peer.transports.find(
                (t) => t.id === payload.transportId
            );
            if (!transport) return callback({ error: "Transport not found" });

            await transport.connect({ dtlsParameters: payload.dtlsParameters });
            callback();
        }
    );

    socket.on(
        "produce",
        async (
            payload: {
                roomId: string;
                transportId: string;
                kind: mediasoupTypes.MediaKind;
                rtpParameters: mediasoupTypes.RtpParameters;
            },
            callback: (response: { id: string } | { error: string }) => void
        ) => {
            const peer = roomPeers.get(payload.roomId)?.get(socket.id);
            if (!peer) return callback({ error: "Peer not found" });

            const transport = peer.transports.find(
                (t) => t.id === payload.transportId
            );
            if (!transport) return callback({ error: "Transport not found" });

            const producer = await transport.produce({
                kind: payload.kind,
                rtpParameters: payload.rtpParameters,
            });
            
            peer.producers.push(producer);

            console.log(`Producer created: ${producer.id} in room ${payload.roomId}`);
            callback({ id: producer.id });
        }
    );

    socket.on(
        "consume",
        async (
            payload: {
                roomId: string;
                transportId: string;
                producerId: string;
                rtpCapabilities: mediasoupTypes.RtpCapabilities;
            },
            callback: (
                response:
                    | {
                        id: string;
                        producerId: string;
                        kind: mediasoupTypes.MediaKind;
                        rtpParameters: mediasoupTypes.RtpParameters;
                    }
                    | { error: string }
            ) => void
        ) => {
            const router = getRoom(payload.roomId);
            if (!router) return callback({ error: "Room not found" });

            const peer = roomPeers.get(payload.roomId)?.get(socket.id);
            if (!peer) return callback({ error: "Peer not found" });

            if (
                !router.canConsume({
                    producerId: payload.producerId,
                    rtpCapabilities: payload.rtpCapabilities,
                })
            ) {
                return callback({ error: "Cannot consume this producer" });
            }

            const transport = peer.transports.find(
                (t) => t.id === payload.transportId
            );
            if (!transport) return callback({ error: "Transport not found" });

            const consumer = await transport.consume({
                producerId: payload.producerId,
                rtpCapabilities: payload.rtpCapabilities,
                paused: true,
            });

            consumer.on('transportclose', () => {
                console.log('transport close from consumer')
            })

            consumer.on('producerclose', () => {
                console.log('producer of consumer closed')
                consumer.close()

            })

            peer.consumers.push(consumer);;

            callback({
                id: consumer.id,
                producerId: payload.producerId,
                kind: consumer.kind,
                rtpParameters: consumer.rtpParameters,
            });
        }
    );

    socket.on("getProducers", (roomId: string, callback: (response: { producerIds: string[] } | { error: string }) => void) => {
        console.log(`Fetching producers for room: ${roomId}`);
        const peersInRoom = roomPeers.get(roomId);
        console.log("peersInRoom ", peersInRoom);

        if (!peersInRoom) {
            console.log(`Room not found: ${roomId}`);
            return callback({ error: "Room not found" });
        }

        const producerIds: string[] = [];
        peersInRoom.forEach((peer) => {
            peer.producers.forEach((producer) => {
                producerIds.push(producer.id);
            });
        });

        callback({ producerIds });
    });



    // Client disconnect
    socket.on("disconnect", () => {
        console.log(`Client disconnected: ${socket.id}`);

        roomPeers.forEach((peers, roomId) => {
            const peer = peers.get(socket.id);

            if (peer) {
                peer.transports.forEach((t) => t.close());
                peer.producers.forEach((p) => p.close());
                peer.consumers.forEach((c) => c.close());
                peers.delete(socket.id);
                console.log(`Cleaned up peer ${socket.id} from room ${roomId}`);
            }
        });
    });
});

httpServer.listen(PORT, () => {
    console.log(`SFU + signaling server running on port ${PORT}`);
});
