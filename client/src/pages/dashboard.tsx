import { useState } from 'react';
import { Plus, User, Download, History } from 'lucide-react';
import { nanoid } from "nanoid"
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const [roomId, setRoomId] = useState('');
    const [isCreatingRoom, setIsCreatingRoom] = useState(true);
    const [showProfile, setShowProfile] = useState(false);
    const nevigate = useNavigate();


    const [recordings] = useState([
        { id: 1, name: 'Team Meeting - Jan 15', date: '2025-01-15', duration: '45:30', size: '120 MB' },
        { id: 2, name: 'Client Call - Jan 12', date: '2025-01-12', duration: '28:15', size: '85 MB' },
        { id: 3, name: 'Project Review - Jan 10', date: '2025-01-10', duration: '1:12:45', size: '180 MB' }
    ]);



    const handleCreateRoom = () => {
        const newRoomId = nanoid(6);
        nevigate(`room/${newRoomId}`);
    };

    const handleJoinRoom = () => {
        if (roomId.trim()) {
            nevigate(`room/${roomId}`);
        }
    };

    const handleDownload = (recording) => {
        alert(`Downloading: ${recording.name}`);
    };

    const ProfileModal = () => (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold">Profile Information</h3>
                    <button
                        onClick={() => setShowProfile(false)}
                        className="text-gray-400 hover:text-white"
                    >
                        ×
                    </button>
                </div>
                <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center">
                            <User className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h4 className="text-lg font-medium">John Doe</h4>
                            <p className="text-gray-400">john.doe@example.com</p>
                        </div>
                    </div>
                    <div className="border-t border-gray-700 pt-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-gray-400">Total Meetings</p>
                                <p className="text-xl font-bold">127</p>
                            </div>
                            <div>
                                <p className="text-gray-400">Total Hours</p>
                                <p className="text-xl font-bold">84h</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <div className="container mx-auto px-6 py-8">
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Main Actions */}
                    <div className="lg:col-span-2">
                        <div className="bg-gray-800 rounded-xl p-8 shadow-xl">
                            <div className="mb-8 text-center">
                                <h2 className="text-3xl font-bold mb-2">Start Your Meeting</h2>
                                <p className="text-gray-400">Create a new room or join an existing one</p>
                            </div>

                            <div className="flex justify-center mb-8">
                                <div className="bg-gray-700 rounded-lg p-1 flex">
                                    <button
                                        onClick={() => setIsCreatingRoom(true)}
                                        className={`px-6 py-2 rounded-md transition-colors ${isCreatingRoom
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-gray-400 hover:text-white'
                                            }`}
                                    >
                                        Create Room
                                    </button>
                                    <button
                                        onClick={() => setIsCreatingRoom(false)}
                                        className={`px-6 py-2 rounded-md transition-colors ${!isCreatingRoom
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-gray-400 hover:text-white'
                                            }`}
                                    >
                                        Join Room
                                    </button>
                                </div>
                            </div>

                            {isCreatingRoom ? (
                                <div className="text-center space-y-6">
                                    <div className="bg-gray-700 rounded-lg p-6">
                                        <Plus className="w-12 h-12 mx-auto mb-4 text-indigo-400" />
                                        <h3 className="text-xl font-medium mb-2">Create New Room</h3>
                                        <p className="text-gray-400 mb-4">Start an instant meeting with a unique room ID</p>
                                        <button
                                            onClick={handleCreateRoom}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-8 rounded-lg transition-colors"
                                        >
                                            Create Room
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div>
                                        <label htmlFor="roomCode" className="block text-sm font-medium mb-2">
                                            Room Code
                                        </label>
                                        <input
                                            type="text"
                                            id="roomCode"
                                            className="bg-gray-700 text-white rounded-lg px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center text-lg tracking-wider"
                                            placeholder="Enter room code"
                                            value={roomId}
                                            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                                        />
                                    </div>
                                    <button
                                        onClick={handleJoinRoom}
                                        disabled={!roomId.trim()}
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Join Room
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recordings Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
                            <div className="flex items-center space-x-2 mb-4">
                                <History className="w-5 h-5 text-indigo-400" />
                                <h3 className="text-lg font-semibold">Recent Recordings</h3>
                            </div>
                            <div className="space-y-3">
                                {recordings.map((recording) => (
                                    <div key={recording.id} className="bg-gray-700 rounded-lg p-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-medium truncate">{recording.name}</h4>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {recording.date} • {recording.duration}
                                                </p>
                                                <p className="text-xs text-gray-500">{recording.size}</p>
                                            </div>
                                            <button
                                                onClick={() => handleDownload(recording)}
                                                className="ml-2 p-1 text-gray-400 hover:text-indigo-400 transition-colors"
                                                title="Download recording"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button className="w-full mt-4 text-indigo-400 hover:text-indigo-300 text-sm font-medium">
                                View All Recordings
                            </button>
                        </div>


                    </div>
                </div>
            </div>

            {showProfile && <ProfileModal />}
        </div>
    );
};

export default Dashboard;