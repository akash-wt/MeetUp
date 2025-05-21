import { types as mediasoupTypes } from "mediasoup";

export type Peer = {
    producerTransport: mediasoupTypes.WebRtcTransport[];
    consumerTransport: mediasoupTypes.WebRtcTransport[];
    producers: { producer: mediasoupTypes.Producer; transportId: string }[];
    consumers: { consumer: mediasoupTypes.Consumer; transportId: string }[];
};