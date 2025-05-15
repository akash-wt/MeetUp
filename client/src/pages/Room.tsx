import { useRecoilValue } from "recoil";
import { useJoinRoom } from "../hooks/useJoinRoom";
import { currentDevice } from "../store/deviceState";
import { currentRoomIdState } from "../store/roomState";
import socket from "../lib/socket";
import { useRef, useState } from "react";
import { types as mediasoupTypes } from "mediasoup-client";
import { useCreateSendTransport } from "../hooks/useCreateSendTransport.ts";
import { useCreateRecvTransport } from "../hooks/useCreateRecvTransport.ts";

const RoomPage = () => {
  const roomId = useRecoilValue(currentRoomIdState);
  const device = useRecoilValue(currentDevice);
  // const [producerId, setProducerId] = useState<string | null>(null);
  const { producerId, createSendTransport } = useCreateSendTransport();
  const { createRecvTransport } = useCreateRecvTransport();
  const localMediaRef = useRef<HTMLVideoElement | null>(null);
  const recvTransportRef = useRef<mediasoupTypes.Transport | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<MediaStream[]>([]);

  const joinRoom = useJoinRoom();

  const createSendStream = async () => {
    const sendTransport = await createSendTransport();
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    for (const track of stream.getTracks()) {
      await sendTransport!.produce({ track });
    }

    if (localMediaRef.current) {
      localMediaRef.current.srcObject = stream;
    }
  };

  const getRecvTransport = async () => {
    const recvTransport = await createRecvTransport();
    if (!recvTransport) {
      console.log(recvTransport);
      return;
    }
    recvTransportRef.current = recvTransport;
  };

  const handleJoinRoom = async () => {
    await joinRoom();
  };

  const consumeProducer = async () => {
    if (!device) {
      console.error("Device not initialized");
      return;
    }
    const { rtpCapabilities } = device;

    if (!recvTransportRef.current) {
      console.error("Receive transport is null");
      return;
    }
    if (!producerId) {
      console.error("Producer ID is null");
      return;
    }

    socket.emit(
      "consume",
      {
        roomId,
        transportId: recvTransportRef.current.id,
        producerId,
        rtpCapabilities,
      },
      async (
        data: | {
          id: string;
          producerId: string;
          kind: mediasoupTypes.MediaKind;
          rtpParameters: mediasoupTypes.RtpParameters;
        } | { error: string }) => {
        if ("error" in data) {
          console.error(`Consume error: ${data.error}`);
          return;
        }

        const { id: consumerId, kind, rtpParameters } = data;
        console.log("comsume data ", data);

        try {
          const consumer = await recvTransportRef.current!.consume({
            id: consumerId,
            producerId,
            kind,
            rtpParameters,

          });

          if (recvTransportRef.current) {
            recvTransportRef.current.on("connectionstatechange", (state) => {
              console.log("Receive Transport state:", state);
            });
          }

          consumer.resume();
          const remoteStream = new MediaStream();
          remoteStream.addTrack(consumer.track);
          setRemoteStreams((prev: MediaStream[]) => [...prev, remoteStream]);

          console.log("Track ", consumer.track);
          console.log("consumer ", consumer);


        } catch (e) {
          console.error("Error consuming producer", e);
        }
      }
    );
  };

  return (
    <div>
      {roomId && device ? (
        <div>
          <p>Room ID: {roomId}</p>
          <p>Device: Ready</p>
        </div>
      ) : (
        <p>Loading room...</p>
      )}

      <h2>My Stream</h2>
      <video ref={localMediaRef} autoPlay playsInline muted />
      <br />
      <button onClick={handleJoinRoom}>1. Join Room</button>
      <br />
      <button onClick={createSendStream}>
        2. Create Send Transport && Start Stream
      </button>
      <br />
      <button onClick={getRecvTransport}>4. Create Receive Transport</button>
      <br />
      <button onClick={consumeProducer}>5. Consume Producer</button>
      <br />
      <div id="remote-media">
        {remoteStreams.map((stream: MediaStream, i: number) => (
          <video
            key={i}
            autoPlay
            playsInline
            controls
            muted
            ref={(video) => {
              if (video) {
                video.srcObject = stream;
              }
            }}
          />
        ))}
      </div>

    </div>
  );
};

export default RoomPage;
