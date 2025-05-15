import React, { useState } from "react";
import { v4 as uuidv4 } from 'uuid';
import { Video, UserRound, Plus } from "lucide-react";

interface JoinRoomProps {
  onJoinRoom: (roomId: string, name: string) => void;
}

const JoinRoom: React.FC<JoinRoomProps> = ({ onJoinRoom }) => {
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  const handleCreateRoom = () => {
    if (name.trim() === "") return;

    // Generate a new room ID
    const newRoomId = uuidv4().substring(0, 8);
    onJoinRoom(newRoomId, name);
  };

  const handleJoinRoom = () => {
    if (name.trim() === "" || roomId.trim() === "") return;
    onJoinRoom(roomId, name);
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full shadow-2xl">
        <div className="mb-8 text-center">
          <Video className="w-12 h-12 mx-auto mb-2 text-indigo-500" />
          <h2 className="text-2xl font-bold mb-1">Welcome to MeetUp</h2>
          <p className="text-gray-400">
            Connect with others through high-quality video calls
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Your Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <UserRound className="w-5 h-5 text-gray-500" />
              </div>
              <input
                type="text"
                id="name"
                className="bg-gray-700 text-white rounded-lg pl-10 pr-4 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          {isCreatingRoom ? (
            <div className="pt-4">
              <button
                onClick={handleCreateRoom}
                disabled={!name}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create & Join Room
              </button>
              <p
                className="text-center mt-4 text-indigo-400 cursor-pointer hover:text-indigo-300"
                onClick={() => setIsCreatingRoom(false)}
              >
                Join an existing room instead
              </p>
            </div>
          ) : (
            <>
              <div>
                <label
                  htmlFor="roomCode"
                  className="block text-sm font-medium mb-1"
                >
                  Room Code
                </label>
                <input
                  type="text"
                  id="roomCode"
                  className="bg-gray-700 text-white rounded-lg px-4 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter room code"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                />
              </div>

              <div className="pt-4">
                <button
                  onClick={handleJoinRoom}
                  disabled={!name || !roomId}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Join Room
                </button>
                <p
                  className="text-center mt-4 text-indigo-400 cursor-pointer hover:text-indigo-300"
                  onClick={() => setIsCreatingRoom(true)}
                >
                  <span className="inline-flex items-center">
                    <Plus className="w-4 h-4 mr-1" />
                    Create a new room
                  </span>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default JoinRoom;
