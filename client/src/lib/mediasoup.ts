import { Device } from "mediasoup-client";
import { types as mediasoupTypes } from "mediasoup-client";

export const getMediasoupDevice = async (
  rtpCapabilities: mediasoupTypes.RtpCapabilities,
  
) => {
  try {

    console.log(rtpCapabilities);
    const device = new Device();
    await device.load({ routerRtpCapabilities: rtpCapabilities })
    return device;
    
  } catch (err) {
    console.error("Error loading device:", err);
    throw err;
  }
};
