import { useEffect, useState } from 'react';
import { Plus, Download, History, Play, Loader2, Calendar, Clock, HardDrive, Video, Users, Share2, FileVideo } from 'lucide-react';
import { nanoid } from 'nanoid';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { BACKEND_URL } from '../config';


interface Recording {
    id: number;
    name: string;
    url: string;
    date: string;
    duration: string;
    size: string;
    thumbnail: string;
}

const Dashboard = () => {
    const [roomId, setRoomId] = useState('');
    const [isCreatingRoom, setIsCreatingRoom] = useState(true);
    const [showVideoModal, setShowVideoModal] = useState(false);
    const [currentVideoUrl, setCurrentVideoUrl] = useState('');
    const [currentVideoName, setCurrentVideoName] = useState('');
    const [downloadingId, setDownloadingId] = useState(null);
    const [recordings, setRecordings] = useState<Recording[]>([]);
    const [loadingVideos, setLoadingVideos] = useState(false);

    const user = localStorage.getItem("user")
    const userData = user ? JSON.parse(user) : null;
    const { email } = userData;
    const nevigate = useNavigate();

    interface VideoMetadata {
        duration: string;
        size: string;
    }

    useEffect(() => {
        async function fetchVideos() {
            if (!email) return;

            setLoadingVideos(true);
            try {
                const response = await axios.get(`${BACKEND_URL}/api/presign/videos`, {
                    params: { email },
                });
                const data = response.data;


                if (data.videos) {
                    const videoData = await Promise.all(
                        data.videos.map(async (url: string, index: string) => {
                            const { duration, size } = await getVideoMetadata(url);
                            return {
                                id: index + 1,
                                name: `Recording ${index + 1}`,
                                url,
                                date: new Date(Date.now() - (Number(index) * 86400000)).toLocaleDateString(),
                                duration: duration || 'Unknown',
                                size: size || 'Unknown',
                                thumbnail: `https://images.unsplash.com/photo-${1611224923853 + index}?w=300&h=200&fit=crop`
                            };
                        })
                    );
                    setRecordings(videoData);
                } else {
                    setRecordings([]);
                }
            } catch (err) {
                console.error('Error fetching videos:', err);
                setRecordings([]);
            } finally {
                setLoadingVideos(false);
            }
        }

        fetchVideos();
    }, [email]);



    const getVideoMetadata = async (url: string): Promise<VideoMetadata> => {
        return new Promise((resolve) => {
            const video = document.createElement('video');
            video.preload = 'metadata';

            video.onloadedmetadata = () => {
                const duration = formatDuration(video.duration);
                const size = 'Unknown';
                resolve({ duration, size });
            };

            video.onerror = () => {
                resolve({ duration: 'Unknown', size: 'Unknown' });
            };

            video.src = url;
        });
    };

    interface FormatDuration {
        (seconds: number): string;
    }

    const formatDuration: FormatDuration = (seconds) => {
        if (isNaN(seconds)) return 'Unknown';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleCreateRoom = () => {
        const newRoomId = nanoid(6);
        nevigate(`room/${newRoomId}`);
    };

    const handleJoinRoom = () => {
        if (roomId.trim()) {
            nevigate(`room/${roomId}`);
        }
    };

    const handleDownload = async (recording: any) => {
        setDownloadingId(recording.id);

        try {
            window.open(recording.url, '_blank');

            console.log(`Download completed for: ${recording.name}`);
        } catch (error) {
            console.error('Error during download:', error);
            try {
                window.open(recording.url, '_blank');
            } catch (fallbackError) {
                console.error('Fallback failed:', fallbackError);
                alert('Download failed. Please try again or contact support.');
            }
        } finally {
            setTimeout(() => {
                setDownloadingId(null);
            }, 1000);
        }
    };

    interface HandlePlayVideo {
        (recording: Recording): void;
    }

    const handlePlayVideo: HandlePlayVideo = (recording) => {
        setCurrentVideoUrl(recording.url);
        setCurrentVideoName(recording.name);
        setShowVideoModal(true);
    };

    interface VideoPlayerModalProps {
        url: string;
        name: string;
        onClose: () => void;
    }

    const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ url, name, onClose }) => (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-50 backdrop-blur">
            <div className="relative bg-gray-900 rounded-2xl p-6 w-full max-w-2xl border border-gray-800 shadow-xl flex flex-col space-y-4">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-gray-400 hover:text-white text-xl bg-gray-800 hover:bg-gray-700 rounded-full w-9 h-9 flex items-center justify-center transition"
                    aria-label="Close"
                >
                    ×
                </button>

                {/* Header */}
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
                        <Video className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">{name || 'Video Playback'}</h3>
                        <p className="text-xs text-gray-400">HD video streaming</p>
                    </div>
                </div>

                {/* Video */}
                {url ? (
                    <div className="rounded-lg overflow-hidden border border-gray-700 bg-black">
                        <video
                            controls
                            src={url}
                            className="w-full h-auto"
                            autoPlay
                            controlsList="nodownload"
                        >
                            Your browser does not support the video tag.
                        </video>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-56 bg-gray-800 rounded-lg">
                        <div className="text-center">
                            <FileVideo className="w-10 h-10 text-gray-500 mx-auto mb-2" />
                            <p className="text-gray-400 text-sm">No video available</p>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );


    return (
        <div className="  text-white font-sans">
            <div className="relative container mx-auto px-4 sm:px-6 py-8">

                <div className="grid lg:grid-cols-3 gap-8">

                    <div className="lg:col-span-2">
                        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-2xl border border-gray-700/50">
                            <div className="mb-8 text-center">
                                <h2 className="text-2xl sm:text-3xl font-bold mb-3 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                                    Start Your Meeting
                                </h2>
                                <p className="text-gray-400 text-sm sm:text-base">Create a new room or join an existing one</p>
                            </div>

                            <div className="flex justify-center mb-8">
                                <div className="bg-gray-700/50 backdrop-blur-sm rounded-xl p-1.5 flex border border-gray-600">
                                    <button
                                        onClick={() => setIsCreatingRoom(true)}
                                        className={`px-4 sm:px-6 py-3 rounded-lg transition-all duration-200 text-sm sm:text-base font-medium ${isCreatingRoom
                                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg transform scale-105'
                                            : 'text-gray-400 hover:text-white hover:bg-gray-600/50'
                                            }`}
                                    >
                                        <div className="flex items-center space-x-2">
                                            <Plus className="w-4 h-4" />
                                            <span>Create Room</span>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => setIsCreatingRoom(false)}
                                        className={`px-4 sm:px-6 py-3 rounded-lg transition-all duration-200 text-sm sm:text-base font-medium ${!isCreatingRoom
                                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg transform scale-105'
                                            : 'text-gray-400 hover:text-white hover:bg-gray-600/50'
                                            }`}
                                    >
                                        <div className="flex items-center space-x-2">
                                            <Users className="w-4 h-4" />
                                            <span>Join Room</span>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {isCreatingRoom ? (
                                <div className="text-center space-y-6">
                                    <div className="bg-gradient-to-br from-gray-700/50 to-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-600/50">
                                        <div className="p-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full w-fit mx-auto mb-6">
                                            <Plus className="w-8 h-8 text-white" />
                                        </div>
                                        <h3 className="text-xl font-bold mb-3 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                                            Create New Room
                                        </h3>
                                        <p className="text-gray-400 mb-6 text-sm sm:text-base">
                                            Start an instant meeting with a unique room ID
                                        </p>
                                        <button
                                            onClick={handleCreateRoom}
                                            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium py-3 px-8 rounded-xl transition-all duration-200 text-base sm:text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <Plus className="w-5 h-5" />
                                                <span>Create Room</span>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="bg-gradient-to-br from-gray-700/50 to-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-600/50">
                                        <label htmlFor="roomCode" className="block text-sm font-medium mb-3 text-gray-300">
                                            <div className="flex items-center space-x-2">
                                                <Share2 className="w-4 h-4" />
                                                <span>Room Code</span>
                                            </div>
                                        </label>
                                        <input
                                            type="text"
                                            id="roomCode"
                                            className="bg-gray-700/70 backdrop-blur-sm text-white rounded-xl px-4 py-4 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center text-xl tracking-wider font-mono border border-gray-600/50"
                                            placeholder="Enter room code"
                                            value={roomId}
                                            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                                        />
                                    </div>
                                    <button
                                        onClick={handleJoinRoom}
                                        disabled={!roomId.trim()}
                                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-base sm:text-lg shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
                                    >
                                        <div className="flex items-center justify-center space-x-2">
                                            <Users className="w-5 h-5" />
                                            <span>Join Room</span>
                                        </div>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recordings Panel - Fixed height with scrollbar */}
                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-700/50 flex flex-col h-[600px]">
                            {/* Header - Fixed */}
                            <div className="flex-none p-6 pb-4">
                                <div className="flex items-center space-x-3 mb-2">
                                    <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg">
                                        <History className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                                            Recent Recordings
                                        </h3>
                                        <p className="text-xs text-gray-400">Your meeting recordings</p>
                                    </div>
                                </div>
                            </div>

                            {/* Scrollable content area */}
                            <div className="flex-1 px-6 pb-6 overflow-y-auto scrollbar-hide">
                                <div className="space-y-4">
                                    {loadingVideos ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                                            <span className="ml-2 text-gray-400">Loading recordings...</span>
                                        </div>
                                    ) : recordings.length === 0 ? (
                                        <div className="text-center py-8">
                                            <FileVideo className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                                            <p className="text-gray-500 text-sm">No recordings found</p>
                                        </div>
                                    ) : (
                                        recordings.map((recording) => (
                                            <div
                                                key={recording.id}
                                                className="bg-gradient-to-br from-gray-700/50 to-gray-800/50 backdrop-blur-sm p-4 rounded-xl border border-gray-600/50 hover:border-indigo-500/50 transition-all duration-200 flex-shrink-0"
                                            >
                                                <div className="flex items-center space-x-4">
                                                    <div
                                                        className="relative w-20 h-14 bg-gradient-to-br from-gray-600 to-gray-700 rounded-lg flex items-center justify-center cursor-pointer overflow-hidden flex-shrink-0 group border border-gray-600"
                                                        onClick={() => handlePlayVideo(recording)}
                                                    >
                                                        <Play className="w-6 h-6 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                                                        <div className="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-10 transition-all duration-200"></div>
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-white truncate">{recording.name}</p>
                                                        <div className="flex items-center space-x-3 mt-1">
                                                            <div className="flex items-center space-x-1 text-xs text-gray-400">
                                                                <Calendar className="w-3 h-3" />
                                                                <span>{recording.date}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center space-x-4 mt-2">
                                                            <div className="flex items-center space-x-1 text-xs text-gray-400">
                                                                <Clock className="w-3 h-3" />
                                                                <span>{recording.duration}</span>
                                                            </div>
                                                            <div className="flex items-center space-x-1 text-xs text-gray-400">
                                                                <HardDrive className="w-3 h-3" />
                                                                <span>{recording.size}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col space-y-2">
                                                        <button
                                                            onClick={() => handlePlayVideo(recording)}
                                                            className="p-2 hover:bg-indigo-600/50 rounded-lg transition-all duration-200 group"
                                                            aria-label={`Play ${recording.name}`}
                                                        >
                                                            <Play className="w-4 h-4 text-indigo-400 group-hover:text-indigo-300" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDownload(recording)}
                                                            className="p-2 hover:bg-green-600/50 rounded-lg transition-all duration-200 group"
                                                            aria-label={`Download ${recording.name}`}
                                                            disabled={downloadingId === recording.id}
                                                        >
                                                            {downloadingId === recording.id ? (
                                                                <Loader2 className="w-4 h-4 text-green-400 animate-spin" />
                                                            ) : (
                                                                <Download className="w-4 h-4 text-green-400 group-hover:text-green-300" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showVideoModal && (
                <VideoPlayerModal
                    url={currentVideoUrl}
                    name={currentVideoName}
                    onClose={() => setShowVideoModal(false)}
                />
            )}
        </div>
    );
};

export default Dashboard;