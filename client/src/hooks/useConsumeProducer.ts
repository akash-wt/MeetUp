// hooks/useConsumeProducer.ts
import socket from '../lib/socket';
import { useRecoilValue } from 'recoil';
import { currentDevice } from '../store/deviceState';
import { types as mediasoupTypes } from 'mediasoup-client';
import { useRef, useState } from 'react';

export const useConsumeProducer = (roomId: string, producerId: string) => {
  const device = useRecoilValue(currentDevice);
  const recvTransportRef = useRef<mediasoupTypes.Transport | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

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

    socket.emit(
      "consume",
      { roomId, transportId: recvTransportRef.current.id, producerId, rtpCapabilities },
      async (data: { id: string, producerId: string, kind: mediasoupTypes.MediaKind, rtpParameters: mediasoupTypes.RtpParameters }) => {
        const { id: consumerId, kind, rtpParameters } = data;

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

          setRemoteStream(remoteStream);
        } catch (e) {
          console.error("Error consuming producer", e);
        }
      }
    );
  };

  return { remoteStream, consumeProducer };
};
