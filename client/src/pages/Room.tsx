import { useRecoilValue } from 'recoil';
import { useEffect } from 'react';
import socket from '../api/socket';
import { currentRoomIdState } from '../store/roomState';
import { getMediasoupDevice } from '../lib/mediasoup';
import { useMediaStream } from '../hooks/useMediaStream';
import VideoPlayer from '../components/VideoPlayer';
import { types as mediasoupTypes } from "mediasoup-client";

const Room = () => {
    const roomId = useRecoilValue(currentRoomIdState);
    const stream = useMediaStream();

    useEffect(() => {
        if (!roomId) return;

        socket.emit('joinRoom', roomId, async (rtpCapabilities: mediasoupTypes.RtpCapabilities) => {
            const device = await getMediasoupDevice(rtpCapabilities);
            console.log('Device loaded:', device);
            // Next: create transports, produce media
        });

    }, [roomId]);

    if (!stream) return <div>Loading video...</div>;

    return (
        <div className="p-4 space-y-4">
            <VideoPlayer stream={stream} />
        </div>
    );
};

export default Room;
