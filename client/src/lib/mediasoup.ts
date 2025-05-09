import { Device } from "mediasoup-client";
import { types as mediasoupTypes } from "mediasoup-client";

let device: Device | null = null;

export const getMediasoupDevice = async (
  rtpCapabilities: mediasoupTypes.RtpCapabilities
): Promise<Device> => {
  if (!device) {
    device = new Device();

    console.log(
      "rtpCapabilities from server:",
      JSON.stringify(rtpCapabilities)
    );

    try {
      await device.load({ routerRtpCapabilities: rtpCapabilities });
      console.log("Device loaded successfully:", JSON.stringify(device));
    } catch (err) {
      console.log("Error loading device:", err);
    }
  }
  return device;
};
