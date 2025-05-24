import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import { types as mediasoupTypes } from "mediasoup";
dotenv.config();
import { GetRoom } from "./signaling/rooms";
import { createWebRtcTransport } from "./signaling/transports";
import presignRouter from './routes/presign';
import type { Peer } from "./types";
import cors from "cors";
import cookieParser from 'cookie-parser';
import authRoutes from "./routes/authGoogle"


const app = express();

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });
const PORT = 5080;

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));


app.use(express.json());
app.use(cookieParser());

app.use('/api/presign', presignRouter);
app.use("/api", authRoutes);


const roomPeers = new Map<string, Map<string, Peer>>();
const roomBroadcastedProducers = new Map<string, Set<string>>();

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on(
    "joinRoom",
    async (
      roomId: string,
      callback: (
        response:
          | { rtpCapabilities: mediasoupTypes.RtpCapabilities }
          | { error: string }
      ) => void
    ) => {
      try {
        let peerMap = roomPeers.get(roomId);

        if (!peerMap) {
          peerMap = new Map();
          roomPeers.set(roomId, peerMap);
        }

        const peer: Peer = {
          producerTransport: [],
          consumerTransport: [],
          producers: [],
          consumers: [],
        };

        peerMap.set(socket.id, peer);

        const router: mediasoupTypes.Router = await GetRoom(roomId);

        callback({ rtpCapabilities: router.rtpCapabilities });
      } catch (err: any) {
        callback({ error: err.message });
      }
    }
  );

  socket.on(
    "createWebRtcTransport",
    async (
      payload: { direction: "send" | "recv"; roomId: string },
      callback: (
        response:
          | {
            id: string;
            iceParameters: any;
            iceCandidates: any[];
            dtlsParameters: any;
          }
          | { error?: string }
      ) => void
    ) => {
      try {
        const router = await GetRoom(payload.roomId);

        if (!router) {
          console.log("router not found");
          return callback({ error: "Router not found" });
        }

        const transport = await createWebRtcTransport(router);

        transport.on("@close", () => {
          console.log(`Transport closed: ${transport.id}`);

          const peerMap = roomPeers.get(payload.roomId);
          if (!peerMap) return;

          const peer = peerMap.get(socket.id);
          if (!peer) return;

          if (payload.direction === "send") {
            peer.producers = peer.producers.filter(
              ({ producer, transportId }) => {
                if (transportId === transport.id) {
                  if (!producer.closed) producer.close();
                  return false;
                }
                return true;
              }
            );

            peer.producerTransport = peer.producerTransport.filter(
              (t) => t.id !== transport.id
            );
          } else {
            peer.consumers = peer.consumers.filter(
              ({ consumer, transportId }) => {
                if (transportId === transport.id) {
                  if (!consumer.closed) consumer.close();
                  return false;
                }
                return true;
              }
            );

            peer.consumerTransport = peer.consumerTransport.filter(
              (t) => t.id !== transport.id
            );
          }
        });

        const peerMap = roomPeers.get(payload.roomId);
        if (!peerMap) {
          console.log("peerMap not found for room");
          return callback({ error: "Room not found" });
        }

        const peer = peerMap.get(socket.id);
        if (!peer) {
          console.log("peer not found");
          return callback({ error: "Peer not found" });
        }

        if (payload.direction === "send") {
          peer.producerTransport.push(transport);
        } else {
          peer.consumerTransport.push(transport);
        }

        callback({
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters,
        });
      } catch (err: any) {
        callback({ error: err.message });
      }
    }
  );

  socket.on(
    "connectTransport",
    async (
      payload: {
        roomId: string;
        transportId: string;
        direction: "send" | "recv";
        dtlsParameters: mediasoupTypes.DtlsParameters;
      },
      callback
    ) => {
      try {
        const peerMap = roomPeers.get(payload.roomId);
        if (!peerMap) {
          return callback({ error: "Room not found" });
        }

        const peer = peerMap.get(socket.id);
        if (!peer) {
          return callback({ error: "Peer not found" });
        }

        let transport: mediasoupTypes.WebRtcTransport | undefined;

        if (payload.direction === "recv") {
          transport = peer.consumerTransport.find(
            (t) => t.id === payload.transportId
          );

          if (!transport)
            return callback({ error: "Consumer transport not found" });

          await transport.connect({ dtlsParameters: payload.dtlsParameters });
        } else {
          transport = peer.producerTransport.find(
            (t) => t.id === payload.transportId
          );
          if (!transport)
            return callback({ error: "Producer transport not found" });
          await transport.connect({ dtlsParameters: payload.dtlsParameters });
        }

        callback();
      } catch (err: any) {
        callback({ error: err.message });
      }
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
      callback
    ) => {
      try {
        const peerMap = roomPeers.get(payload.roomId);
        if (!peerMap) {
          return callback({ error: "Room not found" });
        }

        const peer = peerMap.get(socket.id);
        if (!peer) {
          return callback({ error: "Peer not found" });
        }

        const transport = peer.producerTransport.find(
          (t) => t.id === payload.transportId
        );
        if (!transport) {
          return callback({ error: "Producer transport not found" });
        }

        const producer = await transport.produce({
          kind: payload.kind,
          rtpParameters: payload.rtpParameters,
        });

        peer.producers.push({ producer, transportId: transport.id });

        let broadcastedProducers = roomBroadcastedProducers.get(payload.roomId);
        if (!broadcastedProducers) {
          broadcastedProducers = new Set();
          roomBroadcastedProducers.set(payload.roomId, broadcastedProducers);
        }

        if (!broadcastedProducers.has(producer.id)) {
          broadcastedProducers.add(producer.id);

          for (const [socketId, data] of peerMap.entries()) {
            if (socketId === socket.id) continue;

            io.to(socketId).emit("newProducer", {
              producerId: producer.id,
              kind: producer.kind,
            });

            console.log("emitted for client  ", socketId);
          }
        }

        console.log(`Producer created: ${producer.id}`);

        callback({ id: producer.id });
      } catch (err: any) {
        callback({ error: err.message });
      }
    }
  );

  socket.on(
    "getProducers",
    (
      roomId: string,
      callback: (response: { producerIds: string[] }) => void
    ) => {
      const peerMap = roomPeers.get(roomId);
      if (!peerMap) {
        callback({ producerIds: [] });
        return;
      }

      const producerIds: string[] = [];

      for (const [socketId, peer] of peerMap.entries()) {
        if (socketId === socket.id) continue;

        for (const { producer } of peer.producers) {
          producerIds.push(producer.id);
        }
      }

      callback({ producerIds });
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
      callback
    ) => {
      try {
        const router = await GetRoom(payload.roomId);
        if (!router) {
          return callback({ error: "Room not found" });
        }

        const peerMap = roomPeers.get(payload.roomId);
        if (!peerMap) {
          return callback({ error: "Room not found" });
        }

        const peer = peerMap.get(socket.id);
        if (!peer) {
          return callback({ error: "Peer not found" });
        }

        const transport = peer.consumerTransport.find(
          (t) => t.id === payload.transportId
        );
        if (!transport) {
          return callback({ error: "Consumer transport not found" });
        }

        if (
          !router.canConsume({
            producerId: payload.producerId,
            rtpCapabilities: payload.rtpCapabilities,
          })
        ) {
          return callback({ error: "Cannot consume this producer" });
        }

        const consumer = await transport.consume({
          producerId: payload.producerId,
          rtpCapabilities: payload.rtpCapabilities,
          paused: true,
        });

        await consumer.resume();

        peer.consumers.push({ consumer, transportId: transport.id });

        callback({
          id: consumer.id,
          producerId: payload.producerId,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
        });
      } catch (err: any) {
        callback({ error: err.message });
      }
    }
  );

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);

    roomPeers.forEach((peerMap, roomId) => {
      const peer = peerMap.get(socket.id);
      if (peer) {
        console.log(`Cleaning up peer in room: ${roomId}`);
        peer.producers.forEach(({ producer }) => {
          peerMap.forEach((_, otherSocketId) => {
            if (otherSocketId !== socket.id) {
              io.to(otherSocketId).emit("producerLeft", {
                producerId: producer.id,
              });
            }
          });

          if (!producer.closed) producer.close();
        });

        peer.consumers.forEach(({ consumer }) => {
          if (!consumer.closed) consumer.close();
        });

        peer.producerTransport.forEach((transport) => {
          if (!transport.closed) transport.close();
        });

        peer.consumerTransport.forEach((transport) => {
          if (!transport.closed) transport.close();
        });

        peerMap.delete(socket.id);

        if (peerMap.size === 0) {
          roomPeers.delete(roomId);
          console.log(`Room ${roomId} is now empty and removed.`);
        }

        const broadcastedProducers = roomBroadcastedProducers.get(roomId);
        if (broadcastedProducers) {
          peer.producers.forEach(({ producer }) => {
            broadcastedProducers.delete(producer.id);
          });

          if (broadcastedProducers.size === 0) {
            roomBroadcastedProducers.delete(roomId);
          }
        }
      }
    });
  });
});

httpServer.listen(PORT, () => {
  console.log(`SFU signaling server running on port ${PORT}`);
});


