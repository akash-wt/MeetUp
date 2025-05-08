import { useState, useEffect } from 'react';

export const useMediaStream = () => {
    const [stream, setStream] = useState<MediaStream | null>(null);

    useEffect(() => {
        const getStream = async () => {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,      

            });
            setStream(mediaStream);
        };

        getStream();
    }, []);

    return stream;
};



