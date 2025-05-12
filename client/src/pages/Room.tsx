import { useRecoilValue } from "recoil";
import { useJoinRoom } from "../hooks/useJoinRoom";
import { currentDevice } from "../store/deviceState";
import { userPeer } from "../store/peerState";
import { currentRoomIdState } from "../store/roomState";
import { useTransport } from "../hooks/useCreateTransport";
import socket from "../lib/socket";
import { transportState } from "../store/transportState";
import { useEffect, useRef, useState } from "react";

import { types as mediasoupTypes } from "mediasoup-client";


const RoomPage = () => {
  const roomId = useRecoilValue(currentRoomIdState);
  const device = useRecoilValue(currentDevice);
  const userPeerId = useRecoilValue(userPeer);
  const transport = useRecoilValue(transportState);
  const [producerId, setProducerId] = useState<string | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [sendTransportState, setSendTransportState] = useState<mediasoupTypes.Transport | null>(null);

  const joinRoom = useJoinRoom();
  const createTransport = useTransport(roomId!, userPeerId!);

  useEffect(() => {

    console.log("rerender");

    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }


    if (!sendTransportState) {
      console.error("sendTransport is null or undefined!");
      return;
    }

    sendTransportState.on("connect", ({ dtlsParameters }, callback, errBack) => {
      console.log("sendTransport connect", dtlsParameters);

      try {
        socket.emit("connectTransport", { transportId: sendTransportState.id, dtlsParameters }, callback);
      } catch (e) {

        if (e instanceof Error) {
          errBack(e);
        }
        else {

          errBack(new Error("An error occurred while connecting send transport"));
        }
      }
    });

    sendTransportState.on("produce", ({ kind, rtpParameters }, callback, errBack) => {
      try {
        socket.emit("produce", { roomId, transportId: sendTransportState.id, kind, rtpParameters }, ({ id }: { id: string }) => {
          callback({ id });
          setProducerId(id)
          console.log("Producer ID:", id);
        });
      } catch (e) {

        if (e instanceof Error) {
          errBack(e);
        }
        else {
          errBack(new Error("An error occurred while producing"));
        }
      }
    });


  }, [localStream, setSendTransportState, roomId]);



  const createSendTransport = () => {

    if (!device || !transport?.id || !transport.dtlsParameters || !transport.iceCandidates || !transport.iceParameters) {
      console.log("device or transport not found!");
      return;
    }

    const sendTransport = device.createSendTransport({
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    });

    if (!sendTransport) {
      console.error("sendTransport is null or undefined!");
      return;
    }
    console.log(sendTransport);
    setSendTransportState(sendTransport);
    return sendTransport;
  }



  const handleJoinRoom = async () => {
    await joinRoom();
  };

  const handleTransport = async () => {
    await getTransport()
  };

  const getTransport = async () => {
    try {
      const tr = await createTransport();
      console.log(tr);

    } catch (err) {
      console.error("Error:", err);
    }
  };

  const handleSendTransport = async () => {
    const sendTransport = createSendTransport();
    if (!sendTransport) {
      console.log("not sendTrasnport found ", sendTransport);
      return
    }
  };



  const handleStream = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });

    setLocalStream(stream);
    const audioTrack = stream.getAudioTracks()[0];
    const videoTrack = stream.getVideoTracks()[0];

    if (!sendTransportState) {
      console.log("not sendTrasnport found ", sendTransportState);
      return
    }

    await sendTransportState.produce({ track: audioTrack });
    await sendTransportState.produce({ track: videoTrack });

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
  }


  const createRecvTransport = () => {
    if (!device || !transport?.id || !transport.dtlsParameters || !transport.iceCandidates || !transport.iceParameters) {
      console.log("device or transport not found!");
      return;
    }

    const recvTransport = device.createRecvTransport({
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    });


    recvTransport.on("connect", ({ dtlsParameters }, callback, errBack) => {
      try {
        socket.emit("connectTransport", { transportId: recvTransport.id, dtlsParameters }, callback);
      } catch (e) {
        if (e instanceof Error) {
          errBack(e);
        }
        else {
          errBack(new Error("An error occurred while connecting recv transport"));
        }
      }
    });

    return recvTransport;

  }

  const consumeNewProducer = async (
    roomId: string,
    transportId: string,
    producerId: string,
  ) => {

    return new Promise((resolve, reject) => {

      const recvTransport = createRecvTransport();
      if (!recvTransport) {
        console.error("RecvTransport not found");
        return reject("RecvTransport not found");
      }

      if (!device) {
        console.error("Device is null");
        return reject("Device is null");
      }
      const rtpCapabilities = device.rtpCapabilities;
      if (!rtpCapabilities) {
        console.error("RTP capabilities not found");
        return reject("RTP capabilities not found");
      }
      socket.emit(
        "consume",
        {
          roomId,
          transportId,
          producerId,
          rtpCapabilities,
        },
        async (response) => {
          if (response.error) {
            console.error("Consume error:", response.error);
            return reject(response.error);
          }


          const { id, producerId, kind, rtpParameters } = response;

          try {
            // Consume the stream using recvTransport
            const consumer = await recvTransport.consume({
              id,
              producerId,
              kind,
              rtpParameters,
              // paused: true,
            });

            // Create new stream for this consumer
            const stream = new MediaStream();
            stream.addTrack(consumer.track);

            // Create video element to display the stream
            const videoEl = document.createElement("video");
            videoEl.srcObject = stream;
            videoEl.autoplay = true;
            videoEl.playsInline = true;
            document.body.appendChild(videoEl);

            resolve(consumer);  // Resolve with the consumer object
          } catch (err) {
            reject(`Error consuming producer stream: ${err}`);
          }
        }
      );
    });
  };
  return (
    <div>
      <div>

        {roomId && device && userPeerId ? (
          <div>
            <p>Room ID: {roomId}</p>
            <p>Device: {device ? "Device Ready" : "Loading Device..."}</p>
            <p>User Peer ID: {userPeerId}</p>
          </div>
        ) : (
          <p>Loading room...</p>
        )}

        <h2>My Stream</h2>
        <video ref={localVideoRef} autoPlay playsInline muted />

        <button onClick={handleJoinRoom}> 1. Create Room</button>
        <br />

        <button onClick={handleTransport}>2. create transport</button>
        <br />
        <button onClick={handleSendTransport}>3. create sendTransport</button>
        <br />
        <button onClick={handleStream}>4. getStream</button>


        {/* <button
          onClick={() => {
            if (roomId && transport?.id && producerId) {
              consumeNewProducer(roomId, transport.id, producerId);

            } else {
              console.log(roomId, transport?.id, producerId);
              // Handle the case when roomId, transportId, or producerId is not available


              console.error("Missing required parameters for consuming producer");
            }
          }}
        >
          Consume it
        </button> */}


      </div>

    </div >
  );
}

export default RoomPage;

