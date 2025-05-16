import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import { types as mediasoupTypes } from "mediasoup";
dotenv.config();
import { GetRoom } from "./signaling/rooms";
import { createWebRtcTransport } from "./signaling/transports";



const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });
const PORT = 5080;

type Peer = {
  producerTransport: mediasoupTypes.WebRtcTransport[];
  consumerTransport: mediasoupTypes.WebRtcTransport[];
  producers: mediasoupTypes.Producer[];
  consumers: mediasoupTypes.Consumer[];
};
//roomId
const roomPeers = new Map<string, Map<string, Peer>>();

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on("joinRoom", async (roomId: string, callback: (response: { rtpCapabilities: mediasoupTypes.RtpCapabilities } | { error: string }) => void) => {
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
  });


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


  socket.on("connectTransport", async (payload: { roomId: string, transportId: string, direction: "send" | "recv", dtlsParameters: mediasoupTypes.DtlsParameters }, callback) => {
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

        transport = peer.consumerTransport.find(t => t.id === payload.transportId);

        if (!transport)
          return callback({ error: "Consumer transport not found" });
        await transport.connect({ dtlsParameters: payload.dtlsParameters });

      } else {
        transport = peer.producerTransport.find(t => t.id === payload.transportId);
        if (!transport)
          return callback({ error: "Producer transport not found" });
        await transport.connect({ dtlsParameters: payload.dtlsParameters });
      }

      callback();
    } catch (err: any) {
      callback({ error: err.message });
    }
  });


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

        peer.producers.push(producer);

        console.log(`Producer created: ${producer.id}`);

        callback({ id: producer.id });
      } catch (err: any) {
        callback({ error: err.message });
      }
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


        peer.consumers.push(consumer);

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

        peer.producers.forEach((producer) => {
          if (!producer.closed) producer.close();
        });


        peer.consumers.forEach((consumer) => {
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
      }
    });
  });

});

httpServer.listen(PORT, () => {
  console.log(`SFU signaling server running on port ${PORT}`);
});
