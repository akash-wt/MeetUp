import  socket  from "../lib/socket";
import { types as mediasoupTypes } from "mediasoup-client";

const useConsumer = () => {

  const createConsumer = async (roomId: string, device: mediasoupTypes.Device, producerId: string) => {
    const response = await new Promise<any>((resolve) => {
      socket.emit("createWebRtcTransport", { roomId }, resolve);
    });

    if (response.error) throw new Error(response.error);

    const transport = device.createRecvTransport(response);

    await new Promise((resolve) => {
      transport.on("connect", ({ dtlsParameters }, callback) => {
        socket.emit("connectTransport", { roomId, transportId: transport.id, dtlsParameters }, () => {
          callback();
          resolve(null);
        });
      });
    });

    const consumeResponse = await new Promise<any>((resolve) => {
      socket.emit("consume", {
        roomId,
        transportId: transport.id,
        producerId,
        rtpCapabilities: device.rtpCapabilities,
      }, resolve);
    });

    if (consumeResponse.error) throw new Error(consumeResponse.error);

    const consumer = await transport.consume({
      id: consumeResponse.id,
      producerId: consumeResponse.producerId,
      kind: consumeResponse.kind,
      rtpParameters: consumeResponse.rtpParameters,
    });

    return consumer;
  };

  return createConsumer;
};

export default useConsumer;
