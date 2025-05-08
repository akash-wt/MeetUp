import { useEffect, useRef } from 'react';

interface VideoPlayerProps {
    stream: MediaStream;
}

const VideoPlayer = ({ stream }: VideoPlayerProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return <video ref={videoRef} autoPlay className="rounded-lg shadow-md" />;
};

export default VideoPlayer;
