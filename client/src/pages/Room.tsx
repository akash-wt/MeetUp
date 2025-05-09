import { useState } from 'react';
import { useRecoilValue } from 'recoil';
import socket from '../lib/socket';
import { currentRoomIdState } from '../store/roomState';
import { getMediasoupDevice } from '../lib/mediasoup';
import { types as mediasoupTypes, Device } from 'mediasoup-client';
import Controls from '../components/Controls';
import VideoPlayer from '../components/VideoPlayer';

interface TransportParams {
    id: string;
    iceParameters: mediasoupTypes.IceParameters;
    dtlsParameters: mediasoupTypes.DtlsParameters;
}

const Room = () => {
    const roomId = useRecoilValue(currentRoomIdState);
    const [device, setDevice] = useState<Device | null>(null);
    const [sendTransport, setSendTransport] = useState<mediasoupTypes.Transport | null>(null);
    const [recvTransport, setRecvTransport] = useState<mediasoupTypes.Transport | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [callStarted, setCallStarted] = useState(false);

    const startCall = async () => {
        if (!roomId) return;

        console.log(roomId);

        socket.emit('joinRoom', roomId, async (rtpCapabilities: mediasoupTypes.RtpCapabilities) => {
            const newDevice = await getMediasoupDevice(rtpCapabilities);
            setDevice(newDevice);

            // @ts-ignore
            socket.emit('createWebRtcTransport', { sender: true }, async ({ params }: TransportParams) => {
                const transport = newDevice.createSendTransport(params);

                transport.on('connect', ({ dtlsParameters }, callback) => {
                    socket.emit('connectTransport', { transportId: transport.id, dtlsParameters }, callback);
                });

                transport.on('produce', ({ kind, rtpParameters }, callback) => {

                    socket.emit('produce', { transportId: transport.id, kind, rtpParameters }, (response: any) => {
                        if (!response || !response.id) {
                            console.error('Producer ID is missing in the response:', response);
                            return;
                        }
                        callback({ id: response.id });
                    });

                });


                const localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
                setStream(localStream);


                const videoTrack = localStream.getVideoTracks()[0];
                const audioTrack = localStream.getAudioTracks()[0];

                await transport.produce({ track: videoTrack });
                await transport.produce({ track: audioTrack });

                setSendTransport(transport);

                socket.emit('createWebRtcTransport', { sender: false }, async ({ params }: any) => {
                    const recvTrans = newDevice.createRecvTransport(params);

                    recvTrans.on('connect', ({ dtlsParameters }, callback) => {
                        socket.emit('connectTransport', { transportId: recvTrans.id, dtlsParameters }, callback);
                    });

                    setRecvTransport(recvTrans);


                    socket.emit('getProducers', async (producerIds: string[]) => {
                        const newStream = new MediaStream();

                        for (const producerId of producerIds) {
                            socket.emit('consume', {
                                rtpCapabilities: newDevice.rtpCapabilities,
                                consumerTransportId: recvTrans.id,
                                producerId
                            }, async ({ params }: any) => {
                                const consumer: mediasoupTypes.Consumer = await recvTrans.consume(params);

                                newStream.addTrack(consumer.track);
                            });
                        }

                        setRemoteStream(newStream);
                    });
                });

                setCallStarted(true);
            });
        });
    };

    const leaveCall = () => {
        console.log('Call Left');
        setCallStarted(false);
        stream?.getTracks().forEach(track => track.stop());
        remoteStream?.getTracks().forEach(track => track.stop());
        sendTransport?.close();
        recvTransport?.close();
        setStream(null);
        setRemoteStream(null);
        setSendTransport(null);
        setRecvTransport(null);
    };

    return (
        <div className="p-4 space-y-4">
            {stream && <VideoPlayer stream={stream} />}
            {remoteStream && <VideoPlayer stream={remoteStream} />}
            <Controls startCall={startCall} leaveCall={leaveCall} />
            {callStarted && <div className="text-green-500">Call in progress...</div>}
        </div>
    );
};

export default Room;
