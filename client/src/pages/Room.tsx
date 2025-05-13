// import { useRecoilValue } from "recoil";
// import { useJoinRoom } from "../hooks/useJoinRoom";
// import { currentDevice } from "../store/deviceState";
// import { userPeer } from "../store/peerState";
// import { currentRoomIdState } from "../store/roomState";
// import { useTransport } from "../hooks/useCreateTransport";
// import socket from "../lib/socket";
// import { transportState } from "../store/transportState";
// import { useRef, useState } from "react";
// import { types as mediasoupTypes } from "mediasoup-client";

// const RoomPage = () => {
//   const roomId = useRecoilValue(currentRoomIdState);
//   const device = useRecoilValue(currentDevice);
//   const userPeerId = useRecoilValue(userPeer);
//   const transport = useRecoilValue(transportState);
//   const [producerId, setProducerId] = useState<string | null>(null);
//   const localMediaRef = useRef<HTMLVideoElement | null>(null);
//   const recvTransportRef = useRef<mediasoupTypes.Transport | null>(null);
//   const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

//   const joinRoom = useJoinRoom();
//   const createTransport = useTransport(roomId!, userPeerId!);

//   const createSendTransport = async () => {
//     if (
//       !device ||
//       !transport?.id ||
//       !transport.dtlsParameters ||
//       !transport.iceCandidates ||
//       !transport.iceParameters
//     ) {
//       console.log("device or transport not found!");
//       return;
//     }

//     const sendTransport = device.createSendTransport({
//       id: transport.id,
//       iceParameters: transport.iceParameters,
//       iceCandidates: transport.iceCandidates,
//       dtlsParameters: JSON.parse(JSON.stringify(transport.dtlsParameters)),
//     });

//     sendTransport.on("connect", ({ dtlsParameters }, callback, errBack) => {
//       console.log("sendTransport connect");

//       try {
//         socket.emit(
//           "connectTransport",
//           { transportId: sendTransport.id, dtlsParameters },
//           callback
//         );
//       } catch (e) {
//         if (e instanceof Error) {
//           errBack(e);
//         } else {
//           errBack(
//             new Error("An error occurred while connecting send transport")
//           );
//         }
//       }
//     });

//     sendTransport.on(
//       "produce",
//       ({ kind, rtpParameters }, callback, errBack) => {
//         try {
//           socket.emit(
//             "produce",
//             { roomId, transportId: sendTransport.id, kind, rtpParameters },
//             ({ id }: { id: string }) => {
//               callback({ id });
//               setProducerId(id);
//               console.log("Producer socket emit");
//             }
//           );
//         } catch (e) {
//           if (e instanceof Error) {
//             errBack(e);
//           } else {
//             errBack(new Error("An error occurred while producing"));
//           }
//         }
//       }
//     );

//     return sendTransport;
//   };

//   const createRecvTransport = () => {
//     if (
//       !device ||
//       !transport?.id ||
//       !transport.dtlsParameters ||
//       !transport.iceCandidates ||
//       !transport.iceParameters
//     ) {
//       console.log("device or transport not found!");
//       return;
//     }

//     const recvTransport = device.createRecvTransport({
//       id: transport.id,
//       iceParameters: transport.iceParameters,
//       iceCandidates: transport.iceCandidates,
//       dtlsParameters: JSON.parse(JSON.stringify(transport.dtlsParameters)),
//     });

//     recvTransport.on("connect", ({ dtlsParameters }, callback, errBack) => {
//       try {
//         socket.emit(
//           "connectTransport",
//           { transportId: recvTransport.id, dtlsParameters },
//           callback
//         );
//       } catch (e) {
//         if (e instanceof Error) {
//           errBack(e);
//         } else {
//           errBack(
//             new Error("An error occurred while connecting recv transport")
//           );
//         }
//       }
//     });
//     recvTransportRef.current = recvTransport;
//     console.log("done recvtransport");

//     return recvTransport;
//   };

//   const handleJoinRoom = async () => {
//     await joinRoom();
//   };

//   const handleTransport = async () => {
//     await getTransport();
//   };

//   const getTransport = async () => {
//     try {
//       await createTransport();
//     } catch (err) {
//       console.error("Error:", err);
//     }
//   };

//   const handleStream = async () => {
//     const sendTransport = await createSendTransport();
//     if (!sendTransport) {
//       console.log("not sendTrasnport found ", sendTransport);
//       return;
//     }
//     console.log(sendTransport);

//     const stream = await navigator.mediaDevices.getUserMedia({
//       video: true,
//       audio: true,
//     });

//     for (const track of stream.getTracks()) {
//       await sendTransport.produce({ track });
//     }

//     if (localMediaRef.current) {
//       localMediaRef.current.srcObject = stream;
//     }
//   };

//   const consumeProducer = async () => {
//     const { rtpCapabilities } = device!;

//     if (!recvTransportRef.current) {
//       console.error("Recv transport is null");
//       return;
//     }
//     if (!transport) {
//       console.error(" transport is null");
//       return;
//     }
//     if (!producerId) {
//       console.error("producerId  is null");
//       return;
//     }

//     socket.emit(
//       "consume",
//       {
//         roomId,
//         transportId: transport.id,
//         producerId: producerId,
//         rtpCapabilities,
//       },
//       async (
//         data:
//           | {
//             id: string;
//             producerId: string;
//             kind: mediasoupTypes.MediaKind;
//             rtpParameters: mediasoupTypes.RtpParameters;
//           }
//           | { error: string }
//       ) => {

//         if ("error" in data) {
//           console.error(`Error: ${data.error}`);
//           return;
//         }

//         const { id: consumerId, kind, rtpParameters } = data;
//         try {
//           // console.log(consumerId);
//           // console.log(kind);
//           // console.log(rtpParameters);

//           const consumer = await recvTransportRef.current!.consume({
//             id: consumerId,
//             producerId: producerId,
//             kind: kind,
//             rtpParameters: rtpParameters,
//           });

//           consumer.resume();
//           // const stream = new MediaStream();
//           // stream.addTrack(consumer.track);
//           // if (remoteVideoRef.current) {
//           //   remoteVideoRef.current.srcObject = stream;
//           // }
//           const remoteStream = new MediaStream();
//           remoteStream.addTrack(consumer.track);

//           if (consumer.kind === "video") {
//             const videoElement = document.createElement("video");
//             videoElement.srcObject = remoteStream;
//             videoElement.autoplay = true;
//             videoElement.playsInline = true;
//             videoElement.width = 200;
//             const remoteMediaElement = document.getElementById("remote-media");
//             if (remoteMediaElement) {
//               remoteMediaElement.appendChild(videoElement);
//             }
//           } else if (consumer.kind === "audio") {
//             const audioElement = document.createElement("audio");
//             audioElement.srcObject = remoteStream;
//             audioElement.autoplay = true;
//             audioElement.controls = true;
//             const remoteMediaElement = document.getElementById("remote-media");
//             if (remoteMediaElement) {
//               remoteMediaElement.appendChild(audioElement);
//             }

//           }
//         } catch (e) {
//           console.log(e);

//         }
//       }
//     );

//     // socket.emit("getProducers", { roomId }, async (producerIds: string[]) => {
//     //   // console.log("getProducers roomId", roomId);
//     //   console.log("Available producers: ", producerIds);
//     //   // for (const id of producerIds) {

//     //   // }
//     // });
//   };

//   return (
//     <div>
//       {roomId && device && userPeerId ? (
//         <div>
//           <p>Room ID: {roomId}</p>
//           <p>Device: {device ? "Device Ready" : "Loading Device..."}</p>
//           <p>User Peer ID: {userPeerId}</p>
//         </div>
//       ) : (
//         <p>Loading room...</p>
//       )}

//       <h2>My Stream</h2>
//       <video ref={localMediaRef} autoPlay playsInline muted={false} controls />
//       <br />
//       <button onClick={handleJoinRoom}> 1. Create Room</button>
//       <br />

//       <button onClick={handleTransport}>2. create transport</button>
//       <br />
//       <button onClick={handleStream}>3. getStream</button>
//       <br />
//       <button onClick={createRecvTransport}>createRecvTransport</button>
//       <br />
//       <button onClick={consumeProducer}>Consume Producer</button>
//       <br />
//       <h2>Remote Stream</h2>
//       <video id="remoteVedio" ref={remoteVideoRef} playsInline muted={false} controls />
//       <div id="remote-media" />

//     </div>
//   );
// };
// export default RoomPage;


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

  const localMediaRef = useRef<HTMLVideoElement | null>(null);
  const recvTransportRef = useRef<mediasoupTypes.Transport | null>(null);

  const joinRoom = useJoinRoom();
  const createTransport = useTransport(roomId!, userPeerId!);

  const createSendTransport = async () => {
    if (!device || !transport) return console.error("device or transport missing");

    const sendTransport = device.createSendTransport({
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: JSON.parse(JSON.stringify(transport.dtlsParameters)),
    });

    sendTransport.on("connect", ({ dtlsParameters }, callback, errBack) => {
      socket.emit("connectTransport", { transportId: sendTransport.id, dtlsParameters }, callback);
    });

    sendTransport.on("produce", ({ kind, rtpParameters }, callback, errBack) => {
      socket.emit(
        "produce",
        { roomId, transportId: sendTransport.id, kind, rtpParameters },
        ({ id }: { id: string }) => {
          callback({ id });
          setProducerId(id);
        }
      );
    });

    return sendTransport;
  };

  const createRecvTransport = () => {
    if (!device || !transport) return console.error("device or transport missing");

    const recvTransport = device.createRecvTransport({
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: JSON.parse(JSON.stringify(transport.dtlsParameters)),
    });

    recvTransport.on("connect", ({ dtlsParameters }, callback, errBack) => {
      socket.emit("connectTransport", { transportId: recvTransport.id, dtlsParameters }, callback);
    });

    recvTransportRef.current = recvTransport;
  };

  const handleJoinRoom = async () => {
    await joinRoom();
  };

  const handleTransport = async () => {
    await createTransport();
  };

  const handleStream = async () => {
    const sendTransport = await createSendTransport();
    if (!sendTransport) return;

    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    stream.getTracks().forEach((track) => {
      sendTransport.produce({ track });
    });

    if (localMediaRef.current) {
      localMediaRef.current.srcObject = stream;
    }
  };

  const consumeProducer = async () => {
    if (!device || !recvTransportRef.current || !transport || !producerId)
      return console.error("missing elements to consume");

    socket.emit(
      "consume",
      {
        roomId,
        transportId: transport.id,
        producerId: producerId,
        rtpCapabilities: device.rtpCapabilities,
      },
      async (data: any) => {
        if (data.error) return console.error(data.error);

        const consumer = await recvTransportRef.current!.consume({
          id: data.id,
          producerId: data.producerId,
          kind: data.kind,
          rtpParameters: data.rtpParameters,
        });

        const remoteStream = new MediaStream();
        remoteStream.addTrack(consumer.track);

        if (data.kind === "video") {
          const videoElement = document.createElement("video");
          videoElement.srcObject = remoteStream;
          videoElement.autoplay = true;
          videoElement.playsInline = true;
          videoElement.width = 200;
          document.getElementById("remote-media")?.appendChild(videoElement);
        } else if (data.kind === "audio") {
          const audioElement = document.createElement("audio");
          audioElement.srcObject = remoteStream;
          audioElement.autoplay = true;
          audioElement.controls = true;
          document.getElementById("remote-media")?.appendChild(audioElement);
        }

        consumer.resume();
      }
    );
  };

  return (
    <div>
      <h2>Room Controls</h2>
      {roomId && device && userPeerId ? (
        <>
          <p>Room ID: {roomId}</p>
          <p>Device Ready</p>
          <p>User Peer ID: {userPeerId}</p>
        </>
      ) : (
        <p>Loading...</p>
      )}

      <video ref={localMediaRef} autoPlay playsInline muted controls width="300" />
      <br />

      <button onClick={handleJoinRoom}>1. Join Room</button>
      <button onClick={handleTransport}>2. Create Transport</button>
      <button onClick={handleStream}>3. Start Stream</button>
      <button onClick={createRecvTransport}>4. Create Recv Transport</button>
      <button onClick={consumeProducer}>5. Consume Remote Stream</button>

      <h2>Remote Streams</h2>
      <div id="remote-media" />
    </div>
  );
};

export default RoomPage;
