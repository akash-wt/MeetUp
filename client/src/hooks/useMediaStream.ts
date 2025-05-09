import { useState, useEffect } from 'react';

export const useMediaStream = () => {
    
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [permissionDenied, setPermissionDenied] = useState(false);

    useEffect(() => {
        const getStream = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true,
                });
                setStream(mediaStream);
                setPermissionDenied(false);
            } catch (error) {
                console.error("Error getting media stream:", error);
                setPermissionDenied(true);
            }
        };

        getStream();
    }, []);

    return { stream, permissionDenied };
};
