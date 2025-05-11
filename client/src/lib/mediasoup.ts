import { Device } from "mediasoup-client";
export const getMediasoupDevice = async (rtpCapabilities: any) => {
  try {
    rtpCapabilities = {
      codecs: rtpCapabilities.rtpCapabilities.codecs,
      headerExtensions: rtpCapabilities.rtpCapabilities.headerExtensions,
    };

    console.log("before loaddeding ", rtpCapabilities);
    const device = new Device();

    await device.load({ routerRtpCapabilities: rtpCapabilities });

    return device;
  } catch (err) {
    console.error("Error loading device:", err);
    throw err;
  }
};
