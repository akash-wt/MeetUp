import { useRecoilValue } from "recoil";
import { useJoinRoom } from "../hooks/useJoinRoom";
import { currentDevice } from "../store/deviceState";
import { userPeer } from "../store/peerState";
import { currentRoomIdState } from "../store/roomState";
import { useTransport } from "../hooks/useCreateTransport";
import socket from "../lib/socket";
import { transportState } from "../store/transportState";
import { useRef, useState } from "react";
import { types as mediasoupTypes } from "mediasoup-client";



const RoomPage = () => {
  const roomId = useRecoilValue(currentRoomIdState);
  const device = useRecoilValue(currentDevice);
  const userPeerId = useRecoilValue(userPeer);
  const transport = useRecoilValue(transportState);
  const [producerId, setProducerId] = useState<string | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);


  const joinRoom = useJoinRoom();
  const createTransport = useTransport(roomId!, userPeerId!);

  const createSendTransport = async () => {
    if (!device || !transport?.id || !transport.dtlsParameters || !transport.iceCandidates || !transport.iceParameters) {
      console.log("device or transport not found!");
      return;
    }

    const sendTransport = await device.createSendTransport({
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: JSON.parse(JSON.stringify(transport.dtlsParameters)),
    });

    sendTransport.on("connect", ({ dtlsParameters }, callback, errBack) => {
      console.log("sendTransport connect");

      try {
        socket.emit("connectTransport", { transportId: sendTransport.id, dtlsParameters }, callback);
      } catch (e) {
        if (e instanceof Error) {
          errBack(e);
        } else {
          errBack(new Error("An error occurred while connecting send transport"));
        }
      }
    });

    sendTransport.on("produce", ({ kind, rtpParameters }, callback, errBack) => {
      try {
        socket.emit("produce", { roomId, transportId: sendTransport.id, kind, rtpParameters }, ({ id }: { id: string }) => {
          callback({ id });
          setProducerId(id)
          console.log("Producer socket emit");
        });
      } catch (e) {
        if (e instanceof Error) {
          errBack(e);
        } else {
          errBack(new Error("An error occurred while producing"));
        }
      }
    });

    return sendTransport;
  };

  const createRecvTransport = () => {
    if (!device || !transport?.id || !transport.dtlsParameters || !transport.iceCandidates || !transport.iceParameters) {
      console.log("device or transport not found!");
      return;
    }

    const recvTransport = device.createRecvTransport({
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: JSON.parse(JSON.stringify(transport.dtlsParameters)),
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

  const handleJoinRoom = async () => {
    await joinRoom();
  };

  const handleTransport = async () => {
    await getTransport()
  };

  const getTransport = async () => {
    try {
      await createTransport();
    } catch (err) {
      console.error("Error:", err);
    }
  };

  const handleStream = async () => {
    const sendTransport = await createSendTransport();
    if (!sendTransport) {
      console.log("not sendTrasnport found ", sendTransport);
      return
    }
    console.log(sendTransport);

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });

    await sendTransport.produce({ track: stream.getTracks()[0] });
    await sendTransport.produce({ track: stream.getTracks()[1] });
  };

  return (
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
      <br />
      <button onClick={handleJoinRoom}> 1. Create Room</button>
      <br />

      <button onClick={handleTransport}>2. create transport</button>
      <br />
      <button onClick={handleStream}>3. getStream</button>
    </div >
  );

}
export default RoomPage;

