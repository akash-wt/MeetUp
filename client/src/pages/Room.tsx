import { useState } from "react";
import useJoinRoom from "../hooks/useJoinRoom";

const RoomPage = () => {
  const { device, joinRoom } = useJoinRoom();
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinRoom = () => {
    setIsJoining(true);
    joinRoom();
  };

  return (
    <div>
      <h1>Room Page</h1>
      <button onClick={handleJoinRoom}>Join or Create Room</button>
      {device ? (
        <p>Device loaded: {JSON.stringify(device)}</p>
      ) : isJoining ? (
        <p>Joining room...</p>
      ) : (
        <p>Not connected</p>
      )}
    </div>
  );
};

export default RoomPage;
