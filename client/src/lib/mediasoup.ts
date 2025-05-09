import { Device } from "mediasoup-client";
import { types as mediasoupTypes } from "mediasoup-client";

let device: Device | null = null;

export const getMediasoupDevice = async (rtpCapabilities: mediasoupTypes.RtpCapabilities): Promise<Device> => {
  if (!device) {
    device = new Device();
    await device.load({ routerRtpCapabilities: rtpCapabilities });
  }
  return device;
};
