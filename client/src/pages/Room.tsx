import { useState, useEffect } from 'react';
import { Device, types as mediasoupTypes } from 'mediasoup-client';
import socket from '../lib/socket';
import { useMediaStream } from '../hooks/useMediaStream';
import { useSetRecoilState } from 'recoil';
import { currentRoomIdState, rtpCapabilitiesState } from '../store/roomState';
import VideoPlayer from '../components/VideoPlayer';
import Controls from '../components/Controls';
import { getMediasoupDevice } from '../lib/mediasoup';



const RoomPage = () => {
  const [device, setDevice] = useState<Device | null>(null);
  const [sendTransport, setSendTransport] = useState<mediasoupTypes.Transport | null>(null);
  const [receiveTransport, setReceiveTransport] = useState<mediasoupTypes.Transport | null>(null);
  const [peerStream, setPeerStream] = useState<MediaStream | null>(null);
  const { stream, permissionDenied } = useMediaStream();
  const setRoomId = useSetRecoilState(currentRoomIdState);
  const setRtpCapabilities = useSetRecoilState(rtpCapabilitiesState);

  // Create Mediasoup device when rtpCapabilities received
  const createDevice = async (rtpCapabilities: mediasoupTypes.RtpCapabilities) => {
    const newDevice = await getMediasoupDevice(rtpCapabilities);
    setDevice(newDevice);
    return newDevice;
  };

  // Create send transport and produce tracks
  const createSendTransport = async () => {
    if (!device) return;

    socket.emit('createWebRtcTransport', { roomId: ROOM_ID }, async (transportOptions: mediasoupTypes.TransportOptions) => {
      if (transportOptions.error) {
        console.error('Failed to create send transport:', transportOptions.error);
        return;
      }

      const transport = device.createSendTransport(transportOptions);

      transport.on('connect', ({ dtlsParameters }, callback, errback) => {
        socket.emit('connect-transport', {
          transportId: transport.id,
          dtlsParameters,
          roomId: ROOM_ID,
          peerId: socket.id,
        });
        callback();
      });

      transport.on('produce', ({ kind, rtpParameters }, callback, errback) => {
        socket.emit('produce', {
          transportId: transport.id,
          kind,
          rtpParameters,
          roomId: ROOM_ID,
          peerId: socket.id,
        }, ({ id }: { id: string }) => {
          callback({ id });
        });
      });

      setSendTransport(transport);

      // Attach local stream tracks to transport
      stream?.getTracks().forEach(track => {
        transport.produce({ track });
      });
    });
  };

  // Create receive transport for peer streams
  const createReceiveTransport = async () => {
    if (!device) return;

    socket.emit('createWebRtcTransport', { roomId: ROOM_ID }, async (transportOptions: mediasoupTypes.TransportOptions) => {
      if (transportOptions.error) {
        console.error('Failed to create receive transport:', transportOptions.error);
        return;
      }

      const transport = device.createRecvTransport(transportOptions);

      transport.on('connect', ({ dtlsParameters }, callback, errback) => {
        socket.emit('connect-transport', {
          transportId: transport.id,
          dtlsParameters,
          roomId: ROOM_ID,
          peerId: socket.id,
        });
        callback();
      });

      setReceiveTransport(transport);
    });
  };

  const startCall = async () => {
    if (!device || !stream) return;
    await createSendTransport();
    await createReceiveTransport();
  };

  const leaveCall = () => {
    sendTransport?.close();
    receiveTransport?.close();
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setPeerStream(null);
  };

  const handleSocketEvents = () => {
    socket.on('new-peer', (peerStreamData) => {
      const remoteStream = new MediaStream();
      peerStreamData.stream.getTracks().forEach((track: MediaStreamTrack) => {
        remoteStream.addTrack(track);
      });
      setPeerStream(remoteStream);
    });
  };

  useEffect(() => {
    socket.emit('joinRoom', { roomId: ROOM_ID });

    socket.on('rtpCapabilities', (rtpCapabilities) => {
      setRtpCapabilities(rtpCapabilities);
      createDevice(rtpCapabilities);
    });

    handleSocketEvents();

    return () => {
      socket.off('new-peer');
    };
  }, []);

  if (permissionDenied) {
    return <div>Permissions denied. Please enable the camera/microphone.</div>;
  }

  return (
    <div>
      <h1>Room: {ROOM_ID}</h1>
      {stream && <VideoPlayer stream={stream} />}
      {peerStream && <VideoPlayer stream={peerStream} />}
      <Controls startCall={startCall} leaveCall={leaveCall} />
    </div>
  );
};

export default RoomPage;
