import { useRecoilValue } from "recoil";
import { useJoinRoom } from "../hooks/useJoinRoom";
import { currentDevice } from "../store/deviceState";
import { currentRoomIdState } from "../store/roomState";
import { useTransport } from "../hooks/useCreateTransport";
import socket from "../lib/socket";
import { useEffect, useRef, useState } from "react";
import { types as mediasoupTypes } from "mediasoup-client";
import { useCreateSendTransport } from "../hooks/useCreateSendTransport.ts";
import { useCreateRecvTransport } from "../hooks/useCreateRecvTransport.ts";

// type TransportResponse = Partial<{
//   id: string;
//   iceParameters: mediasoupTypes.IceParameters;
//   iceCandidates: mediasoupTypes.IceCandidate[];
//   dtlsParameters: mediasoupTypes.DtlsParameters;
//   peerId: string;
// }>;

const RoomPage = () => {
  const roomId = useRecoilValue(currentRoomIdState);
  const device = useRecoilValue(currentDevice);
  // const [producerId, setProducerId] = useState<string | null>(null);
  const { producerId, createSendTransport } = useCreateSendTransport();
  const { createRecvTransport } = useCreateRecvTransport();
  const localMediaRef = useRef<HTMLVideoElement | null>(null);
  const recvTransportRef = useRef<mediasoupTypes.Transport | null>(null);

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

  }


  const getRecvTransport = async () => {
    const recvTransport = await createRecvTransport();
    if (!recvTransport) {
      console.log(recvTransport);
      return;
    }
    recvTransportRef.current = recvTransport;


  };

  // const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

    socket.emit("consume", { roomId, transportId: recvTransportRef.current.id, producerId, rtpCapabilities },
      async (data: {
        id: string, producerId: string, kind: mediasoupTypes.MediaKind, rtpParameters: mediasoupTypes.RtpParameters
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

          consumer.resume();

          const { track } = consumer;


          const remoteStream = new MediaStream([track]);
          console.log(remoteStream);


          if (remoteStream.getTracks().length > 0) {
            console.log("Tracks are available");
          } else {
            console.error("No tracks available in the MediaStream");
          }

          // Get the video element and assign the stream
          const remoteVideo = document.getElementById("remoteVideo") as HTMLVideoElement;

          if (remoteVideo) {
            // Attach the MediaStream to the video element
            // if (localMediaRef.current) {
            //   localMediaRef.current.srcObject = remoteStream;
            // } else {
            //   console.error("localMediaRef.current is null");
            // }

            if (localMediaRef.current) {
              localMediaRef.current.srcObject = null; // Reset old stream
              localMediaRef.current.srcObject = remoteStream; // Assign new stream
            }




          } else {
            console.error("Failed to find the remote video element.");
          }

          // Unmute the track if needed
          track.enabled = true;  // Unmute the video
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
      <button onClick={createSendStream}>2. Create Send Transport && Start Stream</button>
      <br />
      <button onClick={getRecvTransport}>4. Create Receive Transport</button>
      <br />
      <button onClick={consumeProducer}>5. Consume Producer</button>
      <br />
      <h2>Remote Stream</h2>
      <video
        ref={localMediaRef}
        id="remoteVideo"
        playsInline
        autoPlay
        muted
        controls
      ></video>
    </div>
  );
};


export default RoomPage;
