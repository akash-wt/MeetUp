import { Device } from "mediasoup-client";
import { types as mediasoupTypes } from "mediasoup-client";

let device: Device;

export const getMediasoupDevice = async (rtpCapabilities: mediasoupTypes.RtpCapabilities) => {
    device = new Device();
    await device.load({ routerRtpCapabilities: rtpCapabilities });
    return device;
};
