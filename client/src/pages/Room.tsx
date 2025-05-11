import socket from "../lib/socket";
import { getMediasoupDevice } from "../lib/mediasoup";
import useCreateRoomId from "../hooks/useCreateRoomId";
import { types as mediasoupTypes } from "mediasoup-client";
// import { Device } from "mediasoup-client";

const RoomPage = () => {
  const roomId = useCreateRoomId();


  async function createRoom() {

    socket.emit("joinRoom", roomId, async (rtpCapabilities: mediasoupTypes.RtpCapabilities) => {
      const device = await getMediasoupDevice(rtpCapabilities);
      console.log(device);

    });
  }

  return (
    <div>
      <button onClick={createRoom}> createRoom & get rtpCapabilities</button>
    </div>
  );
};

export default RoomPage;
