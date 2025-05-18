import React, { useState, useRef, useEffect, RefObject } from "react";
import {
    Mic, MicOff,
    PhoneOff,
    ScreenShare,
    Copy,
    Pin, PinOff,
    Video, VideoOff,
    Settings,
    Users,
    MessageSquare,
    Layout,
    CheckCircle2,
    X,
    Volume2,
    VolumeX
} from "lucide-react";

type RemoteStream = {
    producerId: string;
    stream: MediaStream;
    userName?: string;
    audioEnabled?: boolean;
    videoEnabled?: boolean;
};

type VideoCallProps = {
    name: string;
    roomId: string;
    localVideoRef: RefObject<HTMLVideoElement>;
    remoteStreams: RemoteStream[];
    onLeave: () => void;
    onToggleMic: (muted: boolean) => void;
    onToggleVideo: (disabled: boolean) => void;
    onShareScreen: (screenTrack: MediaStreamTrack | null) => void;
};

type LayoutMode = "gallery" | "speaker" | "presentation";

// CSS for animations
const styles = `
@keyframes fadeInOut {
  0% { opacity: 0; transform: translate(-50%, -20px); }
  10% { opacity: 1; transform: translate(-50%, 0); }
  90% { opacity: 1; transform: translate(-50%, 0); }
  100% { opacity: 0; transform: translate(-50%, -20px); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.animate-fade-in-out {
  animation: fadeInOut 3s ease-in-out;
}

.transition-transform {
  transition-property: transform;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 200ms;
}

.hover\\:scale-105:hover {
  transform: scale(1.05);
}

.transition-opacity {
  transition-property: opacity;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 300ms;
}

.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 200ms;
}

.transition-colors {
  transition-property: background-color, border-color, color, fill, stroke;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 200ms;
}
`;

const VideoCall: React.FC<VideoCallProps> = ({
    name,
    roomId,
    localVideoRef,
    remoteStreams,
    onLeave,
    onToggleMic,
    onToggleVideo,
    onShareScreen,
}) => {
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const [showConfirmLeave, setShowConfirmLeave] = useState(false);
    const [layout, setLayout] = useState<LayoutMode>("speaker");
    const [showParticipants, setShowParticipants] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [pinnedId, setPinnedId] = useState<string | "local" | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    // For animations
    const [isControlsVisible, setIsControlsVisible] = useState(true);
    const controlsTimer = useRef<NodeJS.Timeout | null>(null);

    // Auto-hide controls after inactivity
    useEffect(() => {
        const showControls = () => {
            setIsControlsVisible(true);

            if (controlsTimer.current) {
                clearTimeout(controlsTimer.current);
            }

            controlsTimer.current = setTimeout(() => {
                if (!showParticipants && !showChat && !showConfirmLeave) {
                    setIsControlsVisible(false);
                }
            }, 5000);
        };

        window.addEventListener('mousemove', showControls);
        window.addEventListener('click', showControls);

        return () => {
            window.removeEventListener('mousemove', showControls);
            window.removeEventListener('click', showControls);
            if (controlsTimer.current) clearTimeout(controlsTimer.current);
        };
    }, [showParticipants, showChat, showConfirmLeave]);

    // Automatically enter speaker view when someone shares screen
    useEffect(() => {
        if (isScreenSharing && layout !== "presentation") {
            setLayout("presentation");
            showNotification("Entered presentation mode", "success");
        }
    }, [isScreenSharing]);

    // Show notification
    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    // Handle mic toggle
    const handleToggleMic = () => {
        if (localVideoRef.current?.srcObject) {
            const audioTrack = (localVideoRef.current.srcObject as MediaStream)
                .getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
                onToggleMic(!audioTrack.enabled);
                showNotification(`Microphone ${!audioTrack.enabled ? 'muted' : 'unmuted'}`, 'success');
            }
        }
    };

    // Handle video toggle
    const handleToggleVideo = () => {
        if (localVideoRef.current?.srcObject) {
            const videoTrack = (localVideoRef.current.srcObject as MediaStream)
                .getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoOff(!videoTrack.enabled);
                onToggleVideo(!videoTrack.enabled);
                showNotification(`Camera ${!videoTrack.enabled ? 'turned off' : 'turned on'}`, 'success');
            }
        }
    };

    // Handle screen share
    const handleShareScreen = async () => {
        try {
            if (isScreenSharing) {
                setIsScreenSharing(false);
                onShareScreen(null);
                showNotification("Screen sharing stopped", "success");
            } else {
                const stream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                });
                const screenTrack = stream.getVideoTracks()[0];

                // Listen for the user ending screen share
                screenTrack.addEventListener('ended', () => {
                    setIsScreenSharing(false);
                    onShareScreen(null);
                    showNotification("Screen sharing ended", "success");
                });

                setIsScreenSharing(true);
                onShareScreen(screenTrack);
                showNotification("Screen sharing started", "success");
            }
        } catch (err) {
            console.error("Screen share error:", err);
            onShareScreen(null);
            showNotification("Failed to share screen", "error");
        }
    };

    // Copy invite link to clipboard
    const handleInvite = () => {
        navigator.clipboard.writeText(window.location.href).then(() => {
            setCopySuccess(true);
            showNotification("Meeting link copied to clipboard", "success");
            setTimeout(() => setCopySuccess(false), 2000);
        });
    };

    // Toggle layout mode
    const handleToggleLayout = () => {
        if (layout === "gallery") setLayout("speaker");
        else if (layout === "speaker") setLayout("gallery");
    };

    // Toggle sidebar
    const handleToggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    // Focus or pin a participant
    const togglePin = (id: string | "local" | null) => {
        setPinnedId(prev => prev === id ? null : id);
    };

    // Set video srcObject when stream changes
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

    // Initialize local video stream on mount
    useEffect(() => {
        if (localVideoRef.current && localVideoRef.current.srcObject === null) {
            // If there's no srcObject assigned to the local video element yet,
            // check if media devices are available and request the user's camera/mic
            if (navigator.mediaDevices) {
                navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                    .then((stream) => {
                        if (localVideoRef.current) {
                            localVideoRef.current.srcObject = stream;
                            localVideoRef.current.play().catch(() => { });
                            showNotification("Camera and microphone connected", "success");
                        }
                    })
                    .catch((err) => {
                        console.error("Error accessing media devices:", err);
                        showNotification("Failed to access camera or microphone", "error");
                    });
            }
        }
    }, []);

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

        // In speaker view, use the most recent active speaker (simplified here)
        // In a real app, you'd track audio levels to determine active speaker
        if (layout === "speaker" || layout === "presentation") {
            if (remoteStreams.length > 0) {
                const remote = remoteStreams[0];
                return {
                    id: remote.producerId,
                    stream: remote.stream,
                    name: remote.userName || "Guest",
                    muted: false
                };
            } else {
                return {
                    id: "local",
                    stream: localVideoRef.current?.srcObject as MediaStream | null,
                    name: `You (${name})`,
                    muted: true
                };
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

    // Get all streams to display as thumbnails
    const getThumbnailStreams = () => {
        const mainId = getMainStream().id;

        // Add local stream if not already main
        const thumbnails = mainId === "local" ? [] : [{
            id: "local",
            stream: localVideoRef.current?.srcObject as MediaStream | null,
            name: `You (${name})`,
            muted: true,
            isVideoOff
        }];

        // Add all remote streams except main
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

    // Main stream for display
    const mainStream = getMainStream();
    const thumbnailStreams = getThumbnailStreams();

    return (
        <div className="flex flex-col h-screen bg-[#1a1a1a] text-white select-none overflow-hidden">
            {/* Inject custom animation styles */}
            <style>{styles}</style>

            {/* Top bar */}
            <header className="flex items-center justify-between px-6 py-2 bg-[#232323] shadow z-10">
                <div className="flex items-center gap-3">
                    <h1 className="font-semibold text-lg">Meeting: {roomId}</h1>
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
                    <button
                        onClick={() => setShowChat(!showChat)}
                        className={`text-gray-300 hover:text-white p-2 rounded-full transition-colors duration-200 ${showChat ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
                    >
                        <MessageSquare size={18} />
                    </button>
                </div>
            </header>

            {/* Main content */}
            <main className="flex flex-1 bg-[#121212] overflow-hidden relative">
                {/* Gallery view */}
                {layout === "gallery" && (
                    <div className="w-full h-full p-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 auto-rows-fr">
                        {/* Local video */}
                        <div className="relative bg-black rounded-lg overflow-hidden">
                            <video
                                ref={localVideoRef}
                                autoPlay
                                playsInline
                                muted
                                className={`w-full h-full object-cover ${isVideoOff ? 'opacity-0' : ''}`}
                            />
                            {isVideoOff && (
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                                    <div className="w-20 h-20 rounded-full bg-gray-600 flex items-center justify-center text-2xl font-bold">
                                        {name.charAt(0).toUpperCase()}
                                    </div>
                                </div>
                            )}
                            <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-xs">
                                You {isMuted && <MicOff size={12} className="inline ml-1" />}
                            </div>
                        </div>

                        {/* Remote videos */}
                        {remoteStreams.map(({ producerId, stream, userName, audioEnabled }) => (
                            <div key={producerId} className="relative bg-black rounded-lg overflow-hidden">
                                <video
                                    autoPlay
                                    playsInline
                                    className="w-full h-full object-cover"
                                    ref={(el) => setVideoSrcObject(el, stream)}
                                />
                                <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-xs">
                                    {userName || "Guest"} {audioEnabled === false && <MicOff size={12} className="inline ml-1" />}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Speaker view or presentation view */}
                {(layout === "speaker" || layout === "presentation") && (
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

                        {/* Side panel with thumbnails (conditionally shown) */}
                        {sidebarOpen && thumbnailStreams.length > 0 && (
                            <aside className="w-64 bg-[#1a1a1a] p-2 overflow-y-auto space-y-2 border-l border-[#333333]">
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
                                                            ? localVideoRef
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
                )}

                {/* Participants sidebar */}
                {showParticipants && (
                    <div className="absolute right-0 top-0 bottom-0 w-72 bg-[#1a1a1a] border-l border-[#333333] shadow-lg z-20 overflow-y-auto">
                        <div className="p-3 border-b border-[#333333] flex justify-between items-center">
                            <h3 className="font-semibold">Participants ({remoteStreams.length + 1})</h3>
                            <button onClick={() => setShowParticipants(false)} className="text-gray-400 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-2">
                            <div className="py-2 px-3 flex items-center justify-between rounded hover:bg-[#2a2a2a]">
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
                                <div key={producerId} className="py-2 px-3 flex items-center justify-between rounded hover:bg-[#2a2a2a]">
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

                {/* Chat sidebar (placeholder) */}
                {showChat && (
                    <div className="absolute right-0 top-0 bottom-0 w-72 bg-[#1a1a1a] border-l border-[#333333] shadow-lg z-20 overflow-hidden flex flex-col">
                        <div className="p-3 border-b border-[#333333] flex justify-between items-center">
                            <h3 className="font-semibold">Meeting Chat</h3>
                            <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3">
                            <div className="text-gray-400 text-center">
                                Chat messages will appear here
                            </div>
                        </div>
                        <div className="p-3 border-t border-[#333333]">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Type a message..."
                                    className="flex-1 bg-[#2a2a2a] border border-[#3a3a3a] rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <button className="bg-blue-600 hover:bg-blue-700 rounded px-3 py-2 text-sm font-medium">
                                    Send
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Notification */}
                {notification && (
                    <div
                        className={`absolute top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-md shadow-lg flex items-center gap-2 z-50 animate-fade-in-out ${notification.type === 'success' ? 'bg-green-800' : 'bg-red-800'
                            }`}
                        style={{
                            animation: 'fadeInOut 3s ease-in-out'
                        }}
                    >
                        {notification.type === 'success' ?
                            <CheckCircle2 size={16} className="text-green-300" /> :
                            <X size={16} className="text-red-300" />
                        }
                        <span>{notification.message}</span>
                    </div>
                )}
            </main>

            {/* Controls */}
            <footer className={`py-2 px-4 bg-[#232323] border-t border-[#333333] shadow-lg transition-opacity duration-300 ${isControlsVisible ? 'opacity-100' : 'opacity-0'}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => { }}
                            aria-label="Settings"
                            className="p-2 text-gray-300 hover:text-white hover:bg-[#3a3a3a] rounded-full transition-colors duration-200"
                        >
                            <Settings size={20} />
                        </button>
                    </div>

                    <div className="flex items-center justify-center gap-1">
                        <button
                            onClick={handleToggleMic}
                            aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
                            className={`flex flex-col items-center justify-center px-3 py-2 rounded-md transition-all duration-200 transform hover:scale-105 ${isMuted
                                ? "bg-[#3a3a3a] text-red-400 hover:bg-[#444444]"
                                : "bg-[#3a3a3a] text-green-400 hover:bg-[#444444]"
                                }`}
                        >
                            {isMuted ? <MicOff className="w-5 h-5 mb-1" /> : <Mic className="w-5 h-5 mb-1" />}
                            <span className="text-xs font-medium">{isMuted ? "Unmute" : "Mute"}</span>
                        </button>

                        <button
                            onClick={handleToggleVideo}
                            aria-label={isVideoOff ? "Turn on camera" : "Turn off camera"}
                            className={`flex flex-col items-center justify-center px-3 py-2 rounded-md transition-all duration-200 transform hover:scale-105 ${isVideoOff
                                ? "bg-[#3a3a3a] text-red-400 hover:bg-[#444444]"
                                : "bg-[#3a3a3a] text-green-400 hover:bg-[#444444]"
                                }`}
                        >
                            {isVideoOff ? <VideoOff className="w-5 h-5 mb-1" /> : <Video className="w-5 h-5 mb-1" />}
                            <span className="text-xs font-medium">Camera</span>
                        </button>

                        <button
                            onClick={handleShareScreen}
                            aria-label={isScreenSharing ? "Stop sharing" : "Share screen"}
                            className={`flex flex-col items-center justify-center px-3 py-2 rounded-md transition-all duration-200 transform hover:scale-105 ${isScreenSharing
                                ? "bg-blue-700 text-white hover:bg-blue-800"
                                : "bg-[#3a3a3a] text-white hover:bg-[#444444]"
                                }`}
                        >
                            <ScreenShare className="w-5 h-5 mb-1" />
                            <span className="text-xs font-medium">{isScreenSharing ? "Stop" : "Share"}</span>
                        </button>

                        <button
                            onClick={handleToggleLayout}
                            aria-label="Change layout"
                            className="flex flex-col items-center justify-center px-3 py-2 rounded-md bg-[#3a3a3a] hover:bg-[#444444] text-white transition-all duration-200 transform hover:scale-105"
                        >
                            <Layout className="w-5 h-5 mb-1" />
                            <span className="text-xs font-medium">Layout</span>
                        </button>

                        <button
                            onClick={handleInvite}
                            aria-label="Copy invite link"
                            className="flex flex-col items-center justify-center px-3 py-2 rounded-md bg-[#3a3a3a] hover:bg-[#444444] text-white transition-all duration-200 transform hover:scale-105"
                        >
                            <Copy className="w-5 h-5 mb-1" />
                            <span className="text-xs font-medium">
                                {copySuccess ? "Copied!" : "Invite"}
                            </span>
                        </button>
                    </div>

                    <button
                        onClick={() => setShowConfirmLeave(true)}
                        aria-label="Leave call"
                        className="flex items-center justify-center gap-1 px-3 py-2 rounded-md bg-red-700 hover:bg-red-800 text-white transition-all duration-200 transform hover:scale-105"
                    >
                        <PhoneOff className="w-5 h-5" />
                        <span className="text-sm font-medium">Leave</span>
                    </button>
                </div>
            </footer>

            {/* Leave confirmation dialog */}
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
