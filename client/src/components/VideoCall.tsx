import React, { useState, useCallback } from "react";
import {
    Mic, MicOff, PhoneOff, Copy, Pin, PinOff, Video, VideoOff, Users, Layout, X,
} from "lucide-react";
import { toast } from "sonner";
import { styles } from "./style";
import type { VideoCallProps } from "../types";



const VideoCall: React.FC<VideoCallProps> = ({
    name,
    roomId,
    localVideoRef,
    remoteStreams,
    onLeave,
    onToggleMic,
    onToggleVideo,
}) => {
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [showConfirmLeave, setShowConfirmLeave] = useState(false);
    const [showParticipants, setShowParticipants] = useState(false);
    const [pinnedId, setPinnedId] = useState<string | "local" | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);


    const handleToggleMic = () => {
        if (localVideoRef.current?.srcObject) {
            const audioTrack = (localVideoRef.current.srcObject as MediaStream)
                .getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
                onToggleMic(!audioTrack.enabled);
                toast.success(`Microphone ${!audioTrack.enabled ? 'muted' : 'unmuted'}`);
            }
        }
    };


    const handleToggleVideo = () => {
        if (localVideoRef.current?.srcObject) {
            const videoTrack = (localVideoRef.current.srcObject as MediaStream)
                .getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoOff(!videoTrack.enabled);
                onToggleVideo(!videoTrack.enabled);
                toast.success(`Camera ${!videoTrack.enabled ? 'turned off' : 'turned on'}`);
            }
        }
    };

    const handleInvite = () => {
        navigator.clipboard.writeText(roomId).then(() => {
            toast.info("Room link copied!")
        });
    };


    // Toggle sidebar
    const handleToggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };


    const togglePin = (id: string | "local" | null) => {
        setPinnedId(prev => prev === id ? null : id);
    };


    const setVideoSrcObject = (
        videoEl: HTMLVideoElement | null,
        stream: MediaStream | null | undefined
    ) => {
        if (!videoEl) return;
        if (videoEl.srcObject !== stream) {
            videoEl.srcObject = stream || null;
            if (stream) videoEl.play().catch(() => { });
        }
    };

    const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
        if (node !== null) {
            navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                .then((stream) => {
                    node.srcObject = stream;
                    localVideoRef.current = node;  // <-- important: set ref here
                    node.play().catch(() => { });

                })
                .catch((err) => {
                    console.error("Error accessing media devices:", err);
                    toast.error("Failed to access camera or microphone");
                });
        }
    }, [localVideoRef]);



    // Get the main video stream to display based on layout and pins
    const getMainStream = () => {
        // Pinned stream takes precedence
        if (pinnedId) {
            if (pinnedId === "local") {
                return {
                    id: "local",
                    stream: localVideoRef.current?.srcObject as MediaStream | null,
                    name: `You (${name})`,
                    muted: true
                };
            } else {
                const remote = remoteStreams.find(r => r.producerId === pinnedId);
                if (remote) {
                    return {
                        id: remote.producerId,
                        stream: remote.stream,
                        name: remote.userName || "Guest",
                        muted: false
                    };
                }
            }
        }




        // Fallback to local
        return {
            id: "local",
            stream: localVideoRef.current?.srcObject as MediaStream | null,
            name: `You (${name})`,
            muted: true
        };
    };


    const getThumbnailStreams = () => {
        const mainId = getMainStream().id;
        const thumbnails = mainId === "local" ? [] : [{
            id: "local",
            stream: localVideoRef.current?.srcObject as MediaStream | null,
            name: `You (${name})`,
            muted: true,
            isVideoOff
        }];


        remoteStreams.forEach(remote => {
            if (remote.producerId !== mainId) {
                thumbnails.push({
                    id: remote.producerId,
                    stream: remote.stream,
                    name: remote.userName || "Guest",
                    muted: false,
                    isVideoOff: remote.videoEnabled === false
                });
            }
        });

        return thumbnails;
    };


    const mainStream = getMainStream();
    const thumbnailStreams = getThumbnailStreams();

    return (
        <div className="flex flex-col h-screen bg-gray-900 text-white select-none overflow-hidden">

            <style>{styles}</style>

            {/* Top bar */}
            <header className="flex items-center justify-between px-6 py-2 bg-gray-900 shadow z-10">

                <div className="flex items-center gap-3">
                    <div className="text-sm bg-gray-800 px-2 py-1 rounded flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span>{remoteStreams.length + 1} participants</span>
                    </div>
                </div>


                <div className="flex items-center gap-4">
                    <button
                        onClick={handleToggleSidebar}
                        className="text-gray-300 hover:text-white p-2 rounded-full hover:bg-gray-700 transition-colors duration-200"
                    >
                        <Layout size={18} />
                    </button>
                    <button
                        onClick={() => setShowParticipants(!showParticipants)}
                        className={`text-gray-300 hover:text-white p-2 rounded-full transition-colors duration-200 ${showParticipants ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
                    >
                        <Users size={18} />
                    </button>

                </div>
            </header>



            {/* Main content */}
            <main className="flex flex-1 bg-gray-900 overflow-hidden relative">
                <div className="flex flex-1 overflow-hidden">
                    {/* Main video */}
                    <div className="relative flex-1 bg-black">
                        {mainStream.stream ? (
                            <>
                                <video
                                    autoPlay
                                    playsInline
                                    muted={mainStream.muted}
                                    className="w-full h-full object-contain"
                                    ref={
                                        mainStream.id === "local"
                                            ? localVideoRef
                                            : (el) => setVideoSrcObject(el, mainStream.stream)
                                    }
                                />
                                <div className="absolute bottom-4 left-4 bg-black/70 px-3 py-1.5 rounded text-sm">
                                    {mainStream.name}
                                </div>
                                {mainStream.id !== "local" && !pinnedId && (
                                    <button
                                        className="absolute top-4 right-4 bg-black/60 p-2 rounded-full hover:bg-black/80"
                                        onClick={() => togglePin(mainStream.id)}
                                    >
                                        <Pin size={18} />
                                    </button>
                                )}
                                {pinnedId && (
                                    <button
                                        className="absolute top-4 right-4 bg-blue-500/80 p-2 rounded-full hover:bg-blue-600/80"
                                        onClick={() => togglePin(pinnedId)}
                                    >
                                        <PinOff size={18} />
                                    </button>
                                )}
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400">
                                No active video
                            </div>
                        )}
                    </div>


                    {sidebarOpen && thumbnailStreams.length > 0 && (
                        <aside className="w-64 bg-gray-900 p-2 overflow-y-auto space-y-2 border-l border-[#333333]">
                            {thumbnailStreams.map((stream) => (
                                <div
                                    key={stream.id}
                                    className={`relative rounded-lg overflow-hidden cursor-pointer transition-all shadow hover:shadow-md 
                      ${pinnedId === stream.id ? "ring-2 ring-blue-500" : ""}`}
                                    onClick={() => togglePin(stream.id)}
                                >
                                    <div className="relative aspect-video">
                                        {stream.isVideoOff ? (
                                            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                                                <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-lg font-bold">
                                                    {stream.name.charAt(0).toUpperCase()}
                                                </div>
                                            </div>
                                        ) : (
                                            <video
                                                autoPlay
                                                playsInline
                                                muted={stream.muted}
                                                className="w-full h-full object-cover"
                                                ref={
                                                    stream.id === "local"
                                                        ? setVideoRef
                                                        : (el) => setVideoSrcObject(el, stream.stream)
                                                }
                                            />
                                        )}
                                        <div className="absolute bottom-1 left-1 bg-black/70 px-1.5 py-0.5 rounded text-xs">
                                            {stream.name}
                                        </div>
                                        <div className="absolute bottom-1 right-1 flex gap-1">
                                            {stream.id === "local" && isMuted && (
                                                <span className="bg-red-500/80 rounded-full p-0.5">
                                                    <MicOff size={10} />
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </aside>
                    )}
                </div>

                {/* Participants sidebar */}
                {showParticipants && (
                    <div className="absolute right-0 top-0 bottom-0 w-72 bg-gray-900 border-l border-[#333333] shadow-lg z-20 overflow-y-auto">
                        <div className="p-3 border-b border-[#333333] flex justify-between items-center">
                            <h3 className="font-semibold">Participants ({remoteStreams.length + 1})</h3>
                            <button onClick={() => setShowParticipants(false)} className="text-gray-400 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-2">
                            <div className="py-2 px-3 flex items-center justify-between rounded hover:bg-gray-800">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-medium">
                                        {name.charAt(0).toUpperCase()}
                                    </div>
                                    <span>{name} (You)</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    {isMuted ? <MicOff size={16} className="text-red-500" /> : <Mic size={16} className="text-green-500" />}
                                </div>
                            </div>
                            {remoteStreams.map(({ producerId, userName, audioEnabled }) => (
                                <div key={producerId} className="py-2 px-3 flex items-center justify-between rounded hover:bg-gray-800">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center font-medium">
                                            {(userName || "G").charAt(0).toUpperCase()}
                                        </div>
                                        <span>{userName || "Guest"}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {audioEnabled === false ?
                                            <MicOff size={16} className="text-red-500" /> :
                                            <Mic size={16} className="text-green-500" />
                                        }
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}


            </main>

            {/* Controls */}
            <footer className={"py-2 px-4 bg-gray-900 border-t border-[#333333 shadow-lg transition-opacity duration-300 "}>
                <div className="flex items-center justify-center gap-4 w-full">
                    <div className="flex items-center justify-center gap-2">

                        <div> <button
                            onClick={handleToggleMic}
                            aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
                            className={`flex flex-col items-center justify-center px-3 py-2 rounded-md transition-all duration-200 transform hover:scale-105 ${isMuted
                                ? "bg-gray-800 text-red-400 hover:bg-gray-700"
                                : "bg-gray-800 text-green-400 hover:bg-gray-700"
                                }`}
                        >
                            {isMuted ? <MicOff className="w-5 h-5 mb-1" /> : <Mic className="w-5 h-5 mb-1" />}
                            <span className="text-xs font-medium">{isMuted ? "Unmute" : "Mute"}</span>
                        </button>
                        </div>

                        <div>  <button
                            onClick={handleToggleVideo}
                            aria-label={isVideoOff ? "Turn on camera" : "Turn off camera"}
                            className={`flex flex-col items-center justify-center px-3 py-2 rounded-md transition-all duration-200 transform hover:scale-105 ${isVideoOff
                                ? "bg-gray-800 text-red-400 hover:bg-gray-700"
                                : "bg-gray-800 text-green-400 hover:bg-gray-700"
                                }`}
                        >
                            {isVideoOff ? <VideoOff className="w-5 h-5 mb-1" /> : <Video className="w-5 h-5 mb-1" />}
                            <span className="text-xs font-medium">Camera</span>
                        </button></div>


                        <div> <button
                            onClick={handleInvite}
                            aria-label="Copy invite link"
                            className="flex flex-col items-center justify-center px-3 py-2 rounded-md bg-gray-800 hover:bg-gray-700 text-white transition-all duration-200 transform hover:scale-105"
                        >
                            <Copy className="w-5 h-5 mb-1" />
                            <span className="text-xs font-medium">
                                Invite
                            </span>
                        </button>
                        </div>
                    </div>

                    <div className="absolute right-4"> <button
                        onClick={() => setShowConfirmLeave(true)}
                        aria-label="Leave call"
                        className="flex items-center justify-center gap-1 px-3 py-2 rounded-md bg-red-700 hover:bg-red-800 text-white transition-all duration-200 transform hover:scale-105"
                    >
                        <PhoneOff className="w-5 h-5" />
                        <span className="text-sm font-medium">Leave</span>
                    </button></div>
                </div>
            </footer>


            {showConfirmLeave && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50 animate-fade-in">
                    <div className="bg-[#2a2a2a] rounded-lg shadow-xl w-80 p-4 transform transition-all duration-300 scale-100 opacity-100"
                        style={{ animation: "fadeIn 0.2s ease-out" }}>
                        <h3 className="text-lg font-semibold mb-2">Leave Meeting?</h3>
                        <p className="text-gray-300 mb-4">Are you sure you want to leave this meeting?</p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowConfirmLeave(false)}
                                className="px-4 py-2 bg-[#3a3a3a] hover:bg-[#444444] rounded text-sm font-medium transition-colors duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onLeave}
                                className="px-4 py-2 bg-red-700 hover:bg-red-800 rounded text-sm font-medium transition-colors duration-200"
                            >
                                Leave
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>

    );
};

export default VideoCall;