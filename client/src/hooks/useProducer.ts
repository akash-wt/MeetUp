import { useRecoilValue, useSetRecoilState } from 'recoil';
import { currentRoomIdState } from '../store/roomState';
import { transportsState } from '../store/transportState';
import socket from '../services/socket';
import mediasoupClient from '../services/mediasoupClient';

export const useProducer = () => {
  const roomId = useRecoilValue(currentRoomIdState);
  const setTransports = useSetRecoilState(transportsState);

  const createProducer = async (kind: 'audio' | 'video', track: MediaStreamTrack) => {
    return new Promise((resolve, reject) => {
      socket.emit('createWebRtcTransport', { roomId }, async (params) => {
        if (params.error) return reject(params.error);

        const transport = await mediasoupClient.createSendTranimport { socket } from "../services/socket";
import { useRecoilState } from "recoil";
import { transportsState, producersState } from "../store/transportState";
import { types as mediasoupTypes } from "mediasoup-client";

const useProducer = () => {
  const [transports, setTransports] = useRecoilState(transportsState);
  const [producers, setProducers] = useRecoilState(producersState);

  const createProducer = async (roomId: string, device: mediasoupTypes.Device, track: MediaStreamTrack) => {
    const response = await new Promise<any>((resolve) => {
      socket.emit("createWebRtcTransport", { roomId }, resolve);
    });

    if (response.error) throw new Error(response.error);

    const transport = device.createSendTransport(response);

    await new Promise((resolve) => {
      transport.on("connect", ({ dtlsParameters }, callback) => {
        socket.emit("connectTransport", { roomId, transportId: transport.id, dtlsParameters }, () => {
          callback();
          resolve(null);
        });
      });
    });

    const producer = await transport.produce({ track });

    setTransports((prev) => [...prev, transport]);
    setProducers((prev) => [...prev, producer]);

    return producer;
  };

  return createProducer;
};

export default useProducer;
sport(params);
        setTransports((prev) => [...prev, transport]);

        transport.on('connect', ({ dtlsParameters }, callback) => {
          socket.emit('connectTransport', { roomId, transportId: transport.id, dtlsParameters }, callback);
        });

        const producer = await transport.produce({ track });
        resolve(producer);
      });
    });
  };

  return { createProducer };
};
