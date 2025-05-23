import React, { useState, useCallback, useEffect, useRef } from "react";
import {
    Mic, MicOff, PhoneOff, Copy, Video, VideoOff, Users, Layout, X,
    Square, Circle, Upload
} from "lucide-react";
import { toast } from "sonner";
import { styles } from "./style";
import type { VideoCallProps, ParticipantView, RecordingConfig } from "../types";
import { uploadRecording } from "../lib/uploadRecording";

const DEFAULT_RECORDING_CONFIG: RecordingConfig = {
    mimeType: 'video/webm;codecs=vp9,opus',
    videoBitsPerSecond: 5000000,  // 5 Mbps
    audioBitsPerSecond: 128000,   // 128 kbps
    chunkDurationMs: 0,
};

const VideoCall: React.FC<VideoCallProps> = ({
    name,
    roomId,
    localVideoRef,
    remoteStreams,
    onLeave,
    onToggleMic,
}) => {
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [showConfirmLeave, setShowConfirmLeave] = useState(false);
    const [showParticipants, setShowParticipants] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [mainViewParticipant, setMainViewParticipant] = useState<ParticipantView | null>(null);

    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [recordingConfig, setRecordingConfig] = useState<RecordingConfig>(DEFAULT_RECORDING_CONFIG);

    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadComplete, setUploadComplete] = useState(false);

    // Recording refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);
    const recordingTimerRef = useRef<number | null>(null);
    const recordingStartTimeRef = useRef<number>(0);


    useEffect(() => {
        const initializeStream = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                setLocalStream(stream);

                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                    localVideoRef.current.play().catch(() => { });
                }

                setMainViewParticipant({
                    id: 'local',
                    stream: stream,
                    name: name,
                    isLocal: true,
                    isMuted: false,
                    isVideoOff: false
                });
            } catch (err) {
                console.error("Error accessing media devices:", err);
                toast.error("Failed to access camera or microphone");
            }
        };

        initializeStream();

        return () => {
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }

            // Clean up recording resources
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
            }

            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
        };
    }, []);

    const formatRecordingTime = (timeInSeconds: number): string => {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = timeInSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const createCompositeStream = (): MediaStream => {
        const compositeStream = new MediaStream();

        if (localStream && !isVideoOff) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                compositeStream.addTrack(videoTrack);
            }
        }

        if (localStream && !isMuted) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                compositeStream.addTrack(audioTrack);
            }
        }

        remoteStreams.forEach(remote => {
            if (remote.stream && remote.audioEnabled !== false) {
                const audioTracks = remote.stream.getAudioTracks();
                audioTracks.forEach(track => {
                    compositeStream.addTrack(track);
                });
            }
        });

        return compositeStream;
    };

    // Start recording
    const startRecording = async () => {
        try {
            if (!MediaRecorder.isTypeSupported(recordingConfig.mimeType)) {
                toast.error("Recording format not supported by your browser. Trying fallback format.");
                setRecordingConfig(prev => ({ ...prev, mimeType: 'video/webm' }));
            }

            const compositeStream = createCompositeStream();

            if (compositeStream.getTracks().length === 0) {
                toast.error("No tracks available to record");
                return;
            }

            const mediaRecorder = new MediaRecorder(compositeStream, {
                mimeType: recordingConfig.mimeType,
                videoBitsPerSecond: recordingConfig.videoBitsPerSecond,
                audioBitsPerSecond: recordingConfig.audioBitsPerSecond
            });

            recordedChunksRef.current = [];
            setUploadProgress(0);
            setIsUploading(false);
            setUploadComplete(false);

            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    recordedChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.start();

            recordingStartTimeRef.current = Date.now();
            recordingTimerRef.current = window.setInterval(() => {
                const elapsedSeconds = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
                setRecordingTime(elapsedSeconds);
            }, 1000);

            setIsRecording(true);
            toast.success("Recording started");
        } catch (error) {
            console.error("Error starting recording:", error);
            toast.error("Failed to start recording");
        }
    };

    // Stop recording and upload
    const stopRecording = async () => {
        if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
            return;
        }

        return new Promise<void>((resolve) => {
            if (mediaRecorderRef.current) {
                mediaRecorderRef.current.onstop = async () => {
                    // Clear timer
                    if (recordingTimerRef.current) {
                        clearInterval(recordingTimerRef.current);
                    }

                    // Create final blob from all chunks
                    if (recordedChunksRef.current.length > 0) {
                        const finalBlob = new Blob(recordedChunksRef.current, {
                            type: recordingConfig.mimeType
                        });

                        console.log(`Final recording size: ${finalBlob.size} bytes`);


                        try {
                            setIsUploading(true);
                            toast.success("Recording stopped - uploading...");

                            await uploadRecording(
                                finalBlob,
                                roomId,
                                0,
                                (progress) => {
                                    setUploadProgress(progress);
                                }
                            );

                            setUploadComplete(true);
                            toast.success("Recording uploaded successfully!");
                            console.log("Recording uploaded successfully");


                            setTimeout(() => {
                                setUploadProgress(0);
                                setIsUploading(false);
                                setUploadComplete(false);
                            }, 3000);

                        } catch (error) {
                            console.error("Failed to upload recording:", error);
                            toast.error("Failed to upload recording");
                            setIsUploading(false);
                        }
                    }


                    recordedChunksRef.current = [];
                    setIsRecording(false);
                    resolve();
                };

                // Stop the recorder
                mediaRecorderRef.current.stop();
            } else {
                resolve();
            }
        });
    };

    // Toggle recording state
    const handleToggleRecording = async () => {
        if (isRecording) {
            await stopRecording();
        } else {
            startRecording();
        }
    };

    const handleToggleMic = () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
                onToggleMic(!audioTrack.enabled);
                toast.success(`Microphone ${!audioTrack.enabled ? 'muted' : 'unmuted'}`);

                if (mainViewParticipant?.isLocal) {
                    setMainViewParticipant(prev => prev ? {
                        ...prev,
                        isMuted: !audioTrack.enabled
                    } : null);
                }
            }
        }
    };

    const handleToggleVideo = () => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoOff(!videoTrack.enabled);
                toast.success(`Camera ${!videoTrack.enabled ? 'turned off' : 'turned on'}`);

                if (mainViewParticipant?.isLocal) {
                    setMainViewParticipant(prev => prev ? {
                        ...prev,
                        isVideoOff: !videoTrack.enabled
                    } : null);
                }
            }
        }
    };

    const handleInvite = () => {
        navigator.clipboard.writeText(window.location.href).then(() => {
            toast.info("Invite link copied!")
        });
    };

    const handleToggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const setVideoSrcObject = (
        videoEl: HTMLVideoElement | null,
        stream: MediaStream | null | undefined
    ) => {
        if (!videoEl || !stream) return;
        if (videoEl.srcObject !== stream) {
            videoEl.srcObject = stream;
            videoEl.play().catch(() => { });
        }
    };

    const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
        if (node !== null) {
            localVideoRef.current = node;

            if (localStream) {
                node.srcObject = localStream;
                node.play().catch(() => { });
            }
        }
    }, [localVideoRef, localStream]);

    const handleSwitchMainView = (participant: ParticipantView) => {
        setMainViewParticipant(participant);
        toast.success(`Switched main view to ${participant.name}`);
    };

    const getAllParticipants = (): ParticipantView[] => {
        const participants: ParticipantView[] = [];

        if (localStream) {
            participants.push({
                id: 'local',
                stream: localStream,
                name: `${name} (You)`,
                isLocal: true,
                isMuted: isMuted,
                isVideoOff: isVideoOff
            });
        }

        remoteStreams.forEach(remote => {
            participants.push({
                id: remote.producerId,
                stream: remote.stream,
                name: remote.userName || "Guest",
                isLocal: false,
                isMuted: remote.audioEnabled === false,
                isVideoOff: remote.videoEnabled === false
            });
        });

        return participants;
    };

    const getThumbnailStreams = () => {
        const allParticipants = getAllParticipants();

        return allParticipants.filter(
            participant => participant.id !== mainViewParticipant?.id
        );
    };

    const thumbnailStreams = getThumbnailStreams();
    const allParticipants = getAllParticipants();

    return (
        <div className="flex flex-col h-screen bg-gray-900 text-white select-none overflow-hidden">
            <style>{styles}</style>

            <header className="flex items-center justify-between px-6 py-2 bg-gray-900 shadow z-10">
                <div className="flex items-center gap-3">
                    <div className="text-sm bg-gray-800 px-2 py-1 rounded flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span>{remoteStreams.length + 1} participants</span>
                    </div>

                    {isRecording && (
                        <div className="text-sm bg-red-800/70 px-2 py-1 rounded flex items-center gap-1">
                            <Circle size={8} className="text-red-500 animate-pulse" fill="currentColor" />
                            <span>Recording {formatRecordingTime(recordingTime)}</span>
                        </div>
                    )}

                    {/* Upload Progress Indicator */}
                    {isUploading && (
                        <div className="text-sm bg-blue-800/70 px-2 py-1 rounded flex items-center gap-2">
                            <Upload size={12} className="text-blue-400 animate-bounce" />
                            <div className="flex items-center gap-2">
                                <div className="w-20 h-1.5 bg-gray-600 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-400 transition-all duration-300 ease-out"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                                <span className="text-xs">{uploadProgress}%</span>
                            </div>
                        </div>
                    )}

                    {/* Upload Complete Status */}
                    {uploadComplete && (
                        <div className="text-sm bg-green-800/70 px-2 py-1 rounded flex items-center gap-1">
                            <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span>Upload complete</span>
                        </div>
                    )}
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
                    {/* Main video - shows the selected participant */}
                    <div className="relative flex-1 bg-black">
                        {mainViewParticipant ? (
                            <>
                                {mainViewParticipant.isVideoOff ? (
                                    <div className="flex items-center justify-center h-full bg-gray-800">
                                        <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center text-4xl font-bold">
                                            {mainViewParticipant.name.charAt(0).toUpperCase()}
                                        </div>
                                    </div>
                                ) : (
                                    <video
                                        autoPlay
                                        playsInline
                                        muted={mainViewParticipant.isLocal}
                                        className="w-full h-full object-contain"
                                        ref={(el) => mainViewParticipant.isLocal
                                            ? setVideoRef(el)
                                            : setVideoSrcObject(el, mainViewParticipant.stream)}
                                    />
                                )}
                                <div className="absolute bottom-4 left-4 bg-black/70 px-3 py-1.5 rounded text-sm flex items-center gap-2">
                                    {mainViewParticipant.name}
                                    {mainViewParticipant.isMuted &&
                                        <MicOff size={14} className="text-red-500" />
                                    }
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400">
                                Loading video...
                            </div>
                        )}
                    </div>

                    {sidebarOpen && thumbnailStreams.length > 0 && (
                        <aside className="w-64 bg-gray-900 p-2 overflow-y-auto space-y-2 border-l border-[#333333]">
                            {thumbnailStreams.map((participant) => (
                                <div
                                    key={participant.id}
                                    className="relative rounded-lg overflow-hidden transition-all shadow hover:shadow-md cursor-pointer"
                                    onClick={() => handleSwitchMainView(participant)}
                                >
                                    <div className="relative aspect-video">
                                        {participant.isVideoOff ? (
                                            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                                                <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-lg font-bold">
                                                    {participant.name.charAt(0).toUpperCase()}
                                                </div>
                                            </div>
                                        ) : (
                                            <video
                                                autoPlay
                                                playsInline
                                                muted={participant.isLocal}
                                                className="w-full h-full object-cover"
                                                ref={(el) => setVideoSrcObject(el, participant.stream)}
                                            />
                                        )}
                                        <div className="absolute bottom-1 left-1 bg-black/70 px-1.5 py-0.5 rounded text-xs flex items-center gap-1">
                                            <span>{participant.name}</span>
                                            {participant.isMuted &&
                                                <MicOff size={10} className="text-red-500" />
                                            }
                                        </div>
                                    </div>
                                    <div className="absolute inset-0 bg-blue-500/0 hover:bg-blue-500/20 transition-colors duration-200 flex items-center justify-center opacity-0 hover:opacity-100">
                                        <div className="bg-black/70 px-2 py-1 rounded text-xs">
                                            Switch to main view
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
                            <h3 className="font-semibold">Participants ({allParticipants.length})</h3>
                            <button onClick={() => setShowParticipants(false)} className="text-gray-400 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-2">
                            {allParticipants.map((participant) => (
                                <div
                                    key={participant.id}
                                    className={`py-2 px-3 flex items-center justify-between rounded hover:bg-gray-800 cursor-pointer ${participant.id === mainViewParticipant?.id ? 'bg-gray-700' : ''
                                        }`}
                                    onClick={() => handleSwitchMainView(participant)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full ${participant.isLocal ? 'bg-blue-600' : 'bg-gray-600'
                                            } flex items-center justify-center font-medium`}>
                                            {participant.name.charAt(0).toUpperCase()}
                                        </div>

                                        <span>{participant.name}</span>
                                        {participant.id === mainViewParticipant?.id && (
                                            <span className="text-xs bg-gray-600 px-1.5 py-0.5 rounded">Main View</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {participant.isMuted ?
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
            <footer className={"py-2 px-4 bg-gray-900 border-t border-[#333333] shadow-lg transition-opacity duration-300 "}>
                <div className="flex items-center justify-center gap-4 w-full">
                    <div className="flex items-center justify-center gap-2">

                        <div>
                            <button
                                onClick={handleToggleMic}
                                aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
                                className={`flex flex-col items-center justify-center px-3 py-2 rounded-md transition-all duration-200 transform hover:scale-105 bg-gray-800 hover:bg-gray-700
                        ${isMuted
                                        ? "text-gray-300 hover:text-red-400"
                                        : "text-gray-300 hover:text-green-400"
                                    }`}
                            >
                                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                                <span className="text-xs font-medium">{isMuted ? "Unmute" : "Mute"}</span>
                            </button>
                        </div>


                        <div>
                            <button
                                onClick={handleToggleVideo}
                                aria-label={isVideoOff ? "Turn on camera" : "Turn off camera"}
                                className={`flex flex-col items-center justify-center px-3 py-2 rounded-md transition-all duration-200 transform hover:scale-105 bg-gray-800 hover:bg-gray-700
                        ${isVideoOff
                                        ? "text-gray-300 hover:text-red-400"
                                        : "text-gray-300 hover:text-green-400"
                                    }`}
                            >
                                {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                                <span className="text-xs font-medium">Camera</span>
                            </button>
                        </div>

                        <div>
                            <button
                                onClick={handleInvite}
                                aria-label="Copy invite link"
                                className="flex flex-col items-center justify-center px-3 py-2 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-blue-300 transition-all duration-200 transform hover:scale-105"
                            >
                                <Copy className="w-5 h-5" />
                                <span className="text-xs font-medium">
                                    Invite
                                </span>
                            </button>
                        </div>

                        <div>
                            <button
                                onClick={handleToggleRecording}
                                aria-label={isRecording ? "Stop recording" : "Start recording"}
                                className={`flex flex-col items-center justify-center px-3 py-2 rounded-md transition-all duration-200 transform hover:scale-105
                        ${isRecording
                                        ? "bg-red-800 hover:bg-red-700 text-white"
                                        : "bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-red-400"
                                    }`}
                            >
                                {isRecording ?
                                    <Square className="w-5 h-5" /> :
                                    <Circle className="w-5 h-5" fill="currentColor" />
                                }
                                <span className="text-xs font-medium">
                                    {isRecording ? "Stop" : "Record"}
                                </span>
                            </button>
                        </div>
                        <div>
                            <button
                                onClick={() => setShowConfirmLeave(true)}
                                aria-label="Leave call"
                                className="flex flex-col items-center justify-center px-3 py-2 rounded-md bg-red-700 hover:bg-red-800 text-gray-300 transition-all duration-200 transform hover:scale-105"
                            >
                                <PhoneOff className="w-5 h-5" />
                                <span className="text-xs font-medium">Leave</span>
                            </button>
                        </div>
                    </div>
                </div>
            </footer>
            {showConfirmLeave && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50 animate-fade-in">
                    <div className="bg-gray-900 rounded-lg shadow-xl w-80 p-4 transform transition-all duration-300 scale-100 opacity-100"
                        style={{ animation: "fadeIn 0.2s ease-out" }}>
                        <h3 className="text-lg font-semibold mb-2">Leave Meeting?</h3>
                        <p className="text-gray-300 mb-4">Are you sure you want to leave this meeting?</p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowConfirmLeave(false)}
                                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm font-medium transition-colors duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onLeave}
                                className="px-4 py-2 bg-red-700 hover:bg-red-900 rounded text-sm font-medium transition-colors duration-200"
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